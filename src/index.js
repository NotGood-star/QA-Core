import "dotenv/config";

import {
  ActionRowBuilder,
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  ModalBuilder,
  PermissionsBitField,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle
} from "discord.js";

import { CONFIG, COLOR } from "./config.js";

import {
  createTest,
  getTest,
  getJoinedCount,
  joinTest,
  listTesters,
  setTestMessage
} from "./db.js";

import {
  hostPanelEmbed,
  hostPanelRow,
  testEmbed,
  testButtons
} from "./embeds.js";

/* =========================================================
   QA CENTRAL CLIENT
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

const DRAFT_TTL = 10 * 60 * 1000;

/* =========================================================
   HELPERS
========================================================= */

function makeDraftId() {
  return `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function clean(value, max = 1000) {
  return String(value ?? "")
    .trim()
    .slice(0, max);
}

function hasRole(interaction, roleId) {
  return Boolean(
    interaction.member?.roles?.cache?.has(roleId)
  );
}

function isStaff(interaction) {
  return Boolean(
    interaction.memberPermissions?.has(
      PermissionsBitField.Flags.ManageGuild
    )
  );
}

function errorMessage(message) {
  return `${CONFIG.emojis.qa_cross} **${message}**`;
}

/* =========================================================
   ROBLOX URL CHECK
========================================================= */

function isRobloxGameUrl(value) {
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
   SCHEDULE PARSER
========================================================= */

function parseSchedule(value) {
  const text = clean(value, 150);

  const labelled = text.match(
    /start\s*:\s*(.+?)\s*(?:\||;|\n)\s*end\s*:\s*(.+)/i
  );

  if (labelled) {
    return {
      start: clean(labelled[1], 75),
      end: clean(labelled[2], 75)
    };
  }

  const pipe = text.split("|");

  if (pipe.length >= 2) {
    return {
      start: clean(pipe[0], 75),
      end: clean(
        pipe.slice(1).join("|"),
        75
      )
    };
  }

  const dash = text.match(
    /^(.+?)\s+[-–—]\s+(.+)$/
  );

  if (dash) {
    return {
      start: clean(dash[1], 75),
      end: clean(dash[2], 75)
    };
  }

  return {
    start: text || "Not specified",
    end: "Not specified"
  };
}

/* =========================================================
   MODAL INPUT HELPER
========================================================= */

function inputRow(
  id,
  label,
  placeholder,
  style = TextInputStyle.Short
) {
  return new ActionRowBuilder().addComponents(
    new TextInputBuilder()
      .setCustomId(id)
      .setLabel(label)
      .setPlaceholder(placeholder)
      .setStyle(style)
      .setRequired(true)
  );
}

/* =========================================================
   HOST MODAL
========================================================= */

function hostModal() {
  return new ModalBuilder()
    .setCustomId("qa_host_modal")
    .setTitle("QA Central • Host a Test")
    .addComponents(
      inputRow(
        "game_name",
        "Game Name",
        "My Roblox Game"
      ),

      inputRow(
        "game_link",
        "Roblox Game Link",
        "https://www.roblox.com/games/..."
      ),

      inputRow(
        "max_testers",
        "Max Testers",
        "10"
      ),

      inputRow(
        "schedule",
        "Start | End Time",
        "Today 7:00 PM | 8:00 PM"
      ),

      inputRow(
        "description",
        "Description / Requirements",
        "Find bugs, play the game and give feedback.",
        TextInputStyle.Paragraph
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
   REWARD MODAL
========================================================= */

function rewardModal(draftId) {
  return new ModalBuilder()
    .setCustomId(
      `qa_reward:${draftId}`
    )
    .setTitle(
      "QA Central • Test Reward"
    )
    .addComponents(
      inputRow(
        "reward",
        "Reward Per Tester",
        "20 Robux"
      )
    );
}

/* =========================================================
   TEST DATA
========================================================= */

function createTestData(
  draft,
  type,
  reward,
  hostId
) {
  return {
    guild_id: draft.guildId,
    host_id: hostId,

    game_name: draft.gameName,
    game_link: draft.gameLink,

    test_type: type,

    max_testers: draft.maxTesters,

    reward,

    description: draft.description,

    start_time: draft.startTime,
    end_time: draft.endTime,

    created_at:
      new Date().toISOString()
  };
}

/* =========================================================
   POST TEST
========================================================= */

async function postTest(test) {
  if (!test) {
    throw new Error(
      "Test was not found after creation."
    );
  }

  const channelId =
    test.test_type === "paid"
      ? CONFIG.channels.paid
      : CONFIG.channels.volunteer;

  const channel =
    await client.channels.fetch(
      channelId
    );

  if (!channel?.isTextBased()) {
    throw new Error(
      `Test channel ${channelId} is unavailable.`
    );
  }

  const joined =
    getJoinedCount(test.id);

  const message =
    await channel.send({
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

async function refreshTestMessage(
  testId
) {
  const test =
    getTest(testId);

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

    if (!channel?.isTextBased()) {
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
   TESTERS EMBED
========================================================= */

function testersEmbed(
  test,
  testers
) {
  const names =
    testers.length
      ? testers
          .slice(0, 50)
          .map(
            (row, index) =>
              `**${index + 1}.** <@${row.user_id}>`
          )
          .join("\n")
      : "No testers have joined yet.";

  return new EmbedBuilder()
    .setColor(COLOR)

    .setTitle(
      `${CONFIG.emojis.qa_tester} Testers • #${test.id}`
    )

    .setDescription(names)

    .setFooter({
      text:
        `${testers.length}/${test.max_testers} slots filled`
    });
}

/* =========================================================
   BOT READY
========================================================= */

client.once(
  Events.ClientReady,
  readyClient => {
    console.log(
      `✅ QA Central online as ${readyClient.user.tag}`
    );

    console.log(
      `📡 Serving ${readyClient.guilds.cache.size} server(s)`
    );
  }
);

/* =========================================================
   INTERACTIONS
========================================================= */

client.on(
  Events.InteractionCreate,
  async interaction => {

    try {

      /* =====================================================
         SLASH COMMANDS
      ===================================================== */

      if (
        interaction.isChatInputCommand()
      ) {

        if (
          interaction.commandName !== "qa"
        ) {
          return;
        }

        const subcommand =
          interaction.options.getSubcommand();

        /* ===================================================
           /qa setup
        =================================================== */

        if (
          subcommand === "setup"
        ) {

          if (!isStaff(interaction)) {
            return interaction.reply({
              content:
                errorMessage(
                  "You need **Manage Server** to use this."
                ),
              ephemeral: true
            });
          }

          if (
            interaction.channelId !==
            CONFIG.channels.host
          ) {
            return interaction.reply({
              content:
                `${CONFIG.emojis.qa_warning} ` +
                `Use this command in <#${CONFIG.channels.host}>.`,

              ephemeral: true
            });
          }

          await interaction.channel.send({
            embeds: [
              hostPanelEmbed()
            ],

            components: [
              hostPanelRow()
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

        if (
          subcommand === "test"
        ) {

          const id =
            interaction.options.getInteger(
              "id",
              true
            );

          const test =
            getTest(id);

          if (!test) {
            return interaction.reply({
              content:
                errorMessage(
                  `Test #${id} was not found.`
                ),
              ephemeral: true
            });
          }

          const joined =
            getJoinedCount(id);

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

           NOTE:
           Current db.js has no closeTest().
           Therefore this command is intentionally safe
           instead of importing a nonexistent function.
        =================================================== */

        if (
          subcommand === "close"
        ) {

          const id =
            interaction.options.getInteger(
              "id",
              true
            );

          const test =
            getTest(id);

          if (!test) {
            return interaction.reply({
              content:
                errorMessage(
                  `Test #${id} was not found.`
                ),
              ephemeral: true
            });
          }

          return interaction.reply({
            content:
              `${CONFIG.emojis.qa_warning} ` +
              `**Close is not enabled yet.**\n\n` +
              `Test #${id} exists, but your current ` +
              `db.js` does not contain a \`closeTest()\` function.`,

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

        if (
          !hasRole(
            interaction,
            CONFIG.roles.developer
          )
        ) {
          return interaction.reply({
            content:
              `${CONFIG.emojis.qa_cross} ` +
              `You need the **Developer** role to host a test.`,

            ephemeral: true
          });
        }

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

        if (
          !hasRole(
            interaction,
            CONFIG.roles.developer
          )
        ) {
          return interaction.reply({
            content:
              errorMessage(
                "You need the **Developer** role to host a test."
              ),

            ephemeral: true
          });
        }

        const gameName =
          clean(
            interaction.fields.getTextInputValue(
              "game_name"
            ),
            100
          );

        const gameLink =
          clean(
            interaction.fields.getTextInputValue(
              "game_link"
            ),
            200
          );

        const maxTesters =
          Number(
            clean(
              interaction.fields.getTextInputValue(
                "max_testers"
              ),
              3
            )
          );

        const schedule =
          clean(
            interaction.fields.getTextInputValue(
              "schedule"
            ),
            150
          );

        const description =
          clean(
            interaction.fields.getTextInputValue(
              "description"
            ),
            1000
          );

        if (
          !isRobloxGameUrl(
            gameLink
          )
        ) {
          return interaction.reply({
            content:
              errorMessage(
                "Please provide a valid HTTPS Roblox game URL."
              ),

            ephemeral: true
          });
        }

        if (
          !Number.isInteger(
            maxTesters
          ) ||
          maxTesters < 1 ||
          maxTesters > 100
        ) {
          return interaction.reply({
            content:
              errorMessage(
                "Max testers must be a whole number from 1 to 100."
              ),

            ephemeral: true
          });
        }

        const scheduleData =
          parseSchedule(
            schedule
          );

        const draftId =
          makeDraftId();

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

            startTime:
              scheduleData.start,

            endTime:
              scheduleData.end
          }
        );

        const timer =
          setTimeout(
            () =>
              drafts.delete(
                draftId
              ),
            DRAFT_TTL
          );

        timer.unref?.();

        return interaction.reply({
          content:
            `${CONFIG.emojis.qa_check} ` +
            `**Details saved!**\n\n` +
            `${CONFIG.emojis.qa_test} ` +
            `Choose the test type:`,

          components: [
            typeMenu(
              draftId
            )
          ],

          ephemeral: true
        });
      }

      /* =====================================================
         TEST TYPE MENU
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
          drafts.get(
            draftId
          );

        const type =
          interaction.values[0];

        if (!draft) {
          return interaction.update({
            content:
              errorMessage(
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
            content:
              errorMessage(
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
            content:
              errorMessage(
                "Invalid test type."
              ),

            ephemeral: true
          });
        }

        /* Paid */

        if (
          type === "paid"
        ) {
          return interaction.showModal(
            rewardModal(
              draftId
            )
          );
        }

        /* Volunteer */

        drafts.delete(
          draftId
        );

        const testId =
          createTest(
            createTestData(
              draft,
              "volunteer",
              null,
              interaction.user.id
            )
          );

        const test =
          getTest(testId);

        await postTest(
          test
        );

        return interaction.update({
          content:
            `${CONFIG.emojis.qa_check} ` +
            `**Volunteer test #${testId} created!**\n` +
            `Posted in <#${CONFIG.channels.volunteer}>.`,

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
          drafts.get(
            draftId
          );

        if (!draft) {
          return interaction.reply({
            content:
              errorMessage(
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
            content:
              errorMessage(
                "This host form belongs to another user."
  
