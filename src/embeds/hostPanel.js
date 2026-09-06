import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from "discord.js";

import { CONFIG, COLOR } from "../config.js";

const e = CONFIG.emojis;

export function hostPanelEmbed() {
  return new EmbedBuilder()
    .setColor(COLOR)
    .setTitle(`${e.qa_logo} QA CORNER — HOST A TEST`)
    .setDescription(
      `${e.qa_developer} **Are you a Roblox developer looking for testers?**\n\n` +
      `Create a **Paid** or **Volunteer** QA test and connect with Roblox players who want to help improve games.\n\n` +
      `${e.qa_test} Click the button below to start your test request.`
    )
    .addFields(
      {
        name: `${e.qa_paid} Paid Tests`,
        value: "Offer a reward to testers.",
        inline: true
      },
      {
        name: `${e.qa_free} Volunteer Tests`,
        value: "Get free community testing.",
        inline: true
      },
      {
        name: `${e.qa_feedback} QA Feedback`,
        value: "Collect useful game feedback and bug reports.",
        inline: false
      }
    )
    .setFooter({
      text: "QA Central • Test. Report. Improve."
    })
    .setTimestamp();
}

export function hostPanelRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("qa_host_start")
      .setLabel("Host a Test")
      .setEmoji("🎫")
      .setStyle(ButtonStyle.Primary)
  );
      }
