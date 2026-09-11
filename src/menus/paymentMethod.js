import {
  ActionRowBuilder,
  StringSelectMenuBuilder
} from "discord.js";

import { CONFIG } from "../config.js";

const e = CONFIG.emojis;

export function paymentMethodMenu() {
  const menu = new StringSelectMenuBuilder()
    .setCustomId("qa_payment_method")
    .setPlaceholder("How will you pay?")
    .addOptions(
      {
        label: "Game Pass",
        description: "Pay the tester through a Roblox Game Pass.",
        value: "gamepass",
        emoji: "🎟️"
      },
      {
        label: "Roblox Plus",
        description: "Pay the tester using Roblox Plus.",
        value: "roblox_plus",
        emoji: "💎"
      }
    );

  return new ActionRowBuilder().addComponents(menu);
    }
