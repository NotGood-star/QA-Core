import {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} from "discord.js";

import { CONFIG, COLOR } from "./config.js";

const e = CONFIG.emojis;

export function hostPanelEmbed() {

    return new EmbedBuilder()

        .setColor(COLOR)

        .setTitle(
            `${e.qa_logo} QA CORNER — HOST A TEST`
        )

        .setDescription(
            `${e.qa_developer} **Are you a Roblox Developer?**\n\n` +

            `Looking for players to test your Roblox game?\n\n` +

            `${e.qa_paid} **Paid Tests**\n` +
            `Offer Robux rewards to testers.\n\n` +

            `${e.qa_free} **Volunteer Tests**\n` +
            `Get community testing for free.\n\n` +

            `${e.qa_feedback} **Professional QA Feedback**\n` +
            `Receive useful feedback, bug reports and gameplay observations.\n\n` +

            `${e.qa_ticket} Click **Host a Test** below to begin.`
        )

        .addFields(
            {
                name: `${e.qa_paid} Paid`,
                value: "Reward your testers.",
                inline: true
            },

            {
                name: `${e.qa_free} Volunteer`,
                value: "Free community testing.",
                inline: true
            },

            {
                name: `${e.qa_bug} Bug Testing`,
                value: "Find problems before release.",
                inline: true
            }
        )

        .setFooter({
            text: "QA Central • Test. Report. Improve."
        })

        .setTimestamp();
}

export function hostPanelButtons() {

    return new ActionRowBuilder()

        .addComponents(

            new ButtonBuilder()
                .setCustomId("qa_host_start")
                .setLabel("Host a Test")
                .setEmoji("🎫")
                .setStyle(ButtonStyle.Primary)

        );
}

export function testEmbed(test, joined) {

    const type =
        test.test_type === "paid"
            ? `${e.qa_paid} Paid Test`
            : `${e.qa_free} Volunteer Test`;

    const reward =
        test.test_type === "paid"
            ? `${e.qa_robux} ${test.reward}`
            : `${e.qa_free} Free`;

    return new EmbedBuilder()

        .setColor(COLOR)

        .setTitle(
            `${e.qa_upcoming} ${test.game_name}`
        )

        .setURL(test.game_link)

        .setDescription(
            test.description
        )

        .addFields(

            {
                name: `${e.qa_developer} Developer`,
                value: `<@${test.host_id}>`,
                inline: true
            },

            {
                name: `${e.qa_test} Test Type`,
                value: type,
                inline: true
            },

            {
                name: `${e.qa_reward} Reward`,
                value: reward,
                inline: true
            },

            {
                name: `${e.qa_upcoslots} Max Testers`,
                value: `${test.max_testers}`,
                inline: true
            },

            {
                name: `${e.qa_slots} Testers`,
                value: `${joined}/${test.max_testers}`,
                inline: true
            },

            {
                name: `${e.qa_calendar} Schedule`,
                value:
                    `**Start:** ${test.start_time}\n` +
                    `**End:** ${test.end_time}`,
                inline: false
            },

            {
                name: `${e.qa_roblox} Roblox Game`,
                value: `[Open Game](${test.game_link})`,
                inline: false
            },

            {
                name: "🎮 Platforms",
                value:
                    `${e.qa_pc} PC  • ` +
                    `${e.qa_mobile} Mobile  • ` +
                    `${e.qa_console} Console`,
                inline: false
            }

        )

        .setFooter({
            text: `QA Central • Test #${test.id}`
        })

        .setTimestamp();
}

export function testButtons(test, joined) {

    const full =
        joined >= test.max_testers;

    return new ActionRowBuilder()

        .addComponents(

            new ButtonBuilder()

                .setCustomId(
                    `qa_join:${test.id}`
                )

                .setLabel(
                    full
                        ? "Test Full"
                        : "Apply as Tester"
                )

                .setEmoji(
                    full
                        ? "🔒"
                        : "📝"
                )

                .setStyle(
                    full
                        ? ButtonStyle.Secondary
                        : ButtonStyle.Success
                )

                .setDisabled(full),

            new ButtonBuilder()

                .setCustomId(
                    `qa_testers:${test.id}`
                )

                .setLabel("View Testers")

                .setEmoji("👥")

                .setStyle(
                    ButtonStyle.Secondary
                ),

            new ButtonBuilder()

                .setLabel("Open Game")

                .setURL(test.game_link)

                .setEmoji("🎮")

                .setStyle(
                    ButtonStyle.Link
                )

        );
               }
