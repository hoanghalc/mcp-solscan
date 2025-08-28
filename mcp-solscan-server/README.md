
# mcp-solscan-server

An **MCP (Model Context Protocol)** server that exposes **Solscan Pro API v2** endpoints as typed tools.
- Works over **stdio** (Claude Desktop, etc.).
- Lets the user set the **Solscan API key** at runtime via a `set_api_key` tool or via `SOLSCAN_API_KEY` env.
- Implements common **Account** endpoints and CSV export helpers.

> OpenAPI reference for endpoints is provided by the user (Solscan Pro API v2).

## Quick start

```bash
pnpm i   # or npm i / yarn
cp .env.example .env   # put your key
pnpm dev                # stdio mode
```

### Environment
- `SOLSCAN_API_KEY` – your Pro API key
- `SOLSCAN_BASE` – override base URL if needed (default: https://pro-api.solscan.io/v2.0)

## Tools

- `set_api_key({ api_key })`
- `account_detail({ address })`
- `account_transfers({ ...filters })`
- `account_defi_activities({ ...filters })`
- `account_balance_change({ ...filters })`
- `account_transactions({ address, before?, limit? })`
- `account_portfolio({ address })`
- `account_token_accounts({ address, type: "token"|"nft", ... })`
- `account_reward_export({ address, time_from?, time_to? })`  → returns CSV as text
- `account_transfer_export({ ...filters })` → returns CSV as text

A test resource: `solscan://status`

## Claude Desktop

Add a custom MCP server pointing to the stdio command (e.g., `pnpm dev`). Then call tools by name.

## Remote MCP (OpenAI Agents / Responses API)

Host this service behind HTTPS and configure it as a **Remote MCP** tool with an Authorization header. You can keep the API key server-side, or pass it via tool call (`set_api_key`).

## Docker

```bash
docker build -t mcp-solscan-server .
docker run --rm -e SOLSCAN_API_KEY=... mcp-solscan-server
```
