export async function interaction(client, interaction) {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName !== "qa") {
        return;
      }

      const { qaCommand } = await import("../commands/qa.js");

      await qaCommand.execute(interaction);
      return;
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
      console.error("❌ Could not send interaction error:", replyError);
    }
  }
  }
