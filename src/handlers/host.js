import { EmbedBuilder } from "discord.js";

import { CONFIG, COLOR } from "../config.js";
import { hostModal } from "../modals/hostModal.js";
import { paidRewardModal } from "../modals/paidReward.js";
import { testTypeMenu } from "../menus/testType.js";
import { paymentMethodMenu } from "../menus/paymentMethod.js";
import { taxMenu } from "../menus/tax.js";

const e = CONFIG.emojis;

// Temporary drafts.
// They expire after 10 minutes.
const drafts = new Map();

export async function handleHostButton(interaction) {
  console.log(
    `🔘 handleHostButton() called: ${interaction.customId}`
  );

  if (interaction.customId !== "qa_host_start") {
    return false;
  }

  console.log(
    `🎫 Host button matched | ${interaction.user.tag}`
  );

  const developerRole = CONFIG.roles.developer;

  if (!interaction.member?.roles?.cache?.has(developerRole)) {
    console.log(
      `❌ Developer role missing | ${interaction.user.tag}`
    );

    await interaction.reply({
      content:
        `${e.qa_warning} You need the **Developer** role to host a test.`,
      ephemeral: true
    });

    return true;
  }

  try {
    console.log(
      `📝 Opening Host Test modal | ${interaction.user.tag}`
    );

    await interaction.showModal(hostModal());

    console.log(
      `✅ Host Test modal opened`
    );

  } catch (error) {
    console.error(
      "❌ Failed to show Host Test modal:",
      error
    );
  }

  return true;
}

export async function handleHostModal(interaction) {
  console.log(
    `📝 handleHostModal() called: ${interaction.customId}`
  );

  if (interaction.customId === "qa_host_form") {
    return handleMainHostModal(interaction);
  }

  if (interaction.customId === "qa_paid_reward") {
    return handlePaidRewardModal(interaction);
  }

  return false;
}

async function handleMainHostModal(interaction) {
  try {
    const gameName =
      interaction.fields.getTextInputValue("game_name").trim();

    const gameLink =
      interaction.fields.getTextInputValue("game_link").trim();

    const maxTestersText =
      interaction.fields.getTextInputValue("max_testers").trim();

    const schedule =
      interaction.fields.getTextInputValue("schedule").trim();

    const description =
      interaction.fields.getTextInputValue("description").trim();

    const maxTesters = Number(maxTestersText);

    console.log(`🎮 Game: ${gameName}`);
    console.log(`🔗 Link: ${gameLink}`);
    console.log(`👥 Testers: ${maxTesters}`);
    console.log(`🕐 Schedule: ${schedule}`);

    // Validate testers
    if (
      !Number.isInteger(maxTesters) ||
      maxTesters < 1 ||
      maxTesters > 1000
    ) {
      await interaction.reply({
        content:
          `${e.qa_warning} Maximum testers must be a whole number between **1 and 1000**.`,
        ephemeral: true
      });

      return true;
    }

    // Validate Roblox link
    const robloxGameUrl =
      /^https?:\/\/(www\.)?roblox\.com\/games\/\d+/i;

    if (!robloxGameUrl.test(gameLink)) {
      await interaction.reply({
        content:
          `${e.qa_warning} Please provide a valid **Roblox game URL**.`,
        ephemeral: true
      });

      return true;
    }

    const draftId =
      `${interaction.user.id}-${Date.now()}`;

    drafts.set(draftId, {
      guildId: interaction.guildId,
      hostId: interaction.user.id,

      gameName,
      gameLink,
      maxTesters,

      schedule,
      description,

      testType: null,
      paymentMethod: null,
      tax: null,
      reward: null,

      createdAt: Date.now()
    });

    // Expire after 10 minutes
    setTimeout(() => {
      if (drafts.has(draftId)) {
        drafts.delete(draftId);

        console.log(
          `🗑️ Draft expired: ${draftId}`
        );
      }
    }, 10 * 60 * 1000);

    const embed = new EmbedBuilder()
      .setColor(COLOR)
      .setTitle(`${e.qa_test} Choose Test Type`)
      .setDescription(
        `${e.qa_check} **Game information received!**\n\n` +
        `**${e.qa_game} Game:** ${gameName}\n` +
        `**${e.qa_slots} Testers:** ${maxTesters}\n` +
        `**${e.qa_clock} Schedule:** ${schedule}\n\n` +
        `Choose whether this will be a **Paid** or **Volunteer** test.`
      )
      .setFooter({
        text: "QA Central • Test. Report. Improve."
      })
      .setTimestamp();

    await interaction.reply({
      embeds: [embed],
      components: [testTypeMenu()],
      ephemeral: true
    });

    console.log(
      `✅ Test type menu sent | draft=${draftId}`
    );

    return true;

  } catch (error) {
    console.error(
      "❌ Main Host modal error:",
      error
    );

    await interaction.reply({
      content:
        `${e.qa_cross} Something went wrong while reading your test information.`,
      ephemeral: true
    });

    return true;
  }
}

async function handlePaidRewardModal(interaction) {
  try {
    const rewardText =
      interaction.fields
        .getTextInputValue("reward_amount")
        .trim();

    const reward = Number(rewardText);

    if (
      !Number.isInteger(reward) ||
      reward < 1 ||
      reward > 1000000
    ) {
      await interaction.reply({
        content:
          `${e.qa_warning} Reward must be a whole number between **1 and 1,000,000 Robux**.`,
        ephemeral: true
      });

      return true;
    }

    // Find the user's newest draft.
    const draft = findLatestDraft(interaction.user.id);

    if (!draft) {
      await interaction.reply({
        content:
          `${e.qa_cross} Your test draft expired. Please start again with **Host a Test**.`,
        ephemeral: true
      });

      return true;
    }

    draft.reward = reward;

    console.log(
      `💰 Reward set: ${reward} Robux | user=${interaction.user.tag}`
    );

    await interaction.reply({
      content:
        `${e.qa_check} **Payment information saved!**\n\n` +
        `💰 **Reward:** ${reward} Robux\n` +
        `💳 **Payment:** ${formatPaymentMethod(draft.paymentMethod)}\n` +
        `🧾 **Tax:** ${formatTax(draft.tax)}\n\n` +
        `🚀 **Test creation is ready for the next step.**`,
      ephemeral: true
    });

    return true;

  } catch (error) {
    console.error(
      "❌ Paid reward modal error:",
      error
    );

    return true;
  }
}

export async function handleTestTypeMenu(interaction) {
  if (interaction.customId !== "qa_test_type") {
    return false;
  }

  const selected =
    interaction.values[0];

  const draft =
    findLatestDraft(interaction.user.id);

  if (!draft) {
    await interaction.update({
      content:
        `${e.qa_cross} Your test draft expired. Please start again.`,
      embeds: [],
      components: []
    });

    return true;
  }

  draft.testType = selected;

  console.log(
    `🧪 Test type selected: ${selected} | user=${interaction.user.tag}`
  );

  // VOLUNTEER
  if (selected === "volunteer") {
    await interaction.update({
      content:
        `${e.qa_check} **Volunteer Test selected!**\n\n` +
        `No payment information is required.\n\n` +
        `🚀 Volunteer test is ready for creation.`,
      embeds: [],
      components: []
    });

    return true;
  }

  // PAID
  await interaction.update({
    content:
      `${e.qa_paid} **Paid Test selected!**\n\n` +
      `How will you pay the testers?`,
    embeds: [],
    components: [paymentMethodMenu()]
  });

  return true;
}

export async function handlePaymentMethodMenu(interaction) {
  if (interaction.customId !== "qa_payment_method") {
    return false;
  }

  const selected =
    interaction.values[0];

  const draft =
    findLatestDraft(interaction.user.id);

  if (!draft) {
    await interaction.update({
      content:
        `${e.qa_cross} Your test draft expired. Please start again.`,
      components: []
    });

    return true;
  }

  draft.paymentMethod = selected;

  console.log(
    `💳 Payment method: ${selected} | user=${interaction.user.tag}`
  );

  await interaction.update({
    content:
      `💳 **Payment Method:** ${formatPaymentMethod(selected)}\n\n` +
      `🧾 Now select the tax option:`,
    components: [taxMenu()]
  });

  return true;
}

export async function handleTaxMenu(interaction) {
  if (interaction.customId !== "qa_tax") {
    return false;
  }

  const selected =
    interaction.values[0];

  const draft =
    findLatestDraft(interaction.user.id);

  if (!draft) {
    await interaction.update({
      content:
        `${e.qa_cross} Your test draft expired. Please start again.`,
      components: []
    });

    return true;
  }

  draft.tax = selected;

  console.log(
    `🧾 Tax: ${selected} | user=${interaction.user.tag}`
  );

  await interaction.update({
    content:
      `🧾 **Tax:** ${formatTax(selected)}\n\n` +
      `💰 Enter the **Robux reward** for each tester.`,
    components: []
  });

  // We cannot open a modal from a select-menu update.
  // The next button will be added in the next step.
  //
  // For now this is intentionally left ready for the
  // reward button/modal flow.

  return true;
}

function findLatestDraft(userId) {
  let latest = null;

  for (const draft of drafts.values()) {
    if (draft.hostId !== userId) continue;

    if (
      !latest ||
      draft.createdAt > latest.createdAt
    ) {
      latest = draft;
    }
  }

  return latest;
}

function formatPaymentMethod(method) {
  if (method === "gamepass") {
    return "🎟️ Game Pass";
  }

  if (method === "roblox_plus") {
    return "💎 Roblox Plus";
  }

  return "Not selected";
}

function formatTax(tax) {
  if (tax === "with_tax") {
    return "🧾 With Tax";
  }

  if (tax === "without_tax") {
    return "💰 Without Tax";
  }

  return "Not selected";
}

export function getDraft(id) {
  return drafts.get(id);
}

export function deleteDraft(id) {
  return drafts.delete(id);
}

export function getDraftCount() {
  return drafts.size;
}
