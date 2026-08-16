# Songforge OS Initial Repository Design

**Status:** Approved for specification by Nic on 2026-08-16  
**Repository:** `Full-Stack-Assets/BLAIZE-SUNDAY`  
**Product:** Songforge OS for BLAIZE SUNDAY  
**Release boundary:** Build and verify internal preparation workflows; do not publish, spend, transfer rights, or message externally without a payload-bound approval.

## 1. Product Contract

Songforge OS is the autonomous artist operating system for BLAIZE SUNDAY. Its primary command is **CREATE NEXT RELEASE**. The command must not require a title, prompt, lyric idea, genre, mood, artwork concept, campaign idea, or release plan from the user. Blank creative fields mean `AI_DECIDES`, while explicit overrides and locked canon remain authoritative.

The first repository release must prove one trustworthy vertical workflow:

1. create an idempotent release project;
2. derive strategy from the current canon and verified catalog facts;
3. generate a structured concept and original lyric candidate;
4. prepare composition, voice, audio, visual, metadata, rights, campaign, and distribution work packets;
5. run policy and quality gates;
6. stop at the external-action approval boundary;
7. expose the complete evidence trail in the web interface.

An unavailable provider produces a visible `BLOCKED_CONFIGURATION` or `BLOCKED_PROVIDER` result. It must never produce a fabricated asset, fake platform URL, false success state, or misleading “active” badge.

## 2. Scope

### Included in the initial implementation

- Executable pnpm monorepo with Next.js web app, BullMQ worker, Prisma/PostgreSQL data layer, Redis queue, and S3-compatible object storage.
- BLAIZE canon v4 seed derived from the supplied canon.
- Deterministic workflow orchestrator with persisted workflow runs, steps, retries, decisions, approvals, budgets, and receipts.
- Bounded OpenAI Agents SDK creative runtime behind a provider interface.
- Persistent single-voice registry and ElevenLabs adapters with verified configuration status.
- Airtable, Google Drive, Supermetrics, YouTube, and distributor integration contracts that fail closed.
- Dynamic dashboard, project timeline, asset registry, integration health, approval queue, and verified revenue state.
- Unit, integration, contract, and UI smoke tests plus GitHub Actions verification.
- Docker Compose development environment and complete local run instructions.

### Excluded from the initial implementation

- Automatic public release, upload, distribution, posting, outreach, paid advertising, purchases, contracts, rights transfers, or account changes.
- Claims that a DSP, ElevenLabs marketplace, YouTube channel, Airtable base, Drive folder, or Supermetrics source is connected unless a current runtime check proves it.
- Forty-two independent model calls merely to mirror the role catalog.
- Celebrity imitation, living-artist soundalikes, or an unapproved replacement voice.
- Production deployment. Vercel and Render are not deployment targets.

## 3. Architecture Decision

The system uses a **deterministic control plane with bounded agentic capabilities**.

- The application orchestrator owns workflow state, dependency ordering, retries, budgets, policy, approvals, and receipts.
- OpenAI Agents SDK owns bounded creative reasoning tasks with structured outputs. It does not own authorization, state transitions, money, publishing, or external side effects.
- One manager agent is introduced first. Specialist agents become manager-invoked tools only when their instructions, output contract, or policy boundary is materially different. This follows the current OpenAI guidance to start with one clear agent and add specialists deliberately: <https://developers.openai.com/api/docs/guides/agents>.
- The 42-role catalog remains a registry of responsibilities and runbooks. A role becomes an executable agent only after it has a real implementation, validation contract, and necessary provider.
- `simulated` mode is test/demo-only and visibly labeled. Production mode never falls back silently to simulated output.

## 4. Monorepo Boundaries

```text
apps/
  web/                  Next.js UI and HTTP API
  worker/               BullMQ consumers and scheduled internal work
packages/
  agents/               role contracts, OpenAI runtime, orchestration
  canon/                versioned BLAIZE canon and validation
  database/             Prisma schema, client, migrations, seed
  integrations/         provider-neutral ports and connection health
  policy/               approvals, budgets, external-action gateway
  release/              release state machine and package validation
  shared/               schemas, errors, types, state mappings
  storage/              immutable object storage and content hashes
  voice/                canonical voice registry and consistency gates
tests/
  contract/             provider and API contract tests
  integration/          database, queue, and workflow tests
  smoke/                web and worker smoke tests
```

Each package exposes a public `src/index.ts`; consumers do not import another package’s private source paths.

## 5. Sources of Truth

| Concern | Canonical source | Projection or mirror |
| --- | --- | --- |
| Artist identity and canon | PostgreSQL versioned canon | Drive documents, UI |
| Project/workflow state | PostgreSQL | Airtable, UI |
| Binary media | S3-compatible immutable storage | Optional Drive mirror |
| Rights and provenance | PostgreSQL plus immutable manifests | Airtable, Drive package |
| Approvals | PostgreSQL payload-bound approval record | Airtable Exceptions, UI |
| Analytics and revenue | Source-specific verified events | PostgreSQL snapshots, Airtable |
| External publication state | Provider receipt and verified URL | PostgreSQL, UI |

The existing **Aetheria Audio IP Control Center** Airtable base is a suitable optional projection because it already contains Assets, Rights & Consent, Production Jobs, Releases, Revenue, Campaigns, and Exceptions. Songforge does not treat Airtable as the transactional source of truth.

The existing Drive Songforge folder is a valid future archive target, but its identifier and credentials are runtime configuration and are not hard-coded into the public repository.

## 6. Workflow and State Model

The internal workflow retains detailed engineering states while projecting the approved portfolio status vocabulary.

| Internal states | Canonical portfolio status |
| --- | --- |
| `IDEA`, `STRATEGY` | `CONCEPT` |
| `WRITING` | `WRITING` |
| `PRODUCTION`, `VOCALS`, `MIXING`, `MASTERING` | `DEMO` |
| `SELECTED` | `SELECTED` |
| `QA`, `ASSET_GENERATION`, `METADATA` | `QA` |
| `DISTRIBUTION_READY`, `APPROVAL`, `SCHEDULED` | `RELEASE_READY` |
| `RELEASED`, `MONETIZING`, `ANALYZED` | `PUBLISHED` |
| `ARCHIVED` | `ARCHIVED` |

`FAILED` and blocked conditions are workflow outcomes, not portfolio statuses. A failed project retains its last valid portfolio status and opens an exception with evidence.

### Create-next-release execution

1. `POST /api/artists/blaize/create-next-release` validates autonomy controls, concurrency, and budget.
2. The API requires or generates an idempotency key, creates one project and workflow record, enqueues work, and returns HTTP 202 with stable identifiers.
3. The worker performs discovery, strategy, concept, lyrics, composition planning, provider preparation, media planning, release packaging, campaign planning, and final gates.
4. Each step records inputs, content hashes, output schema version, provider/model identity, cost, rationale, confidence, validation evidence, and next handoff.
5. A failed prerequisite blocks dependents. Retry exhaustion opens an exception and cannot be reported as a successful DAG.
6. The final internal outcome is `RELEASE_READY` only when required assets, metadata, provenance, rights warnings, and QA evidence are complete.
7. Distributor submission remains `AWAITING_AUTHORIZATION` until a payload-bound human approval is resolved.

## 7. Agent Runtime

The first real agent is a **Creative Release Planner** managed by the deterministic orchestrator. It receives the current canon, catalog summary, verified performance facts, creative overrides, and constraints. It returns versioned structured output for strategy, concept, lyric brief, and downstream work packets.

The runtime enforces:

- JSON-schema/Zod structured outputs;
- no user prompt requirement;
- no unsupported factual claims;
- no living-artist imitation instructions;
- canon and vocabulary constraints;
- prompt, model, provider, and source provenance;
- output validation before database state changes;
- explicit `BLOCKED_CONFIGURATION` when `OPENAI_API_KEY` is absent in live mode.

OpenAI tracing may record model and tool activity, but database records remain the operational audit source. Secrets and raw restricted data are excluded from prompts and traces.

## 8. Persistent Voice Contract

BLAIZE has exactly one active canonical voice profile. The registry stores a provider voice identifier, approved reference asset hashes, voice settings, pronunciation data, performance-mode presets, version history, and a measurable consistency threshold.

- A placeholder voice ID means `UNCONFIGURED`, never `ACTIVE`.
- Changing the canonical voice requires a canon-change approval.
- Spoken voice and sung voice capabilities are reported separately.
- If a provider cannot guarantee use of the canonical identity for singing, Songforge reports that limitation and does not label the output as BLAIZE’s approved persistent singing voice.
- Voice consistency validation uses a pluggable embedding/comparison provider. Until a real validator is configured, live output remains `UNVERIFIED`; a hard-coded score is prohibited.
- Failed consistency validation triggers regeneration within budget or a review exception.

## 9. Integration Contracts

Every integration implements `health()`, `capabilities()`, and the narrow provider operations it supports. Health states are `CONNECTED`, `DEGRADED`, `UNCONFIGURED`, `UNAUTHORIZED`, and `FAILED`.

### Airtable

- Optional one-way projection from PostgreSQL to the existing Aetheria tables.
- Writes are idempotent by Songforge record ID and store the last successful sync receipt.
- Airtable outages never corrupt canonical state.

### Google Drive

- Optional archive/mirror of approved asset packages and manifests.
- The application uses its own runtime OAuth configuration; ChatGPT connector authorization is not assumed to transfer to the deployed app.
- Drive and YouTube OAuth grants remain separate to avoid incompatible combined-scope flows.

### Supermetrics

- Read-only analytics ingestion for authenticated sources.
- Current YouTube and YouTube Public Data sources are treated as `UNAUTHORIZED` until authentication is verified.
- No campaign creation or update is part of the initial release.

### ElevenLabs

- Separate music-generation and text-to-speech capabilities.
- Runtime capability discovery and provider responses determine status.
- Audio responses are stored immutably with SHA-256, MIME type, duration, and generation provenance.
- Unsupported models or endpoints fail closed; model names are not assumed from the scaffold.

### YouTube and DSP distributors

- Adapters prepare validated submission packages.
- OAuth/token capability checks are independent per provider.
- Submission requires a resolved approval matching the immutable payload hash.
- A release cannot become `LIVE` without both a verified platform URL and external confirmation receipt.

## 10. Policy, Budget, and Approval Gateway

Internal reversible generation may run autonomously within configured limits. The following actions always require approval:

- publishing or distributor submission;
- public posting, comments, replies, or outreach;
- paid generation or advertising above the configured zero-cost budget;
- rights registration, licensing, contracts, or ownership claims;
- canonical voice or identity changes;
- sensitive account, credential, or sharing changes.

An approval records action type, exact payload hash, reason, requester, expiry, resolver, resolution, and execution receipt. Approval of one payload cannot authorize a modified payload. A monthly budget of `0` permits verified zero-cost internal work only; paid provider calls become blocked budget exceptions.

## 11. Data and Storage Requirements

The Prisma schema adds or strengthens:

- workflow and step records separate from individual agent runs;
- integration connections and health observations;
- immutable external-action requests and receipts;
- idempotency keys and unique constraints;
- approval payload hashes and expiration;
- explicit relations, indexes, deletion behavior, and decimal precision;
- asset provenance, license status, provider terms snapshot, and source hashes;
- budget reservations, actual cost events, and currency;
- canonical-to-internal state mapping.

Binary content is never stored in PostgreSQL. Originals are immutable. Derived assets point to their source assets and carry separate hashes and provenance.

## 12. HTTP and UI Contract

The web app exposes:

- `GET /api/health`
- `GET /api/integrations`
- `GET /api/artists/blaize/status`
- `POST /api/artists/blaize/create-next-release`
- `GET /api/projects`
- `GET /api/projects/:projectId`
- `GET /api/workflows/:workflowId`
- `GET /api/approvals`
- `POST /api/approvals/:approvalId/resolve`
- `GET /api/releases`
- persisted autonomous-control start, stop, and status endpoints

The dashboard reads real data. It shows current project state, workflow progress, provider health, verified voice status, pending approvals, verified revenue, recent decisions, and evidence links. The button queues work and displays the returned project rather than navigating to raw JSON. Static “active,” “running,” “ready,” or revenue claims are removed unless supported by current state.

## 13. Error and Recovery Rules

- Every error uses a stable code and a safe user message; secrets and provider response bodies are redacted.
- Retriable failures use bounded exponential backoff with jitter.
- Non-retriable policy, authorization, schema, and budget failures do not retry.
- Queue jobs use idempotent identifiers and database transactions to prevent duplicate projects.
- Deadlocked or dependency-blocked DAGs open an exception with the unresolved dependency set.
- Shutdown drains workers and returns unfinished jobs to the queue safely.
- Health reports distinguish infrastructure availability from provider authorization.

## 14. Verification Strategy

### Unit tests

- creative-field precedence;
- valid and invalid project/release transitions;
- canonical status mapping;
- payload-bound approvals and expiry;
- budget reservations;
- voice configuration and consistency outcomes;
- provider health normalization;
- content hashing and provenance.

### Integration tests

- Prisma schema, seed, and relations against PostgreSQL;
- API idempotency and HTTP 202 queue behavior;
- BullMQ workflow execution and retry exhaustion;
- blocked prerequisites preventing downstream execution;
- test-mode end-to-end release preparation;
- mocked OpenAI, ElevenLabs, Airtable, Drive, Supermetrics, YouTube, and distributor contracts;
- verified receipts required before `LIVE`.

### UI and smoke tests

- dashboard renders from API data;
- create-next-release queues once and exposes progress;
- unavailable integrations display truthful states;
- approval resolution cannot authorize a changed payload;
- production build and container health checks pass.

GitHub Actions runs formatting, linting, type checking, unit tests, integration tests with PostgreSQL and Redis, Prisma validation, production build, and secret scanning.

## 15. Acceptance Criteria

The initial repository implementation is complete when:

1. a clean checkout installs with the pinned pnpm version;
2. Docker Compose starts PostgreSQL, Redis, and S3-compatible storage;
3. Prisma generation, validation, migration, and seed complete;
4. all formatting, lint, typecheck, unit, integration, smoke, and build commands pass;
5. **CREATE NEXT RELEASE** creates exactly one queued project without creative input;
6. test mode completes a fully evidenced internal release-preparation workflow without claiming real media or publication;
7. live mode blocks clearly when credentials, authorization, budget, voice validation, rights evidence, or provider capabilities are missing;
8. no external action executes without a matching approval;
9. the UI displays real project, agent, provider, approval, and revenue state;
10. CI passes on the implementation branch and the change is delivered as a draft pull request for review.

## 16. Repository Bootstrap and Delivery

Because the target repository is empty, this design specification is the bootstrap commit on `main`. All implementation work will occur on `agent/songforge-os-initial` and will be submitted as a draft pull request. No deployment or merge is included without a separate explicit request.
