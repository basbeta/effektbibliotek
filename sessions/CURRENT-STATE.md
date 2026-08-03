# CURRENT-STATE.md

> Updated at the end of every session. Read by Claude at startup.

## Current Phase
MIGRERING NESTEN FERDIG — CR-008: porting fra Vercel/Neon til Hetzner/Coolify/PostgreSQL 18. Appen kjører stabilt på `effektbibliotek.basbeta.no`, innlogging er bekreftet fungerende i produksjon (CR-009/010/011). Gjenstår: backup/overvåking-steg og full ende-til-ende-test av resten av appen (case-opprettelse, godkjenningsflyt).

## Current Objectives
Fullføre resten av `docs/COOLIFY-DEPLOY.md` (backup, Uptime Kuma) og verifisere at case-opprettelse og bruksgodkjenningsflyten fungerer på den nye databasen, ikke bare innlogging. Deretter fjerne Vercel/Neon.

## Current Branch
claude/effektbibliotek-publish-database-nsrizw

## Blockers
Manuelt Coolify/Hetzner-oppsett kan ikke utføres fra Claude Code-økten (ingen tilgang til Coolify-instansen). Krever produkteier/admin på `coolify.basbeta.no`.

## Løst: OTP-innlogging hang (CR-009, CR-010, CR-011)
Etter CR-008-deploy hang OTP-innlogging. Feilsøkt over tre CR-er:
- CR-009: la til SMTP-timeout (reell forbedring, men ikke rotårsaken)
- CR-010: la til DB connection-timeout (reell forbedring, men ikke rotårsaken)
- CR-011: **faktisk rotårsak**, funnet via Coolify runtime-logger: den ferske Coolify-databasen hadde ingen tabeller (`prisma migrate deploy` fant ingen migreringsfiler å anvende, siden `prisma/migrations` aldri har eksistert i repoet — databasen ble alltid provisjonert med `db push`). I tillegg hadde `app/api/auth/request-code/route.ts` ingen try/catch, så den uhåndterte Prisma-feilen ga et 500-svar som ikke garantert var gyldig JSON — og `app/(auth)/login/page.tsx` sin `res.json()` uten feilhåndtering lot "Sender…"-knappen henge for alltid selv om serveren svarte på millisekunder.

Fikset: `Dockerfile` CMD byttet fra `prisma migrate deploy` til `prisma db push --skip-generate`; `request-code/route.ts` fikk try/catch med garantert JSON-feilsvar.

**OBS — to feilslåtte forsøk tok ned hele appen før den faktiske feilen ble funnet:**
1. `prisma db push --skip-generate` (commit 4440b2e) crash-looped containeren 10 ganger ("Exited, Stopped after reaching restart limit (10/10)").
2. Antok interaktiv bekreftelse uten TTY som årsak, la til `--accept-data-loss` (commit 697c2cc) — også feil gjetning, samme crash-loop.
3. **Faktisk feil, bekreftet fra container-logg:** `! unknown or unexpected option: --skip-generate` — denne Prisma CLI-versjonen godtar ikke det flagget på `db push`. Fjernet det. Endelig CMD: `npx prisma db push --accept-data-loss && npm run start`.

**CR-011 bekreftet løst:** Container kjører stabilt, produkteier logget inn på effektbibliotek.basbeta.no, mottok og verifiserte engangskode. Innlogging fungerer i produksjon.

## Active Change Requests
- CR-001 (Done) — Auth
- CR-002 (Done) — Case CRUD + Bibliotek
- CR-003 (Done) — Mine caser + Oppfølging
- CR-004 (Done) — Bruksgodkjenning (intern + kundevendt)
- CR-005 (Done) — Materiale/lenker
- CR-006 (Done) — Admin
- CR-007 (Done) — Redirect etter innlogging
- CR-008 (In Progress) — Port til Hetzner/Coolify/PostgreSQL 18
- CR-009 (Done) — SMTP-timeout på Brevo-transportøren (bugfix: OTP-innlogging hang)
- CR-010 (Done) — Connection-timeout på Prisma/pg-adapteren (bugfix, ikke rotårsak)
- CR-011 (Done) — Faktisk rotårsak: tomt databaseskjema (db push i stedet for migrate deploy) + manglende feilhåndtering i request-code-routen

## Production URL
https://effektbibliotek.basbeta.no — live, innlogging bekreftet fungerende
https://effektbibliotek.vercel.app (gammel, beholdes urørt inntil Coolify er fullt verifisert)

## Recently Modified Systems
- Dockerfile, .dockerignore — nye, for Coolify Dockerfile-build-pack
- lib/email.ts — Brevo SMTP i stedet for Gmail SMTP
- .env.example — nye env-variabler for Coolify/Postgres 18/Brevo
- specs/nfr.md — tech stack og driftsplan oppdatert for Hetzner/Coolify
- docs/COOLIFY-DEPLOY.md — ny runbook for manuelt Coolify-oppsett
- lib/usage-approval.ts — Godkjenningstekst oppdatert (starter med "[navn] har registrert casen...")
- app/api/cases/[id]/copy-approval-text/route.ts — Bruker nå request.url.origin (fikset port-bug)
- package.json — prisma generate lagt til i build-script for Vercel
- components/cases/ApprovalSection.tsx — Intern godkjenningsseksjon
- app/godkjenning/[caseId]/[token]/page.tsx — Offentlig kundevendt godkjenningsside
- app/godkjenning/[caseId]/[token]/ApprovalForm.tsx — Kundevendt skjema
- app/api/godkjenning/[caseId]/[token]/route.ts — Public API, e-postutsending
- app/api/cases/[id]/unlock-approval/route.ts — Gjenåpne godkjenning
- components/cases/LinksSection.tsx — Legg til/slett lenker på case-detalj
- app/api/cases/[id]/links/route.ts — POST ny lenke
- app/api/cases/[id]/links/[linkId]/route.ts — DELETE lenke
- app/(app)/admin/page.tsx — Admin-side (server)
- app/(app)/admin/AdminUsersClient.tsx — Brukertabell med isAdmin-toggle
- app/api/admin/users/route.ts — GET/PATCH brukere
- app/api/admin/users/list/route.ts — GET brukerliste for owner-dropdown
- components/cases/EditCaseForm.tsx — isAdmin: owner-change select
- components/layout/SideNav.tsx — Admin-lenke for admin-brukere
- proxy.ts — /api/godkjenning lagt til PUBLIC_PATHS

## Tech Stack Notes (oppdaget under implementering)
- Next.js 16.2.6 bruker `proxy.ts` ikke `middleware.ts`
- Prisma 7 krever driver adapter (`@prisma/adapter-pg`) — ingen URL i constructor
- Tailwind v4: tokens via `@theme inline {}` i CSS, ikke `tailwind.config.ts`
- Prisma client output: `app/generated/prisma/client.ts` (ikke `@prisma/client`)
- Next.js 16: `params` og `searchParams` i page/layout er Promises — må awaites
- Godkjenningslenke bruker alltid `new URL(request.url).origin` — ikke NEXT_PUBLIC_APP_URL
- `crypto.randomUUID().replace(/-/g, "")` brukes for token-generering (ingen @paralleldrive/cuid2)
- E-post sendes via Nodemailer + Brevo SMTP (byttet fra Gmail SMTP i CR-008), aldri Resend
- `Promise.allSettled()` for e-postutsending (feil i e-post stopper ikke godkjenning)
- `prisma generate && next build` i build-script — kjøres nå inne i Docker-imaget, ikke på Vercel
- Prisma 7 driver adapter er "engine-less" (ingen Rust query-engine-binær) — Dockerfile trenger ikke kopiere Prisma-engines separat
- `prisma migrate deploy` kjøres i container-`CMD` ved hver oppstart (idempotent) i stedet for som eget Coolify-hook
- Node 22 Alpine i Dockerfile for å matche faktisk utviklingsmiljø (avviker fra `basbeta-bootstrap`-malens Node 20)
- nodemailer-transportøren i lib/email.ts hadde ingen connection/socket-timeout — en feilkonfigurert eller nettverksmessig utilgjengelig SMTP-server hang requesten på ubestemt tid i stedet for å feile (CR-009)
- `pg.Pool` (brukt av `@prisma/adapter-pg`) sin default `connectionTimeoutMillis` er `0` — ingen timeout, venter for alltid ved utilgjengelig database. Satt eksplisitt til 10s i lib/prisma.ts (CR-010). Samme bugklasse som CR-009, bare ett lag lenger opp i requesten
- `prisma/migrations` har ALDRI eksistert i dette repoet — prosjektet har alltid brukt `prisma db push` for skjema, ikke formelle migreringer. `prisma migrate deploy` i Dockerfile CMD var derfor en stille no-op mot den ferske Coolify-databasen (CR-011)
- Uhåndterte feil i en Next.js Route Handler gir ikke garantert gyldig JSON-svar — hvis frontend gjør `res.json()` uten feilhåndtering, kan en rask serverfeil se ut som en evig hengende request i UI-et (CR-011)

## Validation Status
- Build (lokal, `npm run build`): ✓
- TypeScript: ✓ (ingen feil)
- Docker build: verifisert indirekte — bygger og kjører stabilt i Coolify (produkteiers egen build)
- Build (Vercel prod, gammel): ✓
- Deploy Coolify: ✓ live på effektbibliotek.basbeta.no, container kjører stabilt (ikke lenger crash-loop)
- Innlogging (OTP via Brevo) i produksjon: ✓ bekreftet av produkteier 2026-08-03

## Next Recommended Actions
1. Ende-til-ende-test på `effektbibliotek.basbeta.no` utover innlogging: case-opprettelse, redigering, bruksgodkjenningsflyt, bekreftelses-e-post
2. Opprett admin-bruker i den nye databasen (første login + manuell `isAdmin`-sett i Coolify sin database-ressurs)
3. Utføre resterende `docs/COOLIFY-DEPLOY.md`-steg (backup, Uptime Kuma) hvis ikke allerede gjort
4. Når Coolify-oppsettet er verifisert stabilt over noen dager: fjern Vercel-prosjektet og slett Neon-databasen (ingen data å ta vare på), marker CR-008 som Done
5. Vurder å innføre formelle `prisma migrate`-migreringer før effektbiblioteket har ekte produksjonsdata av verdi (se Risks i CR-011) — `db push` er greit for beta, men gir ingen reviewbar skjemahistorikk
6. Vurder om `docs_extracted.txt` skal gitignores (sensitiv prod-dokumentasjon) — uavhengig av denne migreringen
