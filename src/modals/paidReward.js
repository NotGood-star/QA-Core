import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} from "discord.js";

export function paidRewardModal() {
  const modal = new ModalBuilder()
    .setCustomId("qa_paid_reward")
    .setTitle("QA Central • Payment");

  const reward = new TextInputBuilder()
    .setCustomId("reward_amount")
    .setLabel("Robux Reward")
    .setPlaceholder("Example: 100")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMinLength(1)
    .setMaxLength(10);

  modal.addComponents(
    new ActionRowBuilder().addComponents(reward)
  );

  return modal;
}
