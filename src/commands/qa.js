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

    .addSubcommand(subcommand =>
      subcommand
        .setName("setup")
        .setDescription("Set up the QA Central host panel")
        .setDefaultMemberPermissions(
          PermissionFlagsBits.Administrator
        )
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

    if (subcommand === "setup") {
      const embed = hostPanelEmbed();
      const row = hostPanelRow();

      await interaction.channel.send({
        embeds: [embed],
        components: [row]
      });

      return interaction.reply({
        content: "✅ QA Host Panel has been posted!",
        ephemeral: true
      });
    }

    if (subcommand === "test") {
      return interaction.reply({
        content: "🧪 Test creation is coming next.",
        ephemeral: true
      });
    }

    if (subcommand === "close") {
      const id = interaction.options.getInteger("id");

      return interaction.reply({
        content: `🔒 Test #${id} closing will be added with the database system.`,
        ephemeral: true
      });
    }
  }
};
