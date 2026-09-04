import "dotenv/config";

import {
    Client,
    GatewayIntentBits,
    Events,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    PermissionsBitField,
    EmbedBuilder
} from "discord.js";

import {
    CONFIG,
    COLOR
} from "./config.js";

import {
    createTest,
    getTest,
    getJoinedCount,
    joinTest,
    listTesters,
    setTestMessage,
    closeTest
} from "./db.js";

import {
    hostPanelEmbed,
    hostPanelButtons,
    testEmbed,
    testButtons
} from "./embeds.js";


const client = new Client({

    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]

});


function hasRole(interaction, roleId) {

    return interaction
        .member
        ?.roles
        ?.cache
        ?.has(roleId);

}


function input(
    id,
    label,
    placeholder,
    style = TextInputStyle.Short
) {

    return new ActionRowBuilder()

        .addComponents(

            new TextInputBuilder()

                .setCustomId(id)

                .setLabel(label)

                .setPlaceholder(
                    placeholder
                )

                .setStyle(style)

                .setRequired(true)

        );

}


client.once(
    Events.ClientReady,
    clientUser => {

        console.log(
            `🧪 QA Central online as ${clientUser.user.tag}`
        );

    }
);


client.on(
    Events.InteractionCreate,
    async interaction => {

        try {

            /*
             * =========================
             * SLASH COMMANDS
             * =========================
             */

            if (
                interaction.isChatInputCommand()
            ) {

                if (
                    interaction.commandName !== "qa"
                ) return;


                const sub =
                    interaction.options
                        .getSubcommand();


                /*
                 * /qa setup
                 */

                if (sub === "setup") {

                    if (
                        !interaction.memberPermissions
                            ?.has(
                                PermissionsBitField.Flags
                                    .ManageGuild
                            )
                    ) {

                        return interaction.reply({

                            content:
                                `${CONFIG.emojis.qa_cross} You need **Manage Server** permission.`,

                            ephemeral: true

                        });

                    }


                    if (
                        interaction.channelId !==
                        CONFIG.channels.host
                    ) {

                        return interaction.reply({

                            content:
                                `${CONFIG.emojis.qa_warning} Use this command in <#${CONFIG.channels.host}>.`,

                            ephemeral: true

                        });

                    }


                    return interaction.reply({

                        embeds: [
                            hostPanelEmbed()
                        ],

                        components: [
                            hostPanelButtons()
                        ]

                    });

                }


                /*
                 * /qa test ID
                 */

                if (sub === "test") {

                    const id =
                        interaction.options
                            .getInteger(
                                "id",
                                true
                            );


                    const test =
                        getTest(id);


                    if (!test) {

                        return interaction.reply({

                            content:
                                `${CONFIG.emojis.qa_cross} Test not found.`,

                            ephemeral: true

                        });

                    }


                    const joined =
                        getJoinedCount(id);


                    return interaction.reply({

                        embeds: [
                            testEmbed(
                                test,
                                joined
                            )
                        ],

                        components: [
                            testButtons(
                                test,
                                joined
                            )
                        ]

                    });

                }


                /*
                 * /qa close ID
                 */

                if (sub === "close") {

                    if (
                        !interaction.memberPermissions
                            ?.has(
                                PermissionsBitField.Flags
                                    .ManageGuild
                            )
                    ) {

                        return interaction.reply({

                            content:
                                `${CONFIG.emojis.qa_cross} You need **Manage Server** permission.`,

                            ephemeral: true

                        });

                    }


                    const id =
                        interaction.options
                            .getInteger(
                                "id",
                                true
                            );


                    const test =
                        getTest(id);


                    if (!test) {

                        return interaction.reply({

                            content:
                                `${CONFIG.emojis.qa_cross} Test not found.`,

                            ephemeral: true

                        });

                    }


                    closeTest(id);


                    return interaction.reply({

                        content:
                            `${CONFIG.emojis.qa_check} Test **#${id}** has been closed.`,

                        ephemeral: true

                    });

                }

            }


            /*
             * =========================
             * HOST TEST BUTTON
             * =========================
             */

            if (
                interaction.isButton() &&
                interaction.customId ===
                    "qa_host_start"
            ) {

                if (
                    !hasRole(
                        interaction,
                        CONFIG.roles.developer
                    )
                ) {

                    return interaction.reply({

                        content:
                            `${CONFIG.emojis.qa_cross} You need the **Developer** role to host a test.`,

                        ephemeral: true

                    });

                }


                const modal =
                    new ModalBuilder()

                        .setCustomId(
                            "qa_host_modal"
                        )

                        .setTitle(
                            "QA Central • Host Test"
                        );


                modal.addComponents(

                    input(
                        "game_name",
                        "Game Name",
                        "Anime Zenith"
                    ),

                    input(
                        "game_link",
                        "Roblox Game Link",
                        "https://www.roblox.com/games/..."
                    ),

                    input(
                        "max_testers",
                        "Maximum Testers",
                        "2"
                    ),

                    input(
                        "schedule",
                        "Start Time | End Time",
                        "7:00 PM | 8:00 PM"
                    ),

                    input(
                        "description",
                        "Description / Requirements",
                        "Find bugs, play 10 minutes, give feedback.",
                        TextInputStyle.Paragraph
                    )

                );


                return interaction.showModal(
                    modal
                );

            }


            /*
             * =========================
             * HOST MODAL
             * =========================
             */

            if (
                interaction.isModalSubmit() &&
                interaction.customId ===
                    "qa_host_modal"
            ) {

                const gameName =
                    interaction.fields
                        .getTextInputValue(
                            "game_name"
                        )
                        .trim();


                const gameLink =
                    interaction.fields
                        .getTextInputValue(
                            "game_link"
                        )
                        .trim();


                const maxTesters =
                    Number(
                        interaction.fields
                            .getTextInputValue(
                                "max_testers"
                            )
                    );


                const schedule =
                    interaction.fields
                        .getTextInputValue(
                            "schedule"
                        )
                        .trim();


                const description =
                    interaction.fields
                        .getTextInputValue(
                            "description"
                        )
                        .trim();


                if (
                    !/^https?:\/\/(www\.)?roblox\.com\/.+/i
                        .test(gameLink)
                ) {

                    return interaction.reply({

                        content:
                            `${CONFIG.emojis.qa_cross} Please provide a valid Roblox game URL.`,

                        ephemeral: true

                    });

                }


                if (
                    !Number.isInteger(
                        maxTesters
                    ) ||
                    maxTesters < 1 ||
                    maxTesters > 100
                ) {

                    return interaction.reply({

                        content:
                            `${CONFIG.emojis.qa_cross} Max testers must be between **1 and 100**.`,

                        ephemeral: true

                    });

                }


                const payload =
                    encodeURIComponent(
                        JSON.stringify({

                            gameName,
                            gameLink,
                            maxTesters,
                            schedule,
                            description

                        })
                    );


                const menu =
                    new StringSelectMenuBuilder()

                        .setCustomId(
                            `qa_type:${payload}`
                        )

                        .setPlaceholder(
                            "Choose Test Type"
                        )

                        .addOptions(

                            new StringSelectMenuOptionBuilder()

                                .setLabel(
                                    "Paid Test"
                                )

                                .setDescription(
                                    "Offer Robux to testers"
                                )

                                .setValue(
                                    "paid"
                                ),

                            new StringSelectMenuOptionBuilder()

                                .setLabel(
                                    "Volunteer Test"
                                )

                                .setDescription(
                                    "Free community testing"
                                )

                                .setValue(
                                    "volunteer"
                                )

                        );


                return interaction.reply({

                    content:
                        `${CONFIG.emojis.qa_test} **Choose the type of test:**`,

                    components: [

                        new ActionRowBuilder()
                            .addComponents(
                                menu
                            )

                    ],

                    ephemeral: true

                });

            }


            /*
             * =========================
             * TEST TYPE
             * =========================
             */

            if (
                interaction.isStringSelectMenu() &&
                interaction.customId
                    .startsWith("qa_type:")
            ) {

                const payload =
                    JSON.parse(

                        decodeURIComponent(

                            interaction.customId
                                .slice(
                                    "qa_type:".length
                                )

                        )

                    );


                const type =
                    interaction.values[0];


                /*
                 * PAID
                 */

                if (type === "paid") {

                    const modal =
                        new ModalBuilder()

                            .setCustomId(
                                `qa_reward:${encodeURIComponent(
                                    JSON.stringify(payload)
                                )}`
                            )

                            .setTitle(
                                "QA Central • Reward"
                            );


                    modal.addComponents(

                        input(
                            "reward",
                            "Reward Per Tester",
                            "20 Robux"
                        )

                    );


                    return interaction.showModal(
                        modal
                    );

                }


                /*
                 * VOLUNTEER
                 */

                const id =
                    createTest({

                        guild_id:
                            interaction.guildId,

                        host_id:
                            interaction.user.id,

                        game_name:
                            payload.gameName,

                        game_link:
                            payload.gameLink,

                        test_type:
                            "volunteer",

                        max_testers:
                            payload.maxTesters,

                        reward:
                            null,

                        description:
                            payload.description,

                        start_time:
                            payload.schedule
                                .split("|")[0]
                                ?.trim() ||
                            payload.schedule,

                        end_time:
                            payload.schedule
                                .split("|")
                                .slice(1)
                                .join("|")
                                .trim() ||
                            "Not specified",

                        created_at:
                            new Date()
                                .toISOString()

                    });


                const test =
                    getTest(id);


                const channel =
                    await interaction.guild
                        .channels
                        .fetch(
                            CONFIG.channels
                                .volunteer
                        );


                const message =
                    await channel.send({

                        embeds: [
                            testEmbed(
                                test,
                                0
                            )
                        ],

                        components: [
                            testButtons(
                                test,
                                0
                            )
                        ]

                    });


                setTestMessage(
                    id,
                    channel.id,
                    message.id
                );


                return interaction.update({

                    content:
                        `${CONFIG.emojis.qa_check} Volunteer test **#${id}** has been posted in <#${CONFIG.channels.volunteer}>.`,

                    components: []

                });

            }


            /*
             * =========================
             * PAID REWARD
             * =========================
             */

            if (
                interaction.isModalSubmit() &&
                interaction.customId
                    .startsWith(
                        "qa_reward:"
                    )
            ) {

                const payload =
                    JSON.parse(

                        decodeURIComponent(

                            interaction.customId
                                .slice(
                                    "qa_reward:"
                                        .length
                                )

                        )

                    );


                const reward =
                    interaction.fields
                        .getTextInputValue(
                            "reward"
                        )
                        .trim();


                const id =
                    createTest({

                        guild_id:
                            interaction.guildId,

                        host_id:
                            interaction.user.id,

                        game_name:
                            payload.gameName,

                        game_link:
                            payload.gameLink,

                        test_type:
                            "paid",

                        max_testers:
                            payload.maxTesters,

                        reward,

                        description:
                            payload.description,

                        start_time:
                            payload.schedule
                                .split("|")[0]
                                ?.trim() ||
                            payload.schedule,

                        end_time:
                            payload.schedule
                                .split("|")
                                .slice(1)
                                .join("|")
                                .trim() ||
                            "Not specified",

                        created_at:
                            new Date()
                                .toISOString()

                    });


                const test =
                    getTest(id);


                const channel =
                    await interaction.guild
                        .channels
                        .fetch(
                            CONFIG.channels
                                .paid
                        );


                const message =
                    await channel.send({

                        embeds: [
                            testEmbed(
                                test,
  
