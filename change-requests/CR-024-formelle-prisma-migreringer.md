# CR-024: Formelle Prisma-migreringer i stedet for db push

**Status:** Done
**Created:** 2026-08-04

---

## Business Goal
Redusere risikoen for utilsiktet datatap ved fremtidige skjemaendringer, nå som effektbiblioteket nærmer seg å ta imot ekte kundedata, ved å innføre en reviewbar, versjonert migreringshistorikk.

## Problem Statement
`prisma/migrations/` har aldri eksistert i dette repoet. All skjemastyring har skjedd via `prisma db push --accept-data-loss`, som ikke gir noen reviewbar historikk og som to ganger (CR-011, CR-020) har medført faktisk kolonne-dropping ved deploy. Dette er akseptabelt i tidlig beta uten verdifull produksjonsdata (ISSUE-009), men blir stadig farligere jo lenger appen er i reell bruk.

## Proposed Solution
1. Generere en baseline-migrering (`prisma/migrations/20260804120000_init/migration.sql`) som reflekterer dagens skjema nøyaktig (generert med `prisma migrate diff --from-empty --to-schema`)
2. Rulles ut i **to separate deploys**, fordi appen har autodeploy på push til `master` — det finnes ingen tidsluke til å kjøre et manuelt kommando "rett før" en deploy, siden push og deploy skjer i samme øyeblikk:
   - **Deploy A (denne committen):** Legg til `prisma/migrations/`-mappen i repoet. Dockerfile CMD er **uendret** (`prisma db push --accept-data-loss`) — ingen atferdsendring, trygt å autodeploye direkte.
   - **Manuelt steg etter Deploy A er live:** Kjør `npx prisma migrate resolve --applied 20260804120000_init` via Coolify sin Terminal-fane på den kjørende (nå oppdaterte) applikasjons-containeren — se `docs/COOLIFY-DEPLOY.md` §4b.
   - **Deploy B (egen, senere commit):** Bytt Dockerfile CMD til `prisma migrate deploy && npm run start`, commit og push separat, KUN etter at det manuelle steget over er bekreftet utført.
3. Dokumentert begge deploys og det manuelle mellomsteget i `docs/COOLIFY-DEPLOY.md` §4b
4. Alle fremtidige skjemaendringer skal fra nå av gjøres med `prisma migrate dev` lokalt (genererer ny migreringsfil), ikke `db push`

---

## Impact Analysis

### Affected Specs
- [x] specs/nfr.md — ingen endring nødvendig, spec-en har hele tiden sagt "migrate deploy"; denne CR-en gjør det faktisk sant (samme gap som CR-011 avdekket og løste i motsatt retning)
- [ ] specs/vision.md
- [ ] specs/requirements.md
- [ ] specs/entities.md
- [ ] specs/flows.md
- [ ] specs/architecture.md
- [ ] specs/api.yaml
- [ ] specs/ui-spec.md

### Affected Components
- `Dockerfile` (CMD)
- `prisma/migrations/` (ny mappe, ny fil `migration_lock.toml`)
- `docs/COOLIFY-DEPLOY.md`

Ingen applikasjonskode (`app/`, `lib/`, `components/`) berørt.

### Database Impact
Ingen skjemaendring — baseline-migreringen reflekterer eksisterende skjema 1:1. Overgangen krever ett manuelt engangssteg mot produksjonsdatabasen (`migrate resolve --applied`) MELLOM Deploy A og Deploy B, se runbook §4b. Hvis Deploy B (CMD-endringen til `migrate deploy`) pushes før dette steget er utført, vil deployet crash-loope.

### API Impact
Ingen.

### UX Impact
Ingen.

### Security Impact
Ingen.

### Performance Impact
Ingen målbar — `migrate deploy` og `db push` har lik oppstartskostnad.

---

## Acceptance Criteria
- [x] `prisma/migrations/20260804120000_init/migration.sql` finnes og reflekterer dagens `schema.prisma`
- [x] Dockerfile er UENDRET i Deploy A (fortsatt `db push`) — bekreftet at rekkefølgen ikke bryter noe
- [x] `docs/COOLIFY-DEPLOY.md` dokumenterer to-deploy-prosessen og engangs-mellomsteget tydelig
- [x] Deploy A pushet og bekreftet live (autodeploy) — commit 7c012ea
- [x] Produkteier har kjørt `migrate resolve --applied` mot produksjonsdatabasen via Coolify Terminal — bekreftet 2026-08-04: "Migration 20260804120000_init marked as applied."
- [x] Dockerfile CMD endret til `prisma migrate deploy` i en EGEN, senere commit (Deploy B) — commit 4fad3b5
- [x] Deploy B fullførte uten feil, bekreftet av produkteier 2026-08-04: deploy-loggen så ren ut, appen kjører

## Required Tests
- [ ] Unit: —
- [ ] Integration: —
- [x] Verifisering: `npx tsc --noEmit` / `npm run build` (ingen kodeendring, kjørt for å bekrefte ingen utilsiktet påvirkning)
- [ ] E2E: manuell verifisering av produkteier at appen starter normalt etter neste deploy

## Rollback Strategy
Hvis `migrate deploy` feiler i produksjon: revert Dockerfile CMD til forrige commit (`prisma db push --accept-data-loss`), redeploy. Ingen skjemaendring er gjort, så dette er trygt å reversere.

## Migration Strategy
To-deploy-prosess, se Proposed Solution punkt 2 og `docs/COOLIFY-DEPLOY.md` §4b. Kritisk rekkefølge: Deploy A (migreringsfiler, uendret CMD) → manuelt `migrate resolve --applied` mot prod → Deploy B (CMD-bytte til `migrate deploy`), i nøyaktig denne rekkefølgen, som separate commits/pushes.

## Risks
- Hvis noen hopper over det manuelle mellomsteget og pusher Deploy B (CMD-bytte) direkte, vil `migrate deploy` forsøke `CREATE TABLE` på tabeller som allerede finnes → deploy feiler synlig og containeren crash-looper (samme mønster som CR-011, men denne gangen en synlig feil i loggen, ikke en stille no-op)
- Autodeploy på push til `master` betyr at det ikke finnes noen "trygg tidsluke" til å kjøre kommandoer manuelt rett før en deploy — derfor splittet i to uavhengige commits i stedet for ett runbook-steg med tidsavhengighet
- Kan ikke testes fullt ut lokalt i denne økten — ingen lokal/dev PostgreSQL-instans tilgjengelig, kun statisk generering og gjennomlesing av SQL-en

## Dependencies
Krever produkteiers tilgang til Coolify sin database-ressurs for engangssteget (samme blocker som resten av Coolify-relatert arbeid, se `sessions/OPEN-ISSUES.md` ISSUE-007).

## Validation Notes
- `npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script` brukt til å generere baseline-SQL-en (Prisma 7.8.0 — merk at `--to-schema-datamodel` er fjernet i denne versjonen, riktig flagg er `--to-schema`)
- `migration.sql` gjennomlest manuelt og verifisert å reflektere alle modeller/enums/relasjoner i `schema.prisma` korrekt
- `npm run build` / `npx tsc --noEmit`: ✓ (Deploy A, ingen kodeendring; kjørt på nytt etter Deploy B sin Dockerfile-endring, fortsatt ✓)
- Deploy A verifisert live, deretter `npx prisma migrate resolve --applied 20260804120000_init` kjørt av produkteier via Coolify Terminal — output bekreftet: "Migration 20260804120000_init marked as applied." Datasource-linjen i output bekreftet at kommandoen traff produksjonsdatabasen (`j6dg0ut8t0fxm512u3ntpnfs:5432`), ikke en lokal/dev-database
- Deploy B pushet (4fad3b5) og bekreftet av produkteier 2026-08-04: deploy-loggen så ren ut, appen kjører normalt på `effektbibliotek.basbeta.no`. CR-024 lukket.
