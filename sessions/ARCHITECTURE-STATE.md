# ARCHITECTURE-STATE.md

> Describes current system architecture. Updated on every structural change.
> Read by Claude at session startup.

## Current Phase
CR-008 DONE (2026-08-05) — Repo portet til Docker/Coolify-oppsett, alle acceptance criteria oppfylt (backup + Uptime Kuma bekreftet av produkteier). Vercel/Neon klarert for full fjerning, gjenstår kun selve utførelsen i deres respektive dashboards av produkteier.

## Stack
| Lag | Valg |
|---|---|
| Rammeverk | Next.js 16 (App Router) |
| Språk | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| ORM | Prisma 7 (driver adapter, `@prisma/adapter-pg`) |
| Database | PostgreSQL 18, selvhostet på Hetzner via Coolify |
| Auth | Custom OTP + iron-session |
| E-post | Brevo SMTP |
| Deploy | Coolify (Hetzner CX23), Dockerfile build pack, domene `effektbibliotek.basbeta.no` |

## Module Map
Ingen moduler implementert ennå. Planlagt struktur:

```
app/                        # Next.js App Router
  (auth)/
    login/
    verify/
  (app)/
    bibliotek/
    case/
      ny/
      [id]/
      [id]/rediger/
    mine-caser/
    oppfolging/
    admin/
  godkjenning/
    [caseId]/
      [token]/

lib/
  auth.ts                   # OTP-logikk, session
  email.ts                  # Nodemailer/Brevo-adapter (isolert)
  prisma.ts                 # Prisma-klient singleton
  case-validation.ts        # Status/missing-info-logikk
  usage-approval.ts         # Bruksgodkjenning-logikk

prisma/
  schema.prisma             # Datamodell
  migrations/

components/
  ui/                       # shadcn-komponenter
  cases/                    # Case-spesifikke komponenter
  approval/                 # Bruksgodkjenning-komponenter
```

## Dependency Rules
```
app/ (route handlers) → lib/ → prisma/
lib/ har ingen avhengighet til app/
components/ kan bruke lib/ via server actions eller API
```

Ingen sirkulære avhengigheter. Ingen direkte kryss-modul-tilgang.

## Key Architectural Decisions
- Public route `/godkjenning/:caseId/:token` bruker egen shell — ingen intern navigasjon
- E-postkall isolert i `lib/email.ts` for enkel provider-bytte
- OTP lagres hashet i database, aldri i klartekst
- Bruksgodkjenning-historikk er append-only, aldri overskriv. **Unntak (CR-025, 2026-08-04):** full sletting av selve casen (eier- eller admin-initiert, via eksplisitt bekreftelsesdialog) cascade-sletter også dens `UsageApproval`- og `CaseLink`-historikk. Dette er det ene, bevisst valgte unntaket fra append-only-prinsippet — historikk overskrives eller endres aldri stille, men kan fjernes i sin helhet sammen med casen den tilhører, med eksport tilgjengelig som sikkerhetsnett rett før sletting

## External Dependencies
- PostgreSQL 18 (Coolify/Hetzner) — connection string i `DATABASE_URL`
- Brevo SMTP — `BREVO_SMTP_LOGIN` / `BREVO_SMTP_KEY`
- Coolify (Hetzner CX23) — deployment, Dockerfile build pack
- ~~Gammel Vercel/Neon-produksjon står urørt som fallback~~ — Klarert for full fjerning av produkteier 2026-08-05 (se CR-008)

## Last Structural Change
2026-08-05 — CR-008 avsluttet: alle acceptance criteria oppfylt, Vercel/Neon klarert for fjerning. Ubrukt `resend`-avhengighet fjernet fra `package.json`. Ingen strukturell kodeendring utover dette.

2026-08-05 — CR-028: Avhengighetsoppgradering (ISSUE-012), ingen strukturell endring. `next` 16.2.6→16.3.0, `nodemailer` ^8.0.7→^9.0.4. `npm audit` 0 sårbarheter. Pushet og bekreftet i produksjon.

2026-08-04 — CR-025: Case-sletting, eksport og eier-initiert eierbytte. `onDelete: Cascade` lagt til på `UsageApproval.case` og `CaseLink.case` (ny migrering `20260804130000_case_cascade_delete`, generert statisk uten live DB). Ny `DELETE /api/cases/[id]` (eier eller admin) og `GET /api/cases/[id]/export`. `/api/admin/users/list` åpnet for alle innloggede brukere. Se append-only-unntaket over.

2026-08-04 — CR-024: Innførte formelle Prisma-migreringer. `prisma/migrations/20260804120000_init` er baseline-migreringen (reflekterer skjema slik det var etter CR-023). Dockerfile CMD byttet fra `prisma db push --accept-data-loss` til `prisma migrate deploy`, rullet ut i to atskilte deploys pga. autodeploy på master (se sessions/DECISIONS.md for full rekkefølge). Bekreftet vellykket i produksjon 2026-08-04 — se sessions/OPEN-ISSUES.md ISSUE-009 (Resolved).

2026-07-31 — CR-008: Dockerfile lagt til, e-post byttet fra Gmail SMTP til Brevo SMTP, `specs/nfr.md` oppdatert for Hetzner/Coolify/PostgreSQL 18. Faktisk deploy og domeneoppsett gjenstår manuelt.
