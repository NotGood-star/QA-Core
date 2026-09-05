import { Client, GatewayIntentBits } from "discord.js";
import { registerEvents } from "./events/index.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

registerEvents(client);

client.login(process.env.DISCORD_TOKEN);
