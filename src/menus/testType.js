import {
  ActionRowBuilder,
  StringSelectMenuBuilder
} from "discord.js";

import { CONFIG } from "../config.js";

const e = CONFIG.emojis;

export function testTypeMenu() {
  const menu = new StringSelectMenuBuilder()
    .setCustomId("qa_test_type")
    .setPlaceholder("Select your test type")
    .addOptions(
      {
        label: "Paid Test",
        description: "Pay testers with Robux.",
        value: "paid",
        emoji: e.qa_paid
      },
      {
        label: "Volunteer Test",
        description: "Community testing without payment.",
        value: "volunteer",
        emoji: e.qa_free
      }
    );

  return new ActionRowBuilder().addComponents(menu);
}
