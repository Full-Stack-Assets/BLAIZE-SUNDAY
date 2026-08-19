# 02 Product

Differentiator: deterministic control plane. Agents prepare; humans authorize I4 actions. Payload-bound approvals. No LIVE without URL + confirmation ID.

Demo for acquirers (labeled test mode):

1. `pnpm docker:up && pnpm db:generate && pnpm db:migrate && pnpm db:seed && pnpm dev`
2. Set `APPROVAL_API_TOKEN` and save it in Settings
3. Press **CREATE NEXT RELEASE**
4. Inspect `/projects`, `/pipeline`, `/releases`

Tenancy: schema is artist-scoped (`Artist` → projects/releases). A second artist must not share BLAIZE canon or voice rows.

Permission matrix: I0–I4 in `packages/policy` and role contracts in `packages/agents/src/registry.ts`.
