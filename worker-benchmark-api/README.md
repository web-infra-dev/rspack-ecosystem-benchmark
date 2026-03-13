# Rspack Benchmark API (Cloudflare Worker)

Stores temporary PR benchmark data for the detail page to fetch via `?id=xxx`.

## Before you start

1. Install dependencies: `pnpm install`
2. Log in to Cloudflare: `npx wrangler login`
3. Create a KV namespace: `npx wrangler kv namespace create BENCHMARK_STORE`
4. Put the printed `id` into `wrangler.toml` as `REPLACE_WITH_YOUR_KV_NAMESPACE_ID`

## Local development

```bash
pnpm dev
```

## Deploy

```bash
pnpm deploy
```

After deploy you get the Worker URL; use it in CI and on the detail page. Optionally set the Secret `AUTH_SECRET` for this Worker in the Cloudflare Dashboard to protect POST uploads.
