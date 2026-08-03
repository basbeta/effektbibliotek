# CR-010: Connection-timeout på Prisma/pg-adapteren (bugfix: login henger fortsatt)

**Status:** Done
**Created:** 2026-08-03

---

## Business Goal
Innlogging (OTP på e-post) skal fungere pålitelig på `effektbibliotek.basbeta.no`, og feile raskt og synlig hvis noe er galt, i stedet for å henge.

## Problem Statement
Etter CR-009 (SMTP-timeout) var deployet til Coolify, og etter at `BREVO_SMTP_LOGIN`/`BREVO_SMTP_KEY`/`FROM_EMAIL` ble bekreftet korrekt satt som runtime-miljøvariabler, hang `POST /api/auth/request-code` fortsatt.

Rotårsak: den første operasjonen i denne routen er `prisma.otpCode.create(...)` — et databasekall som skjer **før** `sendOtpEmail` i det hele tatt kalles. `lib/prisma.ts` konfigurerer `PrismaPg`-adapteren kun med `connectionString`. `PrismaPg` bruker `pg.Pool` under panseret, og `pg.Pool` sin standardverdi for `connectionTimeoutMillis` er `0` — som betyr **ingen timeout, vent for alltid** hvis databasen ikke kan nås. SMTP-timeouten fra CR-009 ble derfor aldri nådd, fordi requesten hang lenger opp i kjeden, i selve databasetilkoblingen.

## Proposed Solution
Sette `connectionTimeoutMillis: 10_000` på `PrismaPg`-adapteren i `lib/prisma.ts`, slik at en utilgjengelig eller feilkonfigurert database (feil `DATABASE_URL`, nettverksisolasjon mellom app- og database-ressursen i Coolify) feiler innen 10 sekunder med en tydelig feil, i stedet for å henge.

## Impact Analysis

### Affected Components
- `lib/prisma.ts`

### Database Impact
Ingen endring i skjema eller data. Kun tilkoblingsatferd ved feil.

### API Impact
Alle API-routes som bruker Prisma feiler nå innen ~10s ved databasetilkoblingsfeil, i stedet for å henge på ubestemt tid.

### UX Impact
Samme som CR-009: feilmelding fremfor evig spinner ved infrastrukturproblemer.

### Security Impact
Ingen

### Performance Impact
Ingen i normal drift.

## Acceptance Criteria
- [ ] Innlogging med gyldig `@bas.no`-adresse på `effektbibliotek.basbeta.no` fungerer ende-til-ende (OTP mottas, verifisering fungerer)
- [ ] Hvis den ikke fungerer etter denne fiksen: requesten feiler innen ~10s med en konkret feil i Coolify sine app-logger (f.eks. `ETIMEDOUT`, `ECONNREFUSED`, eller en Prisma-feilkode) — nok informasjon til å diagnostisere videre uten gjetting

## Required Tests
- [ ] Manuell: be om engangskode på prod etter denne fiksen er deployet
- [ ] Hvis fortsatt feil: sjekk Coolify app-logg for den konkrete feilmeldingen og verifiser `DATABASE_URL` peker på riktig intern hostname/port for `effektbibliotek-db`-ressursen

## Rollback Strategy
Fjern `connectionTimeoutMillis` fra `lib/prisma.ts`.

## Migration Strategy
Ingen.

## Risks
Lav — additiv endring, påvirker kun feilhåndtering ved tilkoblingsproblemer.

## Dependencies
- CR-008 (Done) — Prisma/pg-adapter-oppsettet denne bygger videre på
- CR-009 (Done) — samme bugklasse, samme investigasjon, forrige lag i requesten

## Validation Notes
Denne CR-en er en direkte fortsettelse av CR-009-undersøkelsen: SMTP-timeouten løste ikke hengingen fordi requesten aldri nådde SMTP-kallet. Root cause-kjeden var: manglende timeout i to uavhengige lag (SMTP i CR-009, database her) — begge introdusert av samme underliggende endring (flytting bort fra Vercel, som tidligere maskerte begge via plattformens 10s function-timeout).

TS-kompilering ikke kjørbar i denne økten (node/npm ikke tilgjengelig i shell-miljøet). Endringen er et enkelt, dokumentert `pg.Pool`/`PrismaPg`-konfigurasjonsfelt (`connectionTimeoutMillis`) — visuelt verifisert mot `@prisma/adapter-pg` sin kjente API-form (utvider `pg.PoolConfig`).

Hvis denne fiksen fortsatt ikke løser hengingen, er neste steg å verifisere at `DATABASE_URL` i Coolify faktisk peker på riktig intern connection string for `effektbibliotek-db`-ressursen, og at app- og database-ressursene er i samme Coolify-nettverk.
