import {
  handleHostButton,
  handleHostModal,
  handleTestTypeMenu,
  handlePaymentMethodMenu,
  handleTaxMenu
} from "../handlers/host.js";

export async function interaction(client, interaction) {
  const interactionName =
    interaction.customId ??
    interaction.commandName ??
    "unknown";

  console.log(
    `📨 Interaction received | type=${interaction.type} | ` +
    `id=${interactionName} | ` +
    `user=${interaction.user?.tag ?? interaction.user?.id ?? "unknown"}`
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
        return;
      }

      const { qaCommand } =
        await import("../commands/qa.js");

      await qaCommand.execute(interaction);

      console.log(
        `✅ Slash command completed`
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
        `📝 Modal received: ${interaction.customId}`
      );

      const handled =
        await handleHostModal(interaction);

      if (handled) {
        return;
      }

      console.log(
        `⚠️ Unknown modal: ${interaction.customId}`
      );

      return;
    }

    // =========================================================
    // SELECT MENUS
    // =========================================================

    if (interaction.isStringSelectMenu()) {

      console.log(
        `📋 Select menu received: ${interaction.customId}`
      );

      if (
        await handleTestTypeMenu(interaction)
      ) {
        return;
      }

      if (
        await handlePaymentMethodMenu(interaction)
      ) {
        return;
      }

      if (
        await handleTaxMenu(interaction)
      ) {
        return;
      }

      console.log(
        `⚠️ Unknown select menu: ${interaction.customId}`
      );

      return;
    }

    console.log(
      `⚠️ Unhandled interaction type: ${interaction.type}`
    );

  } catch (error) {

    console.error(
      "❌ Interaction processing error:",
      error
    );

    try {

      if (
        interaction.replied ||
        interaction.deferred
      ) {

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
        "❌ Failed to send interaction error:",
        replyError
      );

    }
  }
}
