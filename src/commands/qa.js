import {
  SlashCommandBuilder,
  PermissionFlagsBits
} from "discord.js";

export const qaCommand = {
  data: new SlashCommandBuilder()
    .setName("qa")
    .setDescription("QA Central management commands")

    .addSubcommand(subcommand =>
      subcommand
        .setName("setup")
        .setDescription("Set up the QA Central host panel")
    )

    .addSubcommand(subcommand =>
      subcommand
        .setName("test")
        .setDescription("Create a QA test manually")
    )

    .addSubcommand(subcommand =>
      subcommand
        .setName("close")
        .setDescription("Close an existing QA test")
        .addIntegerOption(option =>
          option
            .setName("id")
            .setDescription("The test ID")
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case "setup":
        return interaction.reply({
          content: "⚙️ QA Central setup will be handled here.",
          ephemeral: true
        });

      case "test":
        return interaction.reply({
          content: "🧪 Test creation will be handled here.",
          ephemeral: true
        });

      case "close": {
        const id = interaction.options.getInteger("id");

        return interaction.reply({
          content: `🔒 Test #${id} closing will be handled here.`,
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
