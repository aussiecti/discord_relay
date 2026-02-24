import 'dotenv/config';
import axios from 'axios';
import {
  Client,
  GatewayIntentBits,
  Partials,
} from 'discord.js';

const MAKE_WEBHOOK = process.env.MAKE_WEBHOOK;
const CATEGORY_ID = process.env.CATEGORY_ID; // 1475289860263903273
const SUPPORT_ROLE_ID = process.env.SUPPORT_ROLE_ID; // 1475645908342542598

if (!MAKE_WEBHOOK || !CATEGORY_ID || !SUPPORT_ROLE_ID || !process.env.BOT_TOKEN) {
  console.error('Missing env vars. Required: BOT_TOKEN, MAKE_WEBHOOK, CATEGORY_ID, SUPPORT_ROLE_ID');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel],
});

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  try {
    // Ignore DMs and bots
    if (!message.guild) return;
    if (message.author.bot) return;

    // Must be in a channel under the target category
    const channel = message.channel;
    if (!channel?.parentId) return;
    if (channel.parentId !== CATEGORY_ID) return;

    // Must have Support role
    const member = message.member;
    if (!member) return;
    if (!member.roles.cache.has(SUPPORT_ROLE_ID)) return;

    // Must start with "!"
    const content = (message.content ?? '').trimStart();
    if (!content.startsWith('!')) return;

    // Parse command after "!" (supports: "!", "!update", "!contact", "! whatever")
    const afterBang = content.slice(1).trim();     // removes the "!"
    const command = afterBang === '' ? '' : afterBang.split(/\s+/)[0].toLowerCase();
    const args = afterBang === '' ? [] : afterBang.split(/\s+/).slice(1);

    // Send to Make
    await axios.post(MAKE_WEBHOOK, {
      event: 'support_ticket_command',
      command,            // "" if message was just "!"
      args,               // remaining tokens
      raw: message.content,

      guild_id: message.guild.id,
      channel_id: channel.id,
      channel_name: channel.name,
      category_id: channel.parentId,

      message_id: message.id,
      author_id: message.author.id,
      author_username: message.author.username,

      // helpful extras
      jump_url: message.url,
      attachments: message.attachments.map(a => ({
        id: a.id,
        name: a.name,
        url: a.url
      })),
      timestamp: message.createdTimestamp
    });

    console.log(`Webhook sent: #${channel.name} cmd="!${command}" msg=${message.id}`);
  } catch (err) {
    console.error('Error handling messageCreate:', err?.response?.data || err);
  }
});

client.login(process.env.BOT_TOKEN);