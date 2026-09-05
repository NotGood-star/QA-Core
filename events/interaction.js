import { qaCommand } from "../commands/qa.js";

const commands = new Map([
  ["qa", qaCommand]
]);

export async function interaction(client, interaction) {
  try {
    if (interaction.isChatInputCommand()) {
      const command = commands.get(interaction.commandName);

      if (!command) {
        return interaction.reply({
          content: "❌ Command not found.",
          ephemeral: true
        });
      }

      return command.execute(interaction);
    }

    if (interaction.isButton()) {
      console.log(`🔘 Button clicked: ${interaction.customId}`);
      return;
    }

    if (interaction.isStringSelectMenu()) {
      console.log(`📋 Menu used: ${interaction.customId}`);
      return;
    }

    if (interaction.isModalSubmit()) {
      console.log(`📝 Modal submitted: ${interaction.customId}`);
      return;
    }
  } catch (error) {
    console.error("❌ Interaction error:", error);

    if (interaction.replied || interaction.deferred) {
      return interaction.followUp({
        content: "❌ Something went wrong.",
        ephemeral: true
      });
    }

    return interaction.reply({
      content: "❌ Something went wrong.",
      ephemeral: true
    });
  }
      }
