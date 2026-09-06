import { handleHostButton, handleHostModal } from "../handlers/host.js";

export async function interaction(client, interaction) {
  try {
    // Slash commands
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName !== "qa") {
        return;
      }

      const { qaCommand } = await import("../commands/qa.js");

      await qaCommand.execute(interaction);
      return;
    }

    // Buttons
    if (interaction.isButton()) {
      const handled = await handleHostButton(interaction);

      if (handled) {
        return;
      }

      console.log(`🔘 Unknown button: ${interaction.customId}`);
      return;
    }

    // Modals
    if (interaction.isModalSubmit()) {
      const handled = await handleHostModal(interaction);

      if (handled) {
        return;
      }

      console.log(`📝 Unknown modal: ${interaction.customId}`);
      return;
    }

    // Select menus
    if (interaction.isStringSelectMenu()) {
      console.log(`📋 Menu used: ${interaction.customId}`);
      return;
    }

  } catch (error) {
    console.error("❌ Interaction error:", error);

    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: "❌ Something went wrong while processing this interaction.",
          ephemeral: true
        });
      } else {
        await interaction.reply({
          content: "❌ Something went wrong while processing this interaction.",
          ephemeral: true
        });
      }
    } catch (replyError) {
      console.error("❌ Failed to send error response:", replyError);
    }
  }
}
