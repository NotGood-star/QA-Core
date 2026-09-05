export async function interaction(client, interaction) {
  if (interaction.isChatInputCommand()) {
    console.log(`📥 Command received: /${interaction.commandName}`);
    return;
  }

  if (interaction.isButton()) {
    console.log(`🔘 Button clicked: ${interaction.customId}`);
    return;
  }

  if (interaction.isStringSelectMenu()) {
    console.log(`📋 Menu used: ${interaction.customId}`);
    return;
  }

  if (interaction.isModalSubmit()) {
    console.log(`📝 Modal submitted: ${interaction.customId}`);
    return;
  }
}
