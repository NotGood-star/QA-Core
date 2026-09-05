import "dotenv/config";

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  EmbedBuilder,
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
   TEMPORARY DRAFT STORAGE
========================================================= */

const drafts = new Map();

function makeId() {
  return `${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

/* =========================================================
   HELPERS
========================================================= */

function cleanText(value, max = 1000) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, max);
}

function isRobloxUrl(url) {
  try {
    const parsed = new URL(url);

    return (
      parsed.protocol === "https:" &&
      (
        parsed.hostname === "roblox.com" ||
        parsed.hostname.endsWith(".roblox.com")
      )
    );
  } catch {
    return false;
  }
}

function parseSchedule(value) {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return {
      start: "Not specified",
      end: "Not specified"
    };
  }

  const patterns = [
    /\bStart\s*:\s*(.*?)\s*\|\s*End\s*:\s*(.*)$/i,
    /\bStart\s*:\s*(.*?)\s*\n\s*End\s*:\s*(.*)$/i,
    /\bStart\s*:\s*(.*?)\s*;\s*End\s*:\s*(.*)$/i,
    /^(.*?)\s+-\s+(.*?)$/
  ];

  for (const pattern of patterns) {
    const match = raw.match(pattern);

    if (match) {
      return {
        start: cleanText(match[1], 200),
        end: cleanText(match[2], 200)
      };
    }
  }

  return {
    start: cleanText(raw, 200),
    end: cleanText(raw, 200)
  };
}

function hasRole(member, roleId) {
  return Boolean(
    member?.roles?.cache?.has(roleId)
  );
}

function hasDeveloperRole(member) {
  return hasRole(
    member,
    CONFIG.roles.developer
  );
}

function hasTesterRole(member) {
  return hasRole(
    member,
    CONFIG.roles.tester
  );
}

function canManageQA(member) {
  return Boolean(
    member?.permissions?.has(
      PermissionsBitField.Flags.ManageGuild
    ) ||
    member?.permissions?.has(
      PermissionsBitField.Flags.Administrator
    ) ||
    hasDeveloperRole(member)
  );
}

/* =========================================================
   HOST MODAL
========================================================= */

function buildHostModal() {
  return new ModalBuilder()
    .setCustomId("qa_host_modal")
    .setTitle("QA Corner • Host a Test")
    .addComponents(

      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("game_name")
          .setLabel("Game Name")
          .setPlaceholder("Example: Blox Fruits")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(100)
      ),

      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("game_link")
          .setLabel("Roblox Game Link")
          .setPlaceholder(
            "https://www.roblox.com/games/..."
          )
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(300)
      ),

      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("max_testers")
          .setLabel("Maximum Testers")
          .setPlaceholder("Example: 10")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(3)
      ),

      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("description")
          .setLabel("Test Description")
          .setPlaceholder(
            "Tell testers what they need to test..."
          )
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(1000)
      ),

      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("schedule")
          .setLabel("Start / End Time")
          .setPlaceholder(
            "Example: Start: 8 PM | End: 9 PM"
          )
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(200)
      )
    );
}

/* =========================================================
   TEST TYPE SELECT
========================================================= */

function buildTypeSelect(draftId) {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`qa_type:${draftId}`)
      .setPlaceholder("Choose the type of test")
      .addOptions(

        new StringSelectMenuOptionBuilder()
          .setLabel("Paid Test")
          .setDescription(
            "Testers receive a Robux reward."
          )
          .setValue("paid")
          .setEmoji(
            CONFIG.emojis.qa_paid
          ),

        new StringSelectMenuOptionBuilder()
          .setLabel("Volunteer Test")
          .setDescription(
            "Free testing with no Robux reward."
          )
          .setValue("volunteer")
          .setEmoji(
            CONFIG.emojis.qa_free
          )
      )
  );
}

/* =========================================================
   PAID REWARD MODAL
========================================================= */

function buildRewardModal(draftId) {
  return new ModalBuilder()
    .setCustomId(`qa_reward:${draftId}`)
    .setTitle("QA Corner • Test Reward")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("reward")
          .setLabel("Robux Reward")
          .setPlaceholder(
            "Example: 50 Robux per tester"
          )
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(100)
      )
    );
}

/* =========================================================
   TESTER LIST EMBED
========================================================= */

function buildTesterListEmbed(
  test,
  testers
) {
  const e = CONFIG.emojis;

  const list =
    testers.length > 0
      ? testers
          .map(
            (tester, index) =>
              `${index + 1}. <@${tester.user_id}>`
          )
          .join("\n")
      : "No testers have joined yet.";

  return new EmbedBuilder()
    .setColor(0x6c4dff)
    .setTitle(
      `${e.qa_tester} Testers — #${test.id}`
    )
    .setDescription(
      `${e.qa_game} **${test.game_name}**\n\n${list}`
    )
    .setFooter({
      text: "QA Central • Tester List"
    });
}

/* =========================================================
   READY
========================================================= */

client.once("ready", async () => {
  console.log(
    "========================================"
  );

  console.log(
    `Logged in as ${client.user.tag}`
  );

  console.log(
    `Bot ID: ${client.user.id}`
  );

  console.log(
    "QA Central is online."
  );

  console.log(
    "========================================"
  );

  client.user.setPresence({
    activities: [
      {
        name: "QA Central • Testing Roblox Games",
        type: 3
      }
    ],
    status: "online"
  });
});

/* =========================================================
   INTERACTION HANDLER
========================================================= */

client.on(
  "interactionCreate",
  async (interaction) => {
    try {

      /* ===================================================
         SLASH COMMANDS
      =================================================== */

      if (interaction.isChatInputCommand()) {

        if (
          interaction.commandName !== "qa"
        ) {
          return;
        }

        const subcommand =
          interaction.options.getSubcommand();

        /* =================================================
           /qa setup
        ================================================= */

        if (subcommand === "setup") {

          if (
            !canManageQA(
              interaction.member
            )
          ) {
            return interaction.reply({
              content:
                `${CONFIG.emojis.qa_cross} You don't have permission to use this command.`,
              ephemeral: true
            });
          }

          const channel =
            interaction.guild.channels.cache.get(
              CONFIG.channels.host
            );

          if (!channel) {
            return interaction.reply({
              content:
                `${CONFIG.emojis.qa_cross} Host Test channel was not found.\nChannel ID: \`${CONFIG.channels.host}\``,
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
              `${CONFIG.emojis.qa_check} QA Host panel has been posted in ${channel}.`,
            ephemeral: true
          });
        }

        /* =================================================
           /qa test <id>
        ================================================= */

        if (subcommand === "test") {

          const id =
            interaction.options.getInteger(
              "id"
            );

          if (!id) {
            return interaction.reply({
              content:
                `${CONFIG.emojis.qa_cross} Please provide a test ID.`,
              ephemeral: true
            });
          }

          const test =
            getTest(id);

          if (!test) {
            return interaction.reply({
              content:
                `${CONFIG.emojis.qa_cross} Test #${id} was not found.`,
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
            ]
          });
        }

        /* =================================================
           /qa close <id>
        ================================================= */

        if (subcommand === "close") {

          const id =
            interaction.options.getInteger(
              "id"
            );

          if (!id) {
            return interaction.reply({
              content:
                `${CONFIG.emojis.qa_cross} Please provide a test ID.`,
              ephemeral: true
            });
          }

          const test =
            getTest(id);

          if (!test) {
            return interaction.reply({
              content:
                `${CONFIG.emojis.qa_cross} Test #${id} was not found.`,
              ephemeral: true
            });
          }

          const isHost =
            String(test.host_id) ===
            String(interaction.user.id);

          if (
            !isHost &&
            !canManageQA(
              interaction.member
            )
          ) {
            return interaction.reply({
              content:
                `${CONFIG.emojis.qa_cross} Only the test host or QA staff can close this test.`,
              ephemeral: true
            });
          }

          closeTest(id);

          return interaction.reply({
            content:
              `${CONFIG.emojis.qa_check} Test #${id} has been closed.`,
            ephemeral: true
          });
        }

        return;
      }

      /* ===================================================
         HOST BUTTON
      =================================================== */

      if (
        interaction.isButton() &&
        interaction.customId ===
          "qa_host_start"
      ) {

        if (
          !hasDeveloperRole(
            interaction.member
          ) &&
          !canManageQA(
            interaction.member
          )
        ) {
          return interaction.reply({
            content:
              `${CONFIG.emojis.qa_cross} You need the Developer role to host a test.`,
            ephemeral: true
          });
        }

        return interaction.showModal(
          buildHostModal()
        );
      }

      /* ===================================================
         HOST FORM SUBMIT
      =================================================== */

      if (
        interaction.isModalSubmit() &&
        interaction.customId ===
          "qa_host_modal"
      ) {

        if (
          !hasDeveloperRole(
            interaction.member
          ) &&
          !canManageQA(
            interaction.member
          )
        ) {
          return interaction.reply({
            content:
              `${CONFIG.emojis.qa_cross} You need the Developer role to host a test.`,
            ephemeral: true
          });
        }

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
            300
          );

        const maxTestersRaw =
          cleanText(
            interaction.fields.getTextInputValue(
              "max_testers"
            ),
            10
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
            200
          );

        const maxTesters =
          Number(maxTestersRaw);

        if (
          !Number.isInteger(maxTesters) ||
          maxTesters < 1 ||
          maxTesters > 999
        ) {
          return interaction.reply({
            content:
              `${CONFIG.emojis.qa_cross} Maximum testers must be a number between **1 and 999**.`,
            ephemeral: true
          });
        }

        if (
          !isRobloxUrl(gameLink)
        ) {
          return interaction.reply({
            content:
              `${CONFIG.emojis.qa_cross} Please provide a valid **Roblox HTTPS game link**.`,
            ephemeral: true
          });
        }

        if (!description) {
          return interaction.reply({
            content:
              `${CONFIG.emojis.qa_cross} Please provide a test description.`,
            ephemeral: true
          });
        }

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
            schedule
          }
        );

        return interaction.reply({
          content:
            `${CONFIG.emojis.qa_check} **Test information received!**\n\n` +
            `Choose whether this is a **Paid Test** or **Volunteer Test**.`,

          components: [
            buildTypeSelect(
              draftId
            )
          ],

          ephemeral: true
        });
      }

      /* ===================================================
         TEST TYPE SELECT
      =================================================== */

      if (
        interaction.isStringSelectMenu() &&
        interaction.customId.startsWith(
          "qa_type:"
        )
      ) {

        const draftId =
          interaction.customId.split(":")[1];

        const draft =
          drafts.get(draftId);

        if (!draft) {
          return interaction.update({
            content:
              `${CONFIG.emojis.qa_cross} This host form expired. Please start again.`,
            components: [],
            embeds: []
          });
        }

        if (
          draft.hostId !==
          interaction.user.id
        ) {
          return interaction.reply({
            content:
              `${CONFIG.emojis.qa_cross} This test setup belongs to another developer.`,
            ephemeral: true
          });
        }

        const type =
          interaction.values[0];

        if (type === "paid") {

          draft.testType =
            "paid";

          drafts.set(
            draftId,
            draft
          );

          return interaction.showModal(
            buildRewardModal(
              draftId
            )
          );
        }

        draft.testType =
          "volunteer";

        draft.reward =
          "Volunteer / No Robux Reward";

        drafts.set(
          draftId,
          draft
        );

        return createHostedTest(
          interaction,
          draftId
        );
      }

      /* ===================================================
         PAID REWARD MODAL
      =================================================== */

      if (
        interaction.isModalSubmit() &&
        interaction.customId.startsWith(
          "qa_reward:"
        )
      ) {

        const draftId =
          interaction.customId.split(":")[1];

        const draft =
          drafts.get(draftId);

        if (!draft) {
          return interaction.reply({
            content:
              `${CONFIG.emojis.qa_cross} This host form expired. Please start again.`,
            ephemeral: true
          });
        }

        if (
          draft.hostId !==
          interaction.user.id
        ) {
          return interaction.reply({
            content:
              `${CONFIG.emojis.qa_cross} This test setup belongs to another developer.`,
            ephemeral: true
          });
        }

        const reward =
          cleanText(
            interaction.fields.getTextInputValue(
              "reward"
            ),
            100
          );

        if (!reward) {
          return interaction.reply({
            content:
              `${CONFIG.emojis.qa_cross} Please enter a reward.`,
            ephemeral: true
          });
        }

        draft.testType =
          "paid";

        draft.reward =
          reward;

        drafts.set(
          draftId,
          draft
        );

        return createHostedTest(
          interaction,
          draftId
        );
      }

      /* ===================================================
         JOIN TEST
      =================================================== */

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "qa_join:"
        )
      ) {

        const id =
          Number(
            interaction.customId.split(":")[1]
          );

        const test =
          getTest(id);

        if (!test) {
          return interaction.reply({
            content:
              `${CONFIG.emojis.qa_cross} This test no longer exists.`,
            ephemeral: true
          });
        }

        if (
          test.status ===
          "closed"
        ) {
          return interaction.reply({
            content:
              `${CONFIG.emojis.qa_cross} This test is already closed.`,
            ephemeral: true
          });
        }

        if (
          !hasTesterRole(
            interaction.member
          )
        ) {
          return interaction.reply({
