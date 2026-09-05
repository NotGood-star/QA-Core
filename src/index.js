import http from "node:http";
import { Client, GatewayIntentBits } from "discord.js";
import { registerEvents } from "./events/index.js";

const PORT = process.env.PORT || 3000;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds
  ]
});

registerEvents(client);

// Render health server
const server = http.createServer((req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/plain"
  });

  res.end("QA Central is online!");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 Health server running on port ${PORT}`);
});

client.login(process.env.DISCORD_TOKEN);
