import "dotenv/config";

import {
  ActionRowBuilder,
  Client,
  GatewayIntentBits,
  ModalBuilder,
  PermissionsBitField,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle
} from "discord.js";

import { CONFIG } from "./config.js";

import {
  closeTest,
  createTest,
  getJoinedCount,
  getTest,
  joinTest,
  listTesters,
  setTestMessage
} from "./db.js";

import {
  hostPanelEmbed,
  hostPanelButtons,
  testEmbed,
  testButtons
} from "./embeds.js";

/* =========================================================
   CLIENT
========================================================= */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

/* =========================================================
   TEMPORARY HOST DRAFTS
========================================================= */

const drafts = new Map();

/*
  Discord custom IDs have length limits.
  Therefore we store the actual host form data
  inside this Map and only put a short ID in
  the buttons/select menus.
*/

function makeId() {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 8)
  );
}

/* =========================================================
   HELPERS
========================================================= */

function cleanText(value, max) {
  return String(value ?? "")
    .trim()
    .replace(/\r/g, "")
    .slice(0, max);
}

function errorText(message) {
  return `${CONFIG.emojis.qa_cross} **${message}**`;
}

/* =========================================================
   SCHEDULE PARSER
========================================================= */

function parseSchedule(value) {
  const text = cleanText(value, 150);

  /*
    Supports:

    Start: 8 PM IST | End: 9 PM IST

    Start: 8 PM IST ; End: 9 PM IST

    Start: 8 PM IST
    End: 9 PM IST
  */

  const match = text.match(
    /start\s*:\s*(.+?)\s*(?:\||\n|;)\s*end\s*:\s*(.+)/i
  );

  if (match) {
    return {
      start: match[1].trim(),
      end: match[2].trim()
    };
  }

  /*
    Also supports:

    8 PM - 9 PM
  */

  const dash = text.match(
    /^(.+?)\s+[-–—]\s+(.+)$/
  );

  if (dash) {
    return {
      start: dash[1].trim(),
      end: dash[2].trim()
    };
  }

  /*
    If no separator is found,
    use the same value for both.
  */

  return {
    start: text,
    end: text
  };
}

/* =========================================================
   ROBLOX URL VALIDATION
========================================================= */

function isRobloxUrl(value) {
  try {
    const url = new URL(value);

    return (
      url.protocol === "https:" &&
      (
        url.hostname === "roblox.com" ||
        url.hostname.endsWith(".roblox.com")
      )
    );
  } catch {
    return false;
  }
}

/* =========================================================
   HOST MODAL
========================================================= */

function hostModal() {
  return new ModalBuilder()
    .setCustomId("qa_host_modal")
    .setTitle("Host a Roblox Test")
    .addComponents(

      /* Game Name */

      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("game_name")
          .setLabel("Game Name")
          .setPlaceholder("My Roblox Game")
          .setStyle(TextInputStyle.Short)
          .setMaxLength(100)
          .setRequired(true)
      ),

      /* Game Link */

      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("game_link")
          .setLabel("Roblox Game Link")
          .setPlaceholder(
            "https://www.roblox.com/games/..."
          )
          .setStyle(TextInputStyle.Short)
          .setMaxLength(200)
          .setRequired(true)
      ),

      /* Maximum Testers */

      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("max_testers")
          .setLabel("Maximum Testers")
          .setPlaceholder("10")
          .setStyle(TextInputStyle.Short)
          .setMaxLength(3)
          .setRequired(true)
      ),

      /* Description */

      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("description")
          .setLabel("Test Description")
          .setPlaceholder(
            "What should testers check?"
          )
          .setStyle(TextInputStyle.Paragraph)
          .setMaxLength(1000)
          .setRequired(true)
      ),

      /* Schedule */

      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("schedule")
          .setLabel("Start / End Time")
          .setPlaceholder(
            "Start: 8 PM IST | End: 9 PM IST"
          )
          .setStyle(TextInputStyle.Short)
          .setMaxLength(150)
          .setRequired(true)
      )
    );
}

/* =========================================================
   PAID REWARD MODAL
========================================================= */

function rewardModal(draftId) {
  return new ModalBuilder()
    .setCustomId(`qa_reward:${draftId}`)
    .setTitle("Paid Test Reward")
    .addComponents(

      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("reward")
          .setLabel("Reward")
          .setPlaceholder("Example: 50 Robux")
          .setStyle(TextInputStyle.Short)
          .setMaxLength(100)
          .setRequired(true)
      )

    );
}

/* =========================================================
   TEST TYPE MENU
========================================================= */

function typeMenu(draftId) {
  return new ActionRowBuilder().addComponents(

    new StringSelectMenuBuilder()
      .setCustomId(`qa_type:${draftId}`)
      .setPlaceholder("Choose the test type")
      .addOptions(

        new StringSelectMenuOptionBuilder()
          .setLabel("Paid Test")
          .setDescription(
            "Offer a reward to testers"
          )
          .setValue("paid")
          .setEmoji("💰"),

        new StringSelectMenuOptionBuilder()
          .setLabel("Volunteer Test")
          .setDescription(
            "Free community testing"
          )
          .setValue("volunteer")
          .setEmoji("🆓")

      )
  );
}

/* =========================================================
   SEND TEST MESSAGE
========================================================= */

async function sendTestMessage(test) {
  if (!test) {
    throw new Error(
      "Could not load the newly created test."
    );
  }

  const channelId =
    test.test_type === "paid"
      ? CONFIG.channels.paid
      : CONFIG.channels.volunteer;

  const channel =
    await client.channels.fetch(channelId);

  if (
    !channel ||
    !channel.isTextBased()
  ) {
    throw new Error(
      `Configured test channel ${channelId} is not available.`
    );
  }

  const joined =
    getJoinedCount(test.id);

  const message =
    await channel.send({
      embeds: [
        testEmbed(test, joined)
      ],
      components: [
        testButtons(test, joined)
      ]
    });

  setTestMessage(
    test.id,
    channel.id,
    message.id
  );

  return message;
}

/* =========================================================
   REFRESH TEST MESSAGE
========================================================= */

async function refreshTestMessage(testId) {
  const test = getTest(testId);

  if (
    !test ||
    !test.channel_id ||
    !test.message_id
  ) {
    return;
  }

  try {
    const channel =
      await client.channels.fetch(
        test.channel_id
      );

    if (
      !channel ||
      !channel.isTextBased()
    ) {
      return;
    }

    const message =
      await channel.messages.fetch(
        test.message_id
      );

    const joined =
      getJoinedCount(test.id);

    await message.edit({
      embeds: [
        testEmbed(test, joined)
      ],
      components: [
        testButtons(test, joined)
      ]
    });

  } catch (error) {
    console.error(
      `Could not refresh test #${testId}:`,
      error.message
    );
  }
}

/* =========================================================
   BOT READY
========================================================= */

client.once("ready", () => {
  console.log(
    `✅ QA Central online as ${client.user.tag}`
  );

  console.log(
    `📡 Serving ${client.guilds.cache.size} server(s)`
  );
});

/* =========================================================
   INTERACTIONS
========================================================= */

client.on(
  "interactionCreate",
  async (interaction) => {

    try {

      /* =====================================================
         SLASH COMMANDS
      ===================================================== */

      if (
        interaction.isChatInputCommand() &&
        interaction.commandName === "qa"
      ) {

        const subcommand =
          interaction.options.getSubcommand();

        /* ===================================================
           /qa setup
        =================================================== */

        if (subcommand === "setup") {

          if (
            !interaction.memberPermissions?.has(
              PermissionsBitField.Flags.ManageGuild
            )
          ) {
            return interaction.reply({
              content: errorText(
                "You need Manage Server permission to use this."
              ),
              ephemeral: true
            });
          }

          const channel =
            interaction.guild.channels.cache.get(
              CONFIG.channels.host
            );

          if (
            !channel ||
            !channel.isTextBased()
          ) {
            return interaction.reply({
              content: errorText(
                "The Host Test channel could not be found. Check config.js."
              ),
              ephemeral: true
            });
          }

          await channel.send({
            embeds: [
              hostPanelEmbed()
            ],
            components: [
              hostPanelButtons()
            ]
          });

          return interaction.reply({
            content:
              `${CONFIG.emojis.qa_check} ` +
              `**QA Host Test panel posted!**`,
            ephemeral: true
          });
        }

        /* ===================================================
           /qa test <id>
        =================================================== */

        if (subcommand === "test") {

          const id =
            interaction.options.getInteger(
              "id",
              true
            );

          const test =
            getTest(id);

          if (!test) {
            return interaction.reply({
              content: errorText(
                `Test #${id} was not found.`
              ),
              ephemeral: true
            });
          }

          const joined =
            getJoinedCount(test.id);

          return interaction.reply({
            embeds: [
              testEmbed(
                test,
                joined
              )
            ],
            components: [
              testButtons(
                test,
                joined
              )
            ],
            ephemeral: true
          });
        }

        /* ===================================================
           /qa close <id>
        =================================================== */

        if (subcommand === "close") {

          const id =
            interaction.options.getInteger(
              "id",
              true
            );

          const test =
            getTest(id);

          if (!test) {
            return interaction.reply({
              content: errorText(
                `Test #${id} was not found.`
              ),
              ephemeral: true
            });
          }

          if (
            test.status === "closed"
          ) {
            return interaction.reply({
              content:
                `${CONFIG.emojis.qa_warning} ` +
                `Test #${id} is already closed.`,
              ephemeral: true
            });
          }

          const isHost =
            test.host_id ===
            interaction.user.id;

          const isStaff =
            interaction.memberPermissions?.has(
              PermissionsBitField.Flags.ManageGuild
            );

          if (
            !isHost &&
            !isStaff
          ) {
            return interaction.reply({
              content: errorText(
                "Only the test host or staff can close this test."
              ),
              ephemeral: true
            });
          }

          closeTest(id);

          await refreshTestMessage(id);

          return interaction.reply({
            content:
              `${CONFIG.emojis.qa_check} ` +
              `**Test #${id} closed successfully.**`,
            ephemeral: true
          });
        }
      }

      /* =====================================================
         HOST BUTTON
      ===================================================== */

      if (
        interaction.isButton() &&
        interaction.customId ===
          "qa_host_start"
      ) {

        return interaction.showModal(
          hostModal()
        );
      }

      /* =====================================================
         HOST FORM
      ===================================================== */

      if (
        interaction.isModalSubmit() &&
        interaction.customId ===
          "qa_host_modal"
      ) {

        const gameName =
          cleanText(
            interaction.fields.getTextInputValue(
              "game_name"
            ),
            100
          );

        const gameLink =
          cleanText(
            interaction.fields.getTextInputValue(
              "game_link"
            ),
            200
          );

        const maxTestersRaw =
          cleanText(
            interaction.fields.getTextInputValue(
              "max_testers"
            ),
            3
          );

        const description =
          cleanText(
            interaction.fields.getTextInputValue(
              "description"
            ),
            1000
          );

        const schedule =
          cleanText(
            interaction.fields.getTextInputValue(
              "schedule"
            ),
            150
          );

        const {
          start: startTime,
          end: endTime
        } = parseSchedule(schedule);

        const maxTesters =
          Number(maxTestersRaw);

        /* Validate Roblox URL */

        if (
          !isRobloxUrl(gameLink)
        ) {
          return interaction.reply({
            content: errorText(
              "Please enter a valid HTTPS Roblox game URL."
            ),
            ephemeral: true
          });
        }

        /* Validate tester count */

        if (
          !Number.isInteger(maxTesters) ||
          maxTesters < 1 ||
          maxTesters > 100
        ) {
          return interaction.reply({
            content: errorText(
              "Maximum testers must be a whole number from 1 to 100."
            ),
            ephemeral: true
          });
        }

        /* Create temporary draft */

        const draftId =
          makeId();

        drafts.set(
          draftId,
          {
            guildId:
              interaction.guildId,

            hostId:
              interaction.user.id,

            gameName,

            gameLink,

            maxTesters,

            description,

            schedule,

            startTime,

            endTime,

            createdAt:
              Date.now()
          }
        );

        /*
          Delete abandoned drafts after
          10 minutes.
        */

        const timeout =
          setTimeout(
            () => {
              drafts.delete(
                draftId
              );
            },
            10 * 60 * 1000
          );

        timeout.unref?.();

        return interaction.reply({
          content:
            `${CONFIG.emojis.qa_check} ` +
            `**Details saved!**\n\n` +
            `${CONFIG.emojis.qa_test} ` +
            `Choose how this test will be hosted:`,

          components: [
            typeMenu(draftId)
          ],

          ephemeral: true
        });
      }

      /* =====================================================
         TEST TYPE SELECT
      ===================================================== */

      if (
        interaction.isStringSelectMenu() &&
        interaction.customId.startsWith(
          "qa_type:"
        )
      ) {

        const draftId =
          interaction.customId.slice(
            "qa_type:".length
          );

        const draft =
          drafts.get(draftId);

        const type =
          interaction.values[0];

        if (!draft) {
          return interaction.update({
            content: errorText(
              "This host form expired. Please start again."
            ),
            components: []
          });
        }

        if (
          draft.hostId !==
          interaction.user.id
        ) {
          return interaction.reply({
            content: errorText(
              "This host form belongs to another user."
            ),
            ephemeral: true
          });
        }

        if (
          type !== "paid" &&
          type !== "volunteer"
        ) {
          return interaction.reply({
            content: errorText(
              "Invalid test type."
            ),
            ephemeral: true
          });
        }

        draft.testType =
          type;

        /* Paid test */

        if (
          type === "paid"
        ) {
          return interaction.showModal(
            rewardModal(draftId)
          );
        }

        /* Volunteer test */

        drafts.delete(
          draftId
        );

        const testId =
          createTest({
            guild_id:
              draft.guildId,

            host_id:
              draft.hostId,

            game_name:
              draft.gameName,

            game_link:
              draft.gameLink,

            test_type:
              "volunteer",

            max_testers:
              draft.maxTesters,

            reward:
              null,

            description:
              draft.description,

            start_time:
              draft.startTime,

            end_time:
              draft.endTime,

            created_at:
              new Date().toISOString()
          });

        const test =
          getTest(testId);

        await sendTestMessage(
          test
        );

        return interaction.update({
          content:
            `${CONFIG.emojis.qa_check} ` +
            `**Volunteer test #${testId} created successfully!**`,

          components: []
        });
      }

      /* =====================================================
         PAID REWARD FORM
      ===================================================== */

      if (
        interaction.isModalSubmit() &&
        interaction.customId.startsWith(
          "qa_reward:"
        )
      ) {

        const draftId =
          interaction.customId.slice(
            "qa_reward:".length
          );

        const draft =
          drafts.get(draftId);

        if (!draft) {
          return interaction.reply({
            content: errorText(
              "This host form expired. Please start again."
            ),
            ephemeral: true
          });
        }

        if (
          draft.hostId !==
          interaction.user.id
        ) {
          return interaction.reply({
            content: errorText(
              "This host form belongs to another user."
            ),
            ephemeral: true
          });
        }

        const reward =
          cleanText(
            interaction.fields.getTextInputValue(
              "reward"
            ),
    
