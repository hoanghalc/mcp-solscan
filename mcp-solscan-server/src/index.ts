
import { StdioServerTransport } from "@modelcontextprotocol/sdk/stdio";
import { Server } from "@modelcontextprotocol/sdk/server";
import { z } from "zod";
import { request } from "undici";

// ---------- Config ----------
const DEFAULT_BASE = process.env.SOLSCAN_BASE || "https://pro-api.solscan.io/v2.0";
type Ctx = { apiKey?: string; base: string };
const ctx: Ctx = {
  apiKey: process.env.SOLSCAN_API_KEY,
  base: DEFAULT_BASE,
};

// ---------- HTTP Helper ----------
async function solscanGET<T>(path: string, qs?: Record<string, any>, expect: "json"|"text"="json"): Promise<T|any> {
  if (!ctx.apiKey) throw new Error("Missing Solscan API key. Use set_api_key or SOLSCAN_API_KEY.");
  const url = new URL(path, ctx.base);
  if (qs) for (const [k,v] of Object.entries(qs)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) v.forEach(x => url.searchParams.append(k, String(x)));
    else url.searchParams.set(k, String(v));
  }
  const res = await request(url, { method: "GET", headers: { "accept": "application/json, text/csv", "token": ctx.apiKey } });
  if (res.statusCode >= 400) {
    const body = await res.body.text();
    throw new Error(`Solscan error ${res.statusCode}: ${body}`);
  }
  return expect === "text" ? await res.body.text() : await res.body.json();
}

// ---------- MCP server ----------
const transport = new StdioServerTransport();
const server = new Server({ name: "mcp-solscan", version: "0.1.0" }, { transport });

const ok = (data: any) => ({ content: [{ type: "json", json: data }] as const });
const text = (t: string) => ({ content: [{ type: "text", text: t }] as const });

// set_api_key
server.tool("set_api_key", {
  input: z.object({ api_key: z.string().min(10) }),
  description: "Set the Solscan Pro API key for this session/process.",
}, async ({ api_key }) => {
  ctx.apiKey = api_key;
  return text("✅ Solscan API key set.");
});

// account_detail
server.tool("account_detail", {
  input: z.object({ address: z.string() }),
  description: "Get the details of an account.",
}, async ({ address }) => ok(await solscanGET("/account/detail", { address })));

// account_transfers
server.tool("account_transfers", {
  input: z.object({
    address: z.string(),
    activity_type: z.array(z.enum(["ACTIVITY_SPL_TRANSFER","ACTIVITY_SPL_BURN","ACTIVITY_SPL_MINT","ACTIVITY_SPL_CREATE_ACCOUNT"])).optional(),
    token_account: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    token: z.string().optional(),
    amount: z.array(z.union([z.string(), z.number()])).max(2).optional(),
    from_time: z.number().optional(),
    to_time: z.number().optional(),
    exclude_amount_zero: z.boolean().optional(),
    flow: z.enum(["in","out"]).optional(),
    page: z.number().int().min(1).optional(),
    page_size: z.number().int().min(1).max(100).optional(),
    sort_by: z.literal("block_time").optional(),
    sort_order: z.enum(["asc","desc"]).optional(),
    value: z.array(z.union([z.string(), z.number()])).max(2).optional(),
    block_time: z.array(z.number()).max(2).optional()
  }),
  description: "Get transfer data of an account.",
}, async (input) => ok(await solscanGET("/account/transfer", input)));

// account_defi_activities
server.tool("account_defi_activities", {
  input: z.object({
    address: z.string(),
    activity_type: z.array(z.enum(["ACTIVITY_TOKEN_SWAP","ACTIVITY_AGG_TOKEN_SWAP","ACTIVITY_TOKEN_ADD_LIQ","ACTIVITY_TOKEN_REMOVE_LIQ","ACTIVITY_SPL_TOKEN_STAKE","ACTIVITY_SPL_TOKEN_UNSTAKE","ACTIVITY_SPL_TOKEN_WITHDRAW_STAKE","ACTIVITY_SPL_INIT_MINT"])).optional(),
    from: z.string().optional(),
    platform: z.array(z.string()).max(5).optional(),
    source: z.array(z.string()).max(5).optional(),
    token: z.string().optional(),
    from_time: z.number().optional(),
    to_time: z.number().optional(),
    page: z.number().int().min(1).optional(),
    page_size: z.number().int().min(1).max(100).optional(),
    sort_by: z.literal("block_time").optional(),
    sort_order: z.enum(["asc","desc"]).optional(),
    block_time: z.array(z.number()).max(2).optional(),
  }),
  description: "Get DeFi activities involving an account.",
}, async (input) => ok(await solscanGET("/account/defi/activities", input)));

// account_balance_change
server.tool("account_balance_change", {
  input: z.object({
    address: z.string(),
    token_account: z.string().optional(),
    token: z.string().optional(),
    from_time: z.number().optional(),
    to_time: z.number().optional(),
    page_size: z.number().int().min(1).max(100).optional(),
    page: z.number().int().min(1).optional(),
    remove_spam: z.enum(["true","false"]).optional(),
    amount: z.array(z.union([z.string(), z.number()])).max(2).optional(),
    flow: z.enum(["in","out"]).optional(),
    sort_by: z.literal("block_time").optional(),
    sort_order: z.enum(["asc","desc"]).optional(),
    block_time: z.array(z.number()).max(2).optional(),
  }),
  description: "Get balance change activities for an account.",
}, async (input) => ok(await solscanGET("/account/balance_change", input)));

// account_transactions
server.tool("account_transactions", {
  input: z.object({
    address: z.string(),
    before: z.string().optional(),
    limit: z.number().int().min(10).max(40).optional(),
  }),
  description: "Get the list of transactions of an account.",
}, async (input) => ok(await solscanGET("/account/transactions", input)));

// account_portfolio
server.tool("account_portfolio", {
  input: z.object({ address: z.string() }),
  description: "Get the portfolio for a given address.",
}, async ({ address }) => ok(await solscanGET("/account/portfolio", { address })));

// account_token_accounts
server.tool("account_token_accounts", {
  input: z.object({
    address: z.string(),
    type: z.enum(["token","nft"]),
    page: z.number().int().min(1).optional(),
    page_size: z.number().int().min(10).max(40).optional(),
    hide_zero: z.boolean().optional()
  }),
  description: "Get token accounts (or NFTs) of an account.",
}, async (input) => ok(await solscanGET("/account/token-accounts", input)));

// account_reward_export (CSV)
server.tool("account_reward_export", {
  input: z.object({
    address: z.string(),
    time_from: z.number().optional(),
    time_to: z.number().optional(),
  }),
  description: "Export staking rewards to CSV (as text).",
}, async (input) => {
  const csv = await solscanGET<string>("/account/reward/export", input, "text");
  return { content: [{ type: "text", text: csv }] };
});

// account_transfer_export (CSV)
server.tool("account_transfer_export", {
  input: z.object({
    address: z.string(),
    activity_type: z.array(z.enum(["ACTIVITY_SPL_TRANSFER","ACTIVITY_SPL_BURN","ACTIVITY_SPL_MINT","ACTIVITY_SPL_CREATE_ACCOUNT"])).optional(),
    token_account: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    token: z.string().optional(),
    amount: z.array(z.union([z.string(), z.number()])).max(2).optional(),
    from_time: z.number().optional(),
    to_time: z.number().optional(),
    exclude_amount_zero: z.boolean().optional(),
    flow: z.enum(["in","out"]).optional(),
    block_time: z.array(z.number()).max(2).optional(),
  }),
  description: "Export account transfers to CSV (as text).",
}, async (input) => {
  const csv = await solscanGET<string>("/account/transfer/export", input, "text");
  return { content: [{ type: "text", text: csv }] };
});

// simple resource
server.resource("solscan://status", async () => ({
  contents: [{ uri: "solscan://status", text: "Solscan MCP server is running." }]
}));

await server.connect();
