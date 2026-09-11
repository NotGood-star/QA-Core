import {
  ActionRowBuilder,
  StringSelectMenuBuilder
} from "discord.js";

export function taxMenu() {
  const menu = new StringSelectMenuBuilder()
    .setCustomId("qa_tax")
    .setPlaceholder("Select tax option")
    .addOptions(
      {
        label: "With Tax",
        description: "The reward amount includes the required tax.",
        value: "with_tax",
        emoji: "🧾"
      },
      {
        label: "Without Tax",
        description: "The reward amount is before tax.",
        value: "without_tax",
        emoji: "💰"
      }
    );

  return new ActionRowBuilder().addComponents(menu);
}
