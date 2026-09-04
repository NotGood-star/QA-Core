import "dotenv/config";

import {
    REST,
    Routes,
    SlashCommandBuilder
} from "discord.js";

const commands = [

    new SlashCommandBuilder()

        .setName("qa")

        .setDescription(
            "QA Central controls"
        )

        .addSubcommand(sub =>
            sub
                .setName("setup")
                .setDescription(
                    "Post the QA Central Host Test panel"
                )
        )

        .addSubcommand(sub =>
            sub
                .setName("test")
                .setDescription(
                    "View a QA test"
                )

                .addIntegerOption(option =>
                    option
                        .setName("id")
                        .setDescription(
                            "Test ID"
                        )
                        .setRequired(true)
                )
        )

        .addSubcommand(sub =>
            sub
                .setName("close")
                .setDescription(
                    "Close a QA test"
                )

                .addIntegerOption(option =>
                    option
                        .setName("id")
                        .setDescription(
                            "Test ID"
                        )
                        .setRequired(true)
                )
        )

].map(command =>
    command.toJSON()
);

const rest = new REST({
    version: "10"
}).setToken(
    process.env.DISCORD_TOKEN
);

await rest.put(

    Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
    ),

    {
        body: commands
    }

);

console.log(
    "✅ QA Central slash commands registered!"
);
