import { ready } from "./ready.js";
import { interaction } from "./interaction.js";

/**
 * Register all Discord client events.
 *
 * @param {import("discord.js").Client} client
 */
export function registerEvents(client) {

  // ===========================================================
  // CLIENT READY
  // ===========================================================

  client.once("clientReady", () => {
    console.log("📡 Discord clientReady event received.");

    try {
      ready(client);
    } catch (error) {
      console.error(
        "❌ Ready event error:",
        error
      );
    }
  });

  // ===========================================================
  // INTERACTIONS
  // ===========================================================

  client.on(
    "interactionCreate",
    (interactionObject) => {

      console.log(
        `📨 Discord interactionCreate received | type=${interactionObject.type} | ` +
        `customId=${interactionObject.customId ?? "none"} | ` +
        `command=${interactionObject.commandName ?? "none"} | ` +
        `user=${interactionObject.user?.tag ?? interactionObject.user?.id ?? "unknown"}`
      );

      // Run the async interaction handler.
      //
      // "void" intentionally ignores the returned Promise while
      // allowing interaction() to handle its own errors.
      void interaction(
        client,
        interactionObject
      ).catch((error) => {
        console.error(
          "❌ Unhandled interaction event error:",
          error
        );
      });
    }
  );

  // ===========================================================
  // EVENT REGISTRATION COMPLETE
  // ===========================================================

  console.log(
    "✅ QA Central event handlers registered."
  );
}
