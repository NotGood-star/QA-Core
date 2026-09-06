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
        description: "Offer Robux or another reward to testers.",
        value: "paid",
        emoji: e.qa_paid
      },
      {
        label: "Volunteer Test",
        description: "Get community testing without a reward.",
        value: "volunteer",
        emoji: e.qa_free
      }
    );

  return new ActionRowBuilder().addComponents(menu);
        }
