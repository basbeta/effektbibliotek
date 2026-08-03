# CURRENT-STATE.md

> Updated at the end of every session. Read by Claude at startup.

## Current Phase
MIGRERING PÅGÅR — CR-008: porting fra Vercel/Neon til Hetzner/Coolify/PostgreSQL 18. Repo-siden er ferdig; manuelt Coolify-oppsett gjenstår.

## Current Objectives
Fullføre CR-008: produkteier utfører manuelle Coolify-steg i `docs/COOLIFY-DEPLOY.md` (database, app-ressurs, domene, env-vars, backup, Uptime Kuma). Vercel/Neon beholdes urørt som fallback til Coolify er verifisert.

## Current Branch
claude/effektbibliotek-publish-database-nsrizw

## Blockers
- Manuelt Coolify/Hetzner-oppsett kan ikke utføres fra Claude Code-økten (ingen tilgang til Coolify-instansen). Krever produkteier/admin på `coolify.basbeta.no`.
- Coolify er nå live på effektbibliotek.basbeta.no, men OTP-innlogging feilet (hang, ingen e-post sendt). CR-009 la til SMTP-timeout for å gjøre feilen synlig i stedet for hengende — MEN rotårsaken (mest sannsynlig manglende `BREVO_SMTP_LOGIN`/`BREVO_SMTP_KEY` i Coolify sine env-vars på app-ressursen, evt. utgående SMTP blokkert) er ikke bekreftet løst. Krever verifisering av produkteier i Coolify.

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

## Production URL
https://effektbibliotek.vercel.app (gammel, beholdes til Coolify er verifisert)
Planlagt ny: https://effektbibliotek.basbeta.no

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

## Validation Status
- Build (lokal, `npm run build`): ✓
- TypeScript: ✓ (ingen feil)
- Docker build: ikke testbart i denne økten (ingen Docker-daemon tilgjengelig i sandkassen) — bør verifiseres av produkteier eller i Coolify sin egen build
- Build (Vercel prod, gammel): ✓
- Deploy Coolify: ikke utført ennå — manuelt, se `docs/COOLIFY-DEPLOY.md`

## Next Recommended Actions
1. Verifiser i Coolify at `BREVO_SMTP_LOGIN`, `BREVO_SMTP_KEY` og `FROM_EMAIL` er satt som miljøvariabler på **app-ressursen** (ikke bare i `.env.example`) — mest sannsynlige årsak til at OTP-e-post ikke ble sendt
2. Verifiser at utgående SMTP (port 587 til smtp-relay.brevo.com) ikke er blokkert av Hetzner/serverens brannmur
3. Etter deploy av CR-009: be om engangskode på prod igjen — skal nå enten fungere, eller feile med en synlig feilmelding innen ~10s (ikke lenger henge)
4. Utføre resterende `docs/COOLIFY-DEPLOY.md`-steg (backup, Uptime Kuma) hvis ikke allerede gjort
5. Ende-til-ende-test på `effektbibliotek.basbeta.no`: innlogging, case-opprettelse, godkjenningsflyt
3. Opprett admin-bruker i den nye databasen (samme prosedyre som tidligere: første login + manuell `isAdmin`-sett)
4. Når Coolify-oppsettet er verifisert stabilt: fjern Vercel-prosjektet og slett Neon-databasen (ingen data å ta vare på)
5. Vurder om `docs_extracted.txt` skal gitignores (sensitiv prod-dokumentasjon) — uavhengig av denne migreringen
