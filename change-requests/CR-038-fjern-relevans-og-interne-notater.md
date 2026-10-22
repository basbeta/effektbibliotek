# CR-038: Fjern Relevans og Interne notater

**Status:** In Progress (godkjent av produkteier 2026-10-22: «Disse bør fjernes også», om kortene Relevans og Interne notater)
**Created:** 2026-10-22

---

## Business Goal
Et enklere skjema: færre felt som sjelden fylles ut. Støtter «ikke ferdig er bedre enn ikke registrert». Samme linje som CR-035.

## Problem Statement
Valgfrie blokker «Relevans» og «Interne notater» brukes ikke i praksis og gjør skjemaet lengre enn nødvendig.

## Proposed Solution
Fjern feltene `relevance` og `internalNotes` helt: skjema, visning, eksport, API og database. Etter dette er Effektmåling eneste valgfrie blokk.

Eksisterende data i feltene forsvinner (godkjent av produkteier: alle caser er testcaser).

Utrulling i to deploys (expand/contract, som CR-035):
- **Deploy A:** kode og `schema.prisma` uten feltene, ingen migrering. Kolonnene finnes fortsatt i databasen (nullable), så gammel og ny kode fungerer begge.
- **Deploy B:** egen migrering `DROP COLUMN "relevance", DROP COLUMN "internalNotes"`, etter at A er live.

**Utenfor scope:** nye felt, endring av øvrige blokker, eksportformat utover å fjerne de to linjene.

## Impact Analysis

### Affected Specs
- [ ] specs/vision.md
- [x] specs/requirements.md — FR-CASE-003 (blokkliste, «interne notater» i seksjonslisten), FR-CASE-007 (utgår), FR-PUB-002 (ordlyd)
- [ ] specs/entities.md
- [ ] specs/flows.md
- [ ] specs/architecture.md
- [ ] specs/api.yaml
- [x] specs/ui-spec.md — valgfrie blokker
- [ ] specs/nfr.md

### Affected Components
- `prisma/schema.prisma`, ny migrering (deploy B)
- `lib/case-form.ts` (+ test): `CaseFormValues`, `BlockKey`, `OPTIONAL_BLOCKS`, `getBlocksWithContent`, `getBlockSummary`
- `lib/case-export.ts` (+ test)
- `components/cases/EditCaseForm.tsx`
- `app/(app)/case/[id]/page.tsx`
- `app/api/cases/[id]/route.ts` (tillatt-liste)
- `docs/SMOKE-TEST.md`

### Database Impact
To kolonner droppes i deploy B. Data går tapt (akseptert).

### API Impact
`PATCH /api/cases/[id]` slutter å godta `relevance` og `internalNotes` (ignoreres av tillatt-listen).

### UX Impact
To kort/blokker og to visningsseksjoner forsvinner. «+ Legg til»-raden har bare Effektmåling.

### Security Impact
Ingen. Fjerner et felt som var ment som internt (FR-CASE-007 blir overflødig).

### Performance Impact
Ingen.

---

## Acceptance Criteria
- [ ] Relevans og Interne notater finnes ikke i skjema, visning, eksport eller API
- [ ] Effektmåling fungerer som før
- [ ] Deploy A går live uten feil mot database som fortsatt har kolonnene
- [ ] Deploy B: migreringen anvendes (bekreftet i Coolify-logg) og kolonnene er borte
- [ ] `npm test`, `npx tsc --noEmit`, `npm run build` grønt; lockfile uendret
- [ ] Verifisert i faktisk nettleser (Claude in Chrome) mot produksjon på en test-case som slettes etterpå
- [ ] Spesifikasjoner og `docs/SMOKE-TEST.md` oppdatert

## Required Tests
- [ ] Unit: oppdaterte tester i `case-form.test.ts` og `case-export.test.ts`; mutasjonssjekk
- [ ] Integration: ingen ny rute
- [ ] E2E: Chrome mot produksjon

## Rollback Strategy
Deploy A: `git revert` + redeploy (kolonnene finnes fortsatt). Deploy B: kolonnene og data kan ikke gjenopprettes uten backup; derfor B først etter at A er verifisert.

## Migration Strategy
Expand/contract i to deploys, se over. Migrasjons-SQL genereres uten `2>&1`, BOM-fritt.

## Risks
- **Dataloss** i de to feltene (akseptert).
- **Migreringslogg** må sees i Coolify for å bekrefte at B ble anvendt.
- **CR-037** endrer samme fil (`EditCaseForm.tsx`) og er ikke committet ennå; commit-rekkefølge må avklares.

## Dependencies
Bygger på CR-035 (samme mønster) og CR-033 (valgfrie blokker).

## Validation Notes
**Deploy A implementert lokalt 2026-10-22 (ikke pushet):** feltene er fjernet fra `schema.prisma`, `case-form.ts` (inkl. ubrukt `excerpt`), `case-export.ts`, `EditCaseForm.tsx`, case-visningen og tillatt-listen i `PATCH /api/cases/[id]`. Ingen migrering (kolonnene ligger igjen til deploy B). Specs oppdatert (FR-CASE-003, FR-CASE-007 fjernet, FR-PUB-002, ui-spec). `docs/SMOKE-TEST.md` trengte ingen endring.

**Verifisering lokalt:** `prisma generate`, `tsc --noEmit`, `npm run build` grønt; 207 tester ✓ (4 færre enn før: excerpt- og relevans/notat-tester fjernet, 2 nye for «effect er eneste blokk» og eksport uten feltene); lockfile uendret. Mutasjonssjekk ikke gjort ennå.

**Deploy A pushet som `6af9f93` (sammen med CR-037) og verifisert i produksjon (Claude in Chrome, test-case «TEST CR-038 fjern relevans (slettes)» slettet etterpå):** bare «+ Effektmåling» under «Legg til»; visningssiden uten Relevans/Interne notater; API returnerer ikke feltene; `PATCH` med `relevance` ga 200 men lagret ingenting; lagring/«Lagret»/«Lukk» (CR-037) fungerte.

**Deploy B laget lokalt (ikke pushet):** `prisma/migrations/20261022130000_drop_case_relevance_internalnotes/migration.sql` (`ALTER TABLE "Case" DROP COLUMN "internalNotes", DROP COLUMN "relevance";`), generert med `prisma migrate diff` fra forrige schema (kun stdout, første byte `2d 2d 20`, ingen BOM).

**Gjenstår:** push B → bekrefte anvendt migrering i Coolify-logg (Claude ser ikke loggen) → rask funksjonssjekk i produksjon → Done.
