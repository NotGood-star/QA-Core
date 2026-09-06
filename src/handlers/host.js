import {
  EmbedBuilder
} from "discord.js";

import { CONFIG, COLOR } from "../config.js";
import { hostModal } from "../modals/hostModal.js";
import { testTypeMenu } from "../menus/testType.js";

const drafts = new Map();

export async function handleHostButton(interaction) {
  if (interaction.customId !== "qa_host_start") {
    return false;
  }

  const developerRole = CONFIG.roles.developer;

  if (!interaction.member.roles.cache.has(developerRole)) {
    await interaction.reply({
      content:
        `${CONFIG.emojis.qa_warning} You need the **Developer** role to host a test.`,
      ephemeral: true
    });

    return true;
  }

  await interaction.showModal(hostModal());

  return true;
}

export async function handleHostModal(interaction) {
  if (interaction.customId !== "qa_host_form") {
    return false;
  }

  const gameName = interaction.fields.getTextInputValue("game_name");
  const gameLink = interaction.fields.getTextInputValue("game_link");
  const maxTestersText = interaction.fields.getTextInputValue("max_testers");
  const schedule = interaction.fields.getTextInputValue("schedule");
  const description = interaction.fields.getTextInputValue("description");

  const maxTesters = Number(maxTestersText);

  if (!Number.isInteger(maxTesters) || maxTesters < 1 || maxTesters > 1000) {
    await interaction.reply({
      content:
        `${CONFIG.emojis.qa_warning} Maximum testers must be a whole number between **1 and 1000**.`,
      ephemeral: true
    });

    return true;
  }

  if (!/^https?:\/\/(www\.)?roblox\.com\/games\/\d+/i.test(gameLink)) {
    await interaction.reply({
      content:
        `${CONFIG.emojis.qa_warning} Please provide a valid **Roblox game URL**.`,
      ephemeral: true
    });

    return true;
  }

  const draftId = `${interaction.user.id}-${Date.now()}`;

  drafts.set(draftId, {
    guildId: interaction.guildId,
    hostId: interaction.user.id,
    gameName,
    gameLink,
    maxTesters,
    schedule,
    description,
    createdAt: Date.now()
  });

  setTimeout(() => {
    drafts.delete(draftId);
  }, 10 * 60 * 1000);

  const embed = new EmbedBuilder()
    .setColor(COLOR)
    .setTitle(`${CONFIG.emojis.qa_test} Choose Test Type`)
    .setDescription(
      `${CONFIG.emojis.qa_check} **Game information received!**\n\n` +
      `**Game:** ${gameName}\n` +
      `**Testers:** ${maxTesters}\n` +
      `**Schedule:** ${schedule}\n\n` +
      `Choose whether this will be a **Paid** or **Volunteer** test.`
    )
    .setFooter({
      text: "QA Central • Test. Report. Improve."
    });

  await interaction.reply({
    embeds: [embed],
    components: [testTypeMenu()],
    ephemeral: true
  });

  return true;
}

export function getDraft(id) {
  return drafts.get(id);
}

export function deleteDraft(id) {
  drafts.delete(id);
  }
