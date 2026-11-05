---
name: minisago-discord
description: Use MiniSago on Oracle for Discord work over SSH from this Mac. Trigger for requests to check Discord, find conversations, read messages, or post and reply.
---

# MiniSago Discord

Discord work is available through `ssh sago-cloud`, inside the running `sago-cloud-bot-core-bot-core-1` container at `/app`.

Discover current capabilities from the deployed source:

- `src/chatbot/mcp.ts`: tool names, descriptions, and input schemas.
- `src/chatbot/chatbot.ts`: handler wiring, requester identity, and permission checks; follow imports to the relevant implementation.
- `src/discord/features.ts`: feature registry.

Run the relevant helpers with a short TypeScript script on stdin:

```bash
ssh -o BatchMode=yes -o ConnectTimeout=10 sago-cloud \
  'docker exec -i -w /app sago-cloud-bot-core-bot-core-1 bun run -'
```

Use credentials in place inside the container and preserve the owner's permission checks. Post or reply only when requested, and return Discord message links. If the container name changes, discover it with `ssh sago-cloud 'docker ps --format "{{.Names}}"'`.
