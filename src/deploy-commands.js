import "dotenv/config";
import { REST, Routes } from "discord.js";
import { qaCommand } from "./commands/qa.js";

const commands = [
  qaCommand.data.toJSON()
];

const rest = new REST({ version: "10" })
  .setToken(process.env.DISCORD_TOKEN);

try {
  console.log("🔄 Registering QA Central commands...");

  await rest.put(
    Routes.applicationCommands(process.env.CLIENT_ID),
    { body: commands }
  );

  console.log("✅ Slash commands registered successfully!");
} catch (error) {
  console.error("❌ Failed to register slash commands:", error);
}
