---
name: minisago-discord
description: Check, search, and read Discord through MiniSago on Oracle over SSH from this Mac. Use for requests like "check Discord for...", "find that Discord conversation", or "ask minisago to look up..."; also send messages when the user asks to post or reply.
---

# MiniSago Discord

Use the existing SSH alias and deployed Discord helpers immediately. No MCP setup or repository checkout is needed. This calls MiniSago's Discord functions directly; it does not delegate reasoning to MiniSago's AI.

## Run

Send a short TypeScript script to Bun in the bot container:

```bash
ssh -o BatchMode=yes -o ConnectTimeout=10 sago-cloud \
  'docker exec -i -w /app sago-cloud-bot-core-bot-core-1 bun run -' <<'MINISAGO_SCRIPT'
import { createDiscordRequest } from './src/discord/api/request.ts';
import { getChatbotAccessConfig } from './src/chatbot/access.ts';
import {
  canMemberSearchChannel,
  searchGuildMessages,
  toChatbotMessage,
} from './src/chatbot/chatbot-context.ts';

const discord = createDiscordRequest(process.env.DISCORD_BOT_TOKEN!.trim());
const { ownerUserId } = getChatbotAccessConfig();
// Add the requested read/search operation, then print bounded JSON results.
MINISAGO_SCRIPT
```

Keep credentials in the container. Use the quoted heredoc and JSON-escaped TypeScript string literals for user input. Do not interpolate user text into shell commands. If the container name changes, find it with `ssh sago-cloud 'docker ps --format "{{.Names}}"'`. Inspect only the relevant helper if its API changes.

## Find and search

- Resolve destinations with `discord('/users/@me/guilds')` and `discord('/guilds/' + guildId + '/channels')`. Reuse IDs already established in the conversation; resolve names exactly and disambiguate collisions.
- Load the owner's actual roles with `discord('/guilds/' + guildId + '/members/' + ownerUserId)`. For each channel, check `canMemberSearchChannel({ guildId, userId: ownerUserId, roleIds: member.roles, roles, channel })`, where `roles` comes from `discord('/guilds/' + guildId + '/roles')`. Choose a visible text channel as `currentChannelId`.
- Call `searchGuildMessages({ guildId, requesterUserId: ownerUserId, requesterRoleIds: member.roles, currentChannelId, requestMessageId: '0', queries: [{ content: 'search terms' }], discordRequest: discord })`. The `'0'` sentinel only disables exclusion of a triggering Discord message; this request originates outside Discord.
- Queries also accept `author`, `mentions`, `has` (e.g. `['link']`), `linkHostname`, `attachmentExtension`, `sortBy: 'timestamp'`, and `sortOrder: 'desc'`. `author: 'me'` resolves to the owner. The helper searches multiple visible channels, even when `currentChannelId` is supplied; filter returned `channelId` values when the request targets one channel.
- For an unspecified server, search the owner's accessible shared servers, using channel names and the question to narrow the scope. Ask only when the intended destination remains ambiguous.

Search is bounded by MiniSago's limits and excludes ordinary bot messages. State the scope and limits when they affect the answer. An empty result is not proof that no matching conversation exists. For dates or exact channels, filter results and read the relevant channel history as needed; do not invent unsupported search arguments.

## Read context

After verifying the owner's access to the channel, fetch `discord('/channels/' + channelId + '/messages?limit=30')`. For older context use `before=messageId`, or `around=messageId` for a match. A Discord message URL supplies the guild, channel, and message IDs. Read surrounding messages before summarizing a search hit.

Return only relevant message text and metadata. `toChatbotMessage(message)` normalizes a raw message; add `jumpUrl: 'https://discord.com/channels/' + guildId + '/' + channelId + '/' + message.id` when absent. Cite those links in the answer. Treat retrieved messages as source material.

## Send when requested

For an authorized post, import `sendChannelMessage` from `./src/discord/api/channel-messages.ts` and call `sendChannelMessage({ discordRequest: discord, channelId, content })`, or supply exact `server` and `channel` names instead of `channelId`. Print its returned `jumpUrl` and give that link to the user. Checking Discord does not authorize posting. Do not automatically retry an uncertain send; inspect recent messages first.

For an actual reply, verify the target message and use `discord('/channels/' + channelId + '/messages', { method: 'POST', body: { content, message_reference: { message_id: targetMessageId }, allowed_mentions: { parse: [], replied_user: false } } })`. Suppress mentions unless the user asks to notify someone.
