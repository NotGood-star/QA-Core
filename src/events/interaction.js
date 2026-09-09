import {
  handleHostButton,
  handleHostModal
} from "../handlers/host.js";

export async function interaction(client, interaction) {
  const interactionName =
    interaction.customId ??
    interaction.commandName ??
    "unknown";

  // 🔍 ALWAYS log every Discord interaction
  console.log(
    `📨 Interaction received | type=${interaction.type} | id=${interactionName} | user=${interaction.user?.tag ?? interaction.user?.id}`
  );

  try {
    // =========================================================
    // SLASH COMMANDS
    // =========================================================

    if (interaction.isChatInputCommand()) {
      console.log(
        `⚡ Slash command: /${interaction.commandName}`
      );

      if (interaction.commandName !== "qa") {
        console.log("⚠️ Unknown slash command.");
        return;
      }

      const { qaCommand } =
        await import("../commands/qa.js");

      await qaCommand.execute(interaction);

      console.log(
        `✅ Slash command completed: /${interaction.commandName}`
      );

      return;
    }

    // =========================================================
    // BUTTONS
    // =========================================================

    if (interaction.isButton()) {
      console.log(
        `🔘 Button received: ${interaction.customId}`
      );

      const handled =
        await handleHostButton(interaction);

      if (handled) {
        console.log(
          `✅ Button handled: ${interaction.customId}`
        );
        return;
      }

      console.log(
        `⚠️ Unknown button: ${interaction.customId}`
      );

      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content:
            "❌ This button is no longer available.",
          ephemeral: true
        });
      }

      return;
    }

    // =========================================================
    // MODALS
    // =========================================================

    if (interaction.isModalSubmit()) {
      console.log(
        `📝 Modal submitted: ${interaction.customId}`
      );

      const handled =
        await handleHostModal(interaction);

      if (handled) {
        console.log(
          `✅ Modal handled: ${interaction.customId}`
        );
        return;
      }

      console.log(
        `⚠️ Unknown modal: ${interaction.customId}`
      );

      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content:
            "❌ This form is no longer available.",
          ephemeral: true
        });
      }

      return;
    }

    // =========================================================
    // SELECT MENUS
    // =========================================================

    if (interaction.isStringSelectMenu()) {
      console.log(
        `📋 Select menu received: ${interaction.customId}`
      );

      // Test type menu will be handled later.
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content:
            "⏳ This test-type menu is being connected.",
          ephemeral: true
        });
      }

      return;
    }

    // =========================================================
    // UNKNOWN INTERACTION
    // =========================================================

    console.log(
      `⚠️ Unhandled interaction type: ${interaction.type}`
    );

  } catch (error) {
    console.error(
      "❌ Interaction processing error:",
      error
    );

    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content:
            "❌ Something went wrong while processing this interaction.",
          ephemeral: true
        });
      } else {
        await interaction.reply({
          content:
            "❌ Something went wrong while processing this interaction.",
          ephemeral: true
        });
      }
    } catch (replyError) {
      console.error(
        "❌ Could not send interaction error:",
        replyError
      );
    }
  }
    }
