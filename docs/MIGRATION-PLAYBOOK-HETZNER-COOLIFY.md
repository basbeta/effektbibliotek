# Migration Playbook: Vercel/Neon-style → Hetzner/Coolify

> Distilled from the effektbibliotek migration (CR-008 through CR-030). Every
> item below traces back to a real incident, near-miss, or piece of debugging
> that cost real time or caused real downtime during that migration — not
> hypothetical risk. Copy this file into the new project's repo and adapt it;
> delete sections that don't apply.
>
> The core theme: a serverless platform (Vercel) quietly absorbs a set of
> infrastructure concerns for you — enforced function timeouts, correct
> `Host`/origin headers, predictable build-vs-runtime env var handling. Moving
> to self-hosted Docker/Coolify removes every one of those guardrails at once.
> Most incidents below are a variant of "a thing Vercel used to catch for us
> is now our problem."

---

## 0. Before you start: decisions to make explicitly

- **Full cutover or parallel run?** Effektbibliotek did a full migration (not
  parallel), keeping the old platform untouched and running as a fallback
  until the new one was verified stable over several days/weeks of real
  usage. Decide this up front — it determines your rollback strategy (see §7).
- **Data migration or fresh start?** If the old database's data is
  disposable (true for effektbibliotek's beta data), a fresh database is far
  lower-risk than a `pg_dump`/restore. If the data is NOT disposable, this
  playbook does not cover that path in depth — treat it as its own
  workstream with its own downtime window, validation pass, and rollback
  plan, separate from the infra/deploy work below.
- **Local build parity, before writing any migration code.** Get the same
  Node (or other runtime) version as the target Docker image installed and
  runnable locally, so every change can be `npm run build`/typecheck-verified
  before it's pushed. Effektbibliotek's first migration sessions had no local
  Node available at all — every change was "visually verified" only, and at
  least two production crash-loops traced directly back to mistakes
  (an invalid CLI flag) that a local build would have caught in seconds.

---

## 1. Infrastructure setup (Coolify side)

- **Build Pack: Dockerfile, not Nixpacks.** Nixpacks auto-detection has been
  a known source of surprises in Coolify deploys for this kind of app —
  prefer an explicit Dockerfile you control.
- **Set the FQDN/domain in Coolify *before* wiring up the GitHub App/webhook.**
  If the webhook gets configured first, it can end up pointing at a raw
  IP:port instead of `https://coolify.<yourdomain>`, which then gets silently
  blocked by the firewall (only 22/80/443 open). Order matters here.
- **Database:** provision fresh, don't try to reuse the exact instance
  config from the old provider. Confirm the Postgres major version
  explicitly — don't assume it matches the old host.
- **Backups:** enable daily `pg_dump` → object storage under the resource's
  **Backups** tab, and click **"Backup Now"** once to confirm a file actually
  lands in the bucket. Don't treat "I enabled the toggle" as equivalent to
  "backup confirmed working."
- **Uptime monitoring:** add the new domain to your uptime tool (Uptime Kuma
  or equivalent) as part of initial setup, not as a follow-up — it's easy to
  forget once the app is visibly working.
- **Object storage (if used, e.g. for file uploads):** if using an
  S3-compatible provider like Hetzner Object Storage, and the provider's
  panel shows Endpoint and Bucket as *separate* fields (not
  `bucket.endpoint`), that means path-style addressing — you need
  `forcePathStyle: true` in the S3 client config, or every request will fail.
  If reusing an existing shared bucket (e.g. one also used for DB backups),
  namespace your objects under a dedicated key prefix and confirm any
  retention/lifecycle policy on the bucket is scoped to the *other* prefix,
  not bucket-wide — otherwise your files can get silently deleted by an
  unrelated retention job.

---

## 2. Code changes required when leaving a serverless platform

These are not optional hardening — each one caused a real incident when
skipped.

### 2.1 Add explicit timeouts to every external I/O call

On Vercel, a hung request eventually gets killed by the platform's function
timeout, so a missing timeout on (say) an SMTP client was invisible. Once
you're on a long-running container, a hung external call hangs **forever**,
and the failure mode is "the UI just spins," not a clean error.

Audit and fix, for every external call the app makes:
- Email transport (SMTP client: connection/greeting/socket timeout)
- Database connection pool (e.g. `pg.Pool`'s `connectionTimeoutMillis`
  defaults to `0` = no timeout — this bit us at a *different* layer than the
  SMTP timeout, same underlying bug class, one layer further up the request)
- Any other outbound HTTP/API call the app makes synchronously in a request path

### 2.2 Guarantee every API route returns valid JSON on error

If a frontend does `res.json()` without handling a parse failure, and a
backend route throws without a `try/catch`, the resulting non-JSON (or
connection-reset) response can make the UI hang indefinitely instead of
showing an error — which looks identical to the timeout problem in §2.1 and
will send you debugging the wrong thing. Add `try/catch` with a guaranteed
JSON error body to every route before going live, not after the first
confusing hang report comes in.

### 2.3 Don't trust `request.url.origin` / Host header in API routes behind a reverse proxy

Behind Coolify/Traefik, `request.url.origin` (or equivalent request-derived
origin) in a route handler can resolve to `localhost:<port>` instead of the
real public domain, even though your middleware/edge layer sees the correct
host. Use an explicit environment variable for the app's public base URL
instead of deriving it from the request, in any server-side code that builds
absolute URLs (email links, callback URLs, etc).

### 2.4 Get the build-time vs runtime env var distinction right

Frameworks that support a "public" env var prefix (e.g. Next.js's
`NEXT_PUBLIC_*`) bake that value into the compiled bundle **at build time**,
even when the reference is in server-only code. Two ways this bites you:

- If the variable isn't available during the actual Docker build step (only
  marked available at "Runtime" in your PaaS panel, not "Buildtime"), it
  compiles in as permanently `undefined` — no runtime env change afterward
  will ever fix it, because the value is never read dynamically again.
- Using the "public" prefix for a value that's only ever needed server-side
  is simply the wrong tool — it exposes the value to the client bundle for
  no reason and creates exactly this build-vs-runtime confusion. Reserve the
  public-prefixed vars strictly for values that genuinely need to reach
  browser JS (e.g. a client-side error-tracking DSN); use a plain,
  non-prefixed var for anything server-only.

### 2.5 Set an explicit timezone anywhere you format dates for humans

Containers default to UTC unless you set `TZ` (or pass an explicit timezone
per call). Any `toLocaleString`/`toLocaleDateString`/`Intl.DateTimeFormat`
call that uses a locale (e.g. `nb-NO`) but not an explicit `timeZone` will
happily format the *wrong* instant in the *right-looking* locale style —
producing plausible-looking but incorrect timestamps in emails, exports, and
UI. This is easy to miss because it "looks right" at a glance and only shows
up as a 1–2 hour discrepancy (DST-dependent) that's easy to dismiss as a
fluke. Grep for every locale-formatting call site and add an explicit
`timeZone` to each one — don't rely on a container-level `TZ` env var alone,
since that's an implicit environmental assumption that silently breaks again
if the app ever runs somewhere else.

### 2.6 Never write SQL/migration files with a tool that injects a UTF-8 BOM

If you generate migration SQL on Windows (e.g. PowerShell's
`Out-File -Encoding utf8`), you get a BOM at the start of the file. Postgres
rejects that entire migration file with a syntax error at position 0 the
first time something actually *executes* it (not just reads/diffs it) — and
if that happens inside a container's startup command, it crash-loops the
container until your PaaS hits its restart limit and stops it entirely,
which typically requires a manual "redeploy" click to recover, not just
another push. Generate SQL files with an explicit BOM-free write instead
(e.g. `[System.IO.File]::WriteAllText(path, content, new
System.Text.UTF8Encoding($false))` on Windows), or generate them from a
Linux/WSL environment.

---

## 3. Schema/migration strategy

- If the old project never had formal migration files (i.e. it always used a
  declarative "push schema" tool), **don't** just flip the container's
  startup command straight to a migration-based deploy command — it will
  either be a silent no-op against an already-populated database, or worse,
  try to (re)create tables that already exist and crash-loop.
- If you're introducing formal migrations for the first time against an
  already-live database: generate a baseline migration that matches the
  *current* schema exactly, then mark it as already-applied against
  production **without running its SQL** (most migration tools have an
  explicit "resolve as applied, don't execute" command for exactly this).
- **If your PaaS autodeploys on every push to your main branch, there is no
  time window to run a manual step "right before" a deploy** — push and
  deploy happen atomically. Split any migration-adoption process into at
  least two independent commits/deploys with the manual resolve-step
  happening *between* them:
  1. **Deploy A:** ship the migration files only; container startup command
     is unchanged (still the old declarative push, or whatever it was
     before). This is safe to autodeploy immediately.
  2. **Manual step**, after Deploy A is live: mark the baseline migration as
     applied against the real production database via a shell/terminal
     into the running container.
  3. **Deploy B** (separate, later commit): switch the startup command to
     the migration-based deploy command.
- Once you're on formal migrations, **check each new migration's actual
  database state individually** before resolving it, rather than assuming
  uniform treatment. A migration whose SQL was already applied via the old
  declarative mechanism (because that mechanism kept running in parallel
  while migration files were being generated) needs to be marked
  "applied without executing," not "rolled back / never applied" — those are
  semantically different commands and picking the wrong one either fails
  immediately or (worse) causes a "table already exists" crash-loop on the
  next deploy. Don't assume every pending migration is in the same state;
  verify each one.

---

## 4. Observability

- Set up error tracking (Sentry-compatible or otherwise) **before** cutover,
  and verify it end-to-end with one deliberate test error before trusting it
  — don't assume "the SDK is installed and the DSN is set" is equivalent to
  "events actually arrive."
- If your error-tracking host redirects HTTP→HTTPS, make sure the DSN itself
  uses `https://`. Many error-tracking SDK transports do **not** follow
  redirects, so an `http://` DSN against a redirecting host fails silently —
  the SDK reports success, nothing shows up in the dashboard, and the only
  visible clue is a debug-log-only redirect status code if you happen to
  turn on verbose/debug mode.
- When something "should obviously work" but doesn't, turn on the SDK/tool's
  debug logging and read the actual log output before forming a new
  hypothesis. Guessing at root causes when logs are obtainable wastes more
  time than it saves — this was the single biggest time-cost pattern across
  the whole migration.
- Know where your PaaS's *actual runtime/container* logs live, as distinct
  from its *deployment/build/rollout* log. The deployment log tells you the
  build succeeded and the rollout started; it won't show you a runtime crash
  loop's stdout. If a container crash-loops past its restart limit, it can
  fully exit and its logs can become hard to reach after the fact — capture
  logs live if you suspect trouble, don't wait to look afterward.

---

## 5. Rollback strategy

- Don't decommission the old platform on day one. Keep it running, fully
  untouched, as a fallback — the rollback lever is "point DNS/users back at
  the old URL," which requires zero code reversion as long as your changes
  were additive (new Dockerfile/config, not a removal of old-platform
  compatibility).
- Only schedule actual teardown (old project deletion, old database
  deletion) after the new platform has been stable under real usage for a
  meaningful stretch of time (days, not hours) and you've explicitly gotten
  a decommission green light — this is a deliberate, separate decision point,
  not an automatic follow-up to "the deploy succeeded."

---

## 6. Post-migration hygiene

- Run a dependency audit (`npm audit` or equivalent) once things are stable,
  but treat any fix that requires a major-version bump as its own reviewed
  change, not something to bundle blindly into a routine audit-fix pass.
  Before running the forced/breaking fix: look up the specific breaking
  changes for the exact packages involved and check them against how *your*
  code actually uses those packages — a package's documented breaking change
  (e.g. a new default for an option you never touch) may simply not apply to
  your usage, which is the difference between "safe to upgrade now" and
  "needs a dedicated migration."
- Remove any now-unused dependency that was only kept during the migration
  for expediency (e.g. an old provider's SDK left in `package.json` because
  removing it was inconvenient mid-migration) — don't let it linger
  indefinitely as unreviewed tech debt.
- If the project's README or other docs still contain the old platform's
  default/boilerplate deploy instructions, correct them as part of closing
  out the migration — stale deploy docs actively mislead the next person.

---

## 7. Testing reality check

If the project has no automated test suite, say so explicitly rather than
implying more confidence than the verification actually supports. Realistic
verification for this kind of migration, absent automated tests, is: a clean
local build + typecheck before every push, plus a manual smoke test of the
critical paths (auth/login, the core create/read/update flow, any outbound
email) after every deploy that touches infrastructure or dependencies. Treat
"build succeeded" and "feature confirmed working in production" as two
separate, both-required checkboxes — a green build only proves the code
compiles, not that the feature behaves correctly at runtime.
