import { EmbedBuilder } from "discord.js";

import { CONFIG, COLOR } from "../config.js";
import { hostModal } from "../modals/hostModal.js";
import { testTypeMenu } from "../menus/testType.js";

const e = CONFIG.emojis;

// Temporary in-memory drafts.
// Drafts automatically expire after 10 minutes.
const drafts = new Map();

/**
 * Handle the "Host a Test" button.
 */
export async function handleHostButton(interaction) {
  console.log(
    `🔘 handleHostButton() called: ${interaction.customId}`
  );

  // Only handle our Host a Test button.
  if (interaction.customId !== "qa_host_start") {
    return false;
  }

  console.log(
    `🎫 Host button matched | user=${interaction.user.tag} | id=${interaction.user.id}`
  );

  // Make sure the user has the Developer role.
  const developerRole = CONFIG.roles.developer;

  if (!interaction.member?.roles?.cache?.has(developerRole)) {
    console.log(
      `❌ Developer role missing | user=${interaction.user.tag}`
    );

    await interaction.reply({
      content:
        `${e.qa_warning} You need the **Developer** role to host a test.`,
      ephemeral: true
    });

    return true;
  }

  console.log(
    `👨‍💻 Developer role verified | user=${interaction.user.tag}`
  );

  try {
    console.log(
      `📝 Showing Host Test modal | user=${interaction.user.tag}`
    );

    // IMPORTANT:
    // showModal() is the initial Discord interaction response.
    // Do NOT deferReply() before this.
    await interaction.showModal(hostModal());

    console.log(
      `✅ Host Test modal shown | user=${interaction.user.tag}`
    );

  } catch (error) {
    console.error(
      `❌ Failed to show Host Test modal:`,
      error
    );

    // If Discord has not received an acknowledgement yet,
    // attempt to send an error.
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content:
            `${e.qa_cross} Failed to open the Host Test form. Please try again.`,
          ephemeral: true
        });
      }
    } catch (replyError) {
      console.error(
        `❌ Failed to send modal error response:`,
        replyError
      );
    }
  }

  return true;
}

/**
 * Handle the Host Test modal submission.
 */
export async function handleHostModal(interaction) {
  console.log(
    `📝 handleHostModal() called: ${interaction.customId}`
  );

  // Only handle our Host Test modal.
  if (interaction.customId !== "qa_host_form") {
    return false;
  }

  console.log(
    `📋 Host Test form submitted | user=${interaction.user.tag} | id=${interaction.user.id}`
  );

  try {
    // =========================================================
    // GET FORM VALUES
    // =========================================================

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

    console.log(`🎮 Game: ${gameName}`);
    console.log(`🔗 Game Link: ${gameLink}`);
    console.log(`👥 Max Testers: ${maxTestersText}`);
    console.log(`🕐 Schedule: ${schedule}`);
    console.log(`📝 Description length: ${description.length}`);

    // =========================================================
    // VALIDATE MAX TESTERS
    // =========================================================

    const maxTesters = Number(maxTestersText);

    if (
      !Number.isInteger(maxTesters) ||
      maxTesters < 1 ||
      maxTesters > 1000
    ) {
      console.log(
        `❌ Invalid max testers: ${maxTestersText}`
      );

      await interaction.reply({
        content:
          `${e.qa_warning} Maximum testers must be a whole number between **1 and 1000**.`,
        ephemeral: true
      });

      return true;
    }

    // =========================================================
    // VALIDATE ROBLOX GAME URL
    // =========================================================

    const robloxGameUrl =
      /^https?:\/\/(www\.)?roblox\.com\/games\/\d+/i;

    if (!robloxGameUrl.test(gameLink)) {
      console.log(
        `❌ Invalid Roblox game URL: ${gameLink}`
      );

      await interaction.reply({
        content:
          `${e.qa_warning} Please provide a valid **Roblox game URL**.\n\n` +
          `Example:\n` +
          `https://www.roblox.com/games/123456789`,
        ephemeral: true
      });

      return true;
    }

    // =========================================================
    // CREATE TEMPORARY DRAFT
    // =========================================================

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

      createdAt: Date.now()
    });

    console.log(
      `💾 Draft created | draft=${draftId} | user=${interaction.user.tag}`
    );

    // Automatically remove old drafts after 10 minutes.
    setTimeout(() => {
      if (drafts.has(draftId)) {
        drafts.delete(draftId);

        console.log(
          `🗑️ Draft expired | draft=${draftId}`
        );
      }
    }, 10 * 60 * 1000);

    // =========================================================
    // TEST TYPE EMBED
    // =========================================================

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

    // =========================================================
    // SEND TEST TYPE MENU
    // =========================================================

    await interaction.reply({
      embeds: [embed],
      components: [testTypeMenu()],
      ephemeral: true
    });

    console.log(
      `✅ Test type menu sent | draft=${draftId} | user=${interaction.user.tag}`
    );

  } catch (error) {
    console.error(
      `❌ Host modal processing error:`,
      error
    );

    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content:
            `${e.qa_cross} Something went wrong while processing your Host Test form.`,
          ephemeral: true
        });
      } else {
        await interaction.reply({
          content:
            `${e.qa_cross} Something went wrong while processing your Host Test form.`,
          ephemeral: true
        });
      }
    } catch (replyError) {
      console.error(
        `❌ Failed to send Host Test error:`,
        replyError
      );
    }
  }

  return true;
}

/**
 * Get a temporary draft.
 */
export function getDraft(id) {
  return drafts.get(id);
}

/**
 * Delete a temporary draft.
 */
export function deleteDraft(id) {
  if (drafts.has(id)) {
    drafts.delete(id);

    console.log(
      `🗑️ Draft deleted | draft=${id}`
    );

    return true;
  }

  return false;
}

/**
 * Get the number of currently stored drafts.
 */
export function getDraftCount() {
  return drafts.size;
}
