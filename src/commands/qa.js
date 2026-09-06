import {
  SlashCommandBuilder,
  PermissionFlagsBits
} from "discord.js";

import {
  hostPanelEmbed,
  hostPanelRow
} from "../embeds/hostPanel.js";

export const qaCommand = {
  data: new SlashCommandBuilder()
    .setName("qa")
    .setDescription("QA Central management commands")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

    .addSubcommand(subcommand =>
      subcommand
        .setName("setup")
        .setDescription("Set up the QA Central host panel")
    )

    .addSubcommand(subcommand =>
      subcommand
        .setName("test")
        .setDescription("Create a QA test")
    )

    .addSubcommand(subcommand =>
      subcommand
        .setName("close")
        .setDescription("Close an existing QA test")
        .addIntegerOption(option =>
          option
            .setName("id")
            .setDescription("Test ID")
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case "setup":
        return interaction.reply({
          embeds: [hostPanelEmbed()],
          components: [hostPanelRow()]
        });

      case "test":
        return interaction.reply({
          content: "🧪 Test creation will be added next.",
          ephemeral: true
        });

      case "close": {
        const id = interaction.options.getInteger("id");

        return interaction.reply({
          content: `🔒 Test #${id} closing will be added with the database system.`,
          ephemeral: true
        });
      }

      default:
        return interaction.reply({
          content: "❌ Unknown QA command.",
          ephemeral: true
        });
    }
  }
};
