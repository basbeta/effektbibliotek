# CR-008: Port fra Vercel/Neon til Hetzner/Coolify/PostgreSQL 18

**Status:** In Progress
**Created:** 2026-07-31

---

## Business Goal
Effektbiblioteket skal driftes på Bas' egen europeiske, GDPR-compliant beta-infrastruktur (basbeta.no) i stedet for Vercel/Neon, i tråd med organisasjonens vedtatte infrastrukturstrategi for beta-prosjekter.

## Problem Statement
Appen kjører i dag i produksjon på Vercel (Hobby) med Neon som database og Gmail SMTP for e-post. Dette er isolert fra basbeta-infrastrukturen (Hetzner + Coolify) som er bygget for nettopp denne typen prosjekter, med egen backup, overvåking og GDPR-oppsett.

## Proposed Solution
Full migrering, ikke parallelldrift:
1. **Deploy:** Vercel → Coolify (Hetzner-server), Build Pack = Dockerfile, subdomene `effektbibliotek.basbeta.no`
2. **Database:** Neon → PostgreSQL 18 selvhostet via Coolify. Fresh database — ingen data fra eksisterende Neon-instans migreres (bekreftet av produkteier: ingenting i eksisterende data er viktig)
3. **E-post:** Gmail SMTP → Brevo SMTP, avsender `effektbibliotek@basbeta.no` (per-prosjekt-avsender, i tråd med basbeta-konvensjon)
4. **Backup:** daglig `pg_dump` → Hetzner Object Storage via Coolify (samme mønster som andre basbeta-prosjekter)

## Impact Analysis

### Affected Specs
- [x] specs/nfr.md — tech stack, migreringsplan, availability, CI/CD, constraints oppdatert

### Affected Components
- `Dockerfile`, `.dockerignore` (nye)
- `lib/email.ts` — Brevo SMTP i stedet for Gmail SMTP
- `package.json` — fjernet ubrukt `resend`-avhengighet
- `.env.example` (ny)
- `specs/nfr.md`

### Database Impact
Ny PostgreSQL 18-database opprettes i Coolify. `prisma migrate deploy` kjøres mot denne ved hver container-oppstart (idempotent). Ingen data migreres fra Neon.

### API Impact
Ingen endring i API-kontrakter. Kun infrastruktur/transport-lag.

### UX Impact
Nytt domene: `effektbibliotek.basbeta.no` i stedet for `effektbibliotek.vercel.app`. Brukere må bruke ny lenke.

### Security Impact
- TLS håndteres av Coolify/Traefik bak Hetzner-brannmuren (kun 22/80/443 åpne)
- Godkjenningslenker bruker fortsatt `request.url.origin` — fungerer automatisk med nytt domene, ingen kodeendring nødvendig
- Brevo SMTP-nøkkel og `DATABASE_URL` settes kun som Coolify env-variabler, aldri committet

### Performance Impact
Dedikert Hetzner CX23-server i stedet for delt serverless — forventet stabil eller bedre ytelse, ingen cold start på database (i motsetning til Neon free tier, jf. ISSUE-004)

## Acceptance Criteria
- [ ] Repo bygger som Docker-image lokalt (`docker build .`)
- [ ] Coolify-app deployer fra `basbeta/effektbibliotek` med Dockerfile build pack
- [ ] Ny PostgreSQL 18-ressurs i Coolify, `prisma migrate deploy` kjører uten feil
- [ ] `effektbibliotek.basbeta.no` løser og serverer appen over HTTPS
- [ ] Innlogging (OTP via Brevo), case-opprettelse og godkjenningsflyt fungerer ende-til-ende på nytt domene
- [ ] Daglig backup av ny database bekreftet aktiv
- [ ] `effektbibliotek.basbeta.no` lagt til i Uptime Kuma

## Required Tests
- [ ] Manuell: OTP-innlogging ende-til-ende med Brevo
- [ ] Manuell: opprett case → bruksgodkjenning → bekreftelses-e-post
- [ ] Manuell: verifiser `pg_dump`-backup dukker opp i `basbeta-backup`-bucketen

## Rollback Strategy
Vercel-deployet og Neon-databasen berøres ikke av denne migreringen og kan stå urørt som fallback inntil Coolify-oppsettet er verifisert. Full rollback = fortsett å peke DNS/brukere til Vercel-URLen; ingen kodereversering nødvendig siden endringene er additive (Dockerfile, ny env-konfig) og ikke fjerner Vercel-kompatibilitet.

## Migration Strategy
Ingen datamigrasjon — fresh database. Eksisterende Neon-data anses som forkastbart (beta-data uten produksjonsverdi).

## Risks
- Manuelt Coolify-oppsett (database, app, domene, env-vars, Brevo-DNS) kan ikke utføres fra denne sesjonen — krever at produkteier utfører stegene i Coolify-UI selv, jf. egen runbook
- `prisma migrate deploy` i container-CMD ved hver oppstart er enkelt og robust for dette skala-nivået, men bør revurderes hvis appen skalerer til flere samtidige instanser

## Dependencies
- basbeta-infrastruktur (Hetzner, Coolify, Brevo, DNS) må allerede være operativ — bekreftet i egen infra-dokumentasjon

## Validation Notes
Lokal `next build` og TypeScript-sjekk kjørt etter endringer. Faktisk Coolify-deploy, domeneoppsett og backup-verifisering må utføres manuelt av produkteier — se runbook levert sammen med denne CR-en.
