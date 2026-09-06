import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} from "discord.js";

export function hostModal() {
  const modal = new ModalBuilder()
    .setCustomId("qa_host_form")
    .setTitle("QA Central • Host a Test");

  const gameName = new TextInputBuilder()
    .setCustomId("game_name")
    .setLabel("Game Name")
    .setPlaceholder("Example: Blox Fruits")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100);

  const gameLink = new TextInputBuilder()
    .setCustomId("game_link")
    .setLabel("Roblox Game Link")
    .setPlaceholder("https://www.roblox.com/games/...")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const maxTesters = new TextInputBuilder()
    .setCustomId("max_testers")
    .setLabel("Maximum Testers")
    .setPlaceholder("Example: 10")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(3);

  const schedule = new TextInputBuilder()
    .setCustomId("schedule")
    .setLabel("Testing Schedule")
    .setPlaceholder("Example: 6 PM - 7 PM IST")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100);

  const description = new TextInputBuilder()
    .setCustomId("description")
    .setLabel("Test Description")
    .setPlaceholder("Tell testers what they need to test...")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1000);

  modal.addComponents(
    new ActionRowBuilder().addComponents(gameName),
    new ActionRowBuilder().addComponents(gameLink),
    new ActionRowBuilder().addComponents(maxTesters),
    new ActionRowBuilder().addComponents(schedule),
    new ActionRowBuilder().addComponents(description)
  );

  return modal;
                  }
