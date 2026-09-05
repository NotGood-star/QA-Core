import { ready } from "./ready.js";
import { interaction } from "./interaction.js";

export function registerEvents(client) {
  client.once("ready", () => ready(client));

  client.on("interactionCreate", (interactionObject) => {
    interaction(client, interactionObject);
  });
}
