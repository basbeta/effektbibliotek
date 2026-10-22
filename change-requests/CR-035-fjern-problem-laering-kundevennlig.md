# CR-035: Fjern feltene Problem / kontekst, Læring og Kundevennlig beskrivelse

**Status:** In Progress (godkjent av produkteier 2026-10-22: «fjern dette det er ikke nødvendig for casen … fjern også problem / kontekst og Læring. Om eksisterende caser har dette i databasen er det bare å slette. Det er kun testcaser»)
**Created:** 2026-10-22

---

## Business Goal
Gjøre casene enklere å fylle ut ved å fjerne felt som ikke er nødvendige. Støtter målet fra CR-033/034: færre bokser, mindre å forholde seg til.

## Problem Statement
Tre tekstfelt brukes ikke i praksis og øker kompleksiteten i skjema, mangler-panel, case-side, eksport og oppfølging:
- **Problem / kontekst** (`Case.problem`)
- **Læring** (`Case.learning`)
- **Kundevennlig beskrivelse** (`Case.customerFacingSummary`) — vises også på den offentlige godkjenningssiden for kunder, men bare når den er utfylt.

## Proposed Solution
Fjern de tre feltene helt: fra UI, API, søk, eksport, oppfølging, mangler-panelet, kravene til status og datamodellen. Eksisterende innhold i feltene slettes (testdata; bekreftet akseptabelt).

Konsekvenser og valg som følger av fjerningen:
- **Statuskrav (FR-CASE-004/005):** «Pågår» krever nå kundenavn, tittel, beskrivelse, bransje, case-type, kanal og **løsning** (tidligere «problem eller løsning»). «Ferdigstilt» krever det samme pluss **effekt** (tidligere «problem/kontekst, løsning, effekt eller læring»).
- **Innhold-kortet** i redigeringsskjemaet har to felt: Løsning og Effekt (fremdrift «N av 2»).
- **Mangler-panelet:** «For å sette Ferdigstilt» viser Bransje, Case-type, Kanal, Løsning, Effekt (alle redigerbare direkte, CR-034). Gruppen «For bruk i presentasjoner» viser kun NDA-informasjonen når NDA er satt.
- **Valgfrie blokker** i skjemaet: Effektmåling, Relevans, Interne notater (Kundevennlig tekst fjernes).
- **Godkjenningssiden (kundevendt):** viser kundenavn, tittel og godkjenningsskjemaet; boksen med kundevennlig beskrivelse forsvinner. Ingen intern tekst eksponeres (FR-PUB-002/NFR-002 uendret i sikkerhet).
- **Oppfølging:** gruppen «Mangler kundevennlig beskrivelse» fjernes; «Mangler effekt eller læring» blir «Mangler effekt».
- **Bibliotek:** fritekstsøk dekker ikke lenger problem/læring; casekortets effektforhåndsvisning bruker kun Effekt.
- **Eksport:** de tre feltene tas ut av eksportteksten.

### Utrulling i to deploys (expand/contract, som CR-033)
Prisma-klienten velger alle kolonner eksplisitt, og den offentlige godkjenningssiden leser `customerFacingSummary`. Å droppe kolonnene mens en gammel container fortsatt kjører ville gitt feil.
- **Deploy A:** all kode + de tre feltene fjernet fra `schema.prisma`, **uten** migrering. Databasen beholder kolonnene (nullable, ubrukt).
- **Deploy B (egen commit etter at A er verifisert):** migrering `ALTER TABLE "Case" DROP COLUMN "problem", DROP COLUMN "learning", DROP COLUMN "customerFacingSummary"`, generert statisk, BOM-fri, kontrollert byte for byte.

## Impact Analysis

### Affected Specs
- [x] specs/vision.md — jobb nr. 1 nevner «problemstilling … effekt eller læring»; justeres til «løsning eller effekt»
- [x] specs/requirements.md — FR-CASE-004/005/006, FR-LIB-002, FR-PUB-002, FR-OPPS-001, NFR-002
- [ ] specs/entities.md
- [ ] specs/flows.md
- [ ] specs/architecture.md
- [ ] specs/api.yaml
- [x] specs/ui-spec.md — Innhold-kortet, valgfrie blokker, felttyper i mangler-panelet
- [ ] specs/nfr.md

### Affected Components
- `prisma/schema.prisma`, ny migrering (deploy B)
- `lib/cases.ts`, `lib/case-form.ts`, `lib/missing-fields.ts`, `lib/case-export.ts`
- `components/cases/EditCaseForm.tsx`, `MissingInfoPanel.tsx`, `CaseCard.tsx`
- `app/(app)/case/[id]/page.tsx`, `app/(app)/oppfolging/page.tsx`, `app/godkjenning/[caseId]/[token]/page.tsx`
- `app/api/cases/route.ts` (søk), `app/api/cases/[id]/route.ts` (tillatt-liste)
- Tester: `lib/cases.test.ts`, `lib/case-form.test.ts`, `lib/missing-fields.test.ts`, `lib/case-export.test.ts`, `app/api/cases/[id]/route.test.ts`
- `docs/SMOKE-TEST.md`

### Database Impact
Tre kolonner droppes på `Case` (deploy B); data i dem går permanent tapt (akseptert av produkteier).

### API Impact
`PATCH /api/cases/[id]` slutter å godta de tre feltene (ignoreres av tillatt-listen). `GET /api/cases?q=` søker ikke lenger i problem/læring. Svar fra API-et inneholder ikke feltene.

### UX Impact
Færre felt i skjema og på case-siden; kunder ser ikke lenger en beskrivelsesboks på godkjenningssiden.

### Security Impact
Positiv/nøytral: mindre tekst eksponeres på den offentlige siden. Ingen endring i tilgangskontroll.

### Performance Impact
Ingen.

---

## Acceptance Criteria
- [ ] Problem / kontekst, Læring og Kundevennlig beskrivelse er borte fra skjema, case-side, godkjenningsside, mangler-panel, oppfølging, bibliotek-søk, casekort, eksport, API-tillatt-liste og `schema.prisma` (deploy A), og kolonnene er droppet (deploy B)
- [ ] «Pågår»/«Ferdigstilt»-kravene og mangler-panelet følger de nye reglene (se Proposed Solution); «Effekt» og «Løsning» kan fylles ut direkte fra panelet
- [ ] Innhold-kortet viser «N av 2»; Kundevennlig tekst finnes ikke som valgfri blokk
- [ ] Godkjenningssiden fungerer (åpen, låst, ugyldig lenke) uten beskrivelsesboksen
- [ ] En case som tidligere hadde data i de tre feltene åpnes, vises og lagres uten feil etter deploy A (kolonnene finnes fortsatt) og etter deploy B
- [ ] `npm test`, `npx tsc --noEmit`, `npm run build` grønt; lockfile uendret; ingen nye avhengigheter
- [ ] Verifisert i faktisk nettleser (Claude in Chrome) mot produksjon på en test-case som slettes etterpå, etter hvert deploy
- [ ] Specs og `docs/SMOKE-TEST.md` oppdatert

## Required Tests
- [ ] Unit: `getMissingItems`/`getMissingInfo` (nye regler), `lib/case-form.ts` (fremdrift N av 2, blokker), `lib/missing-fields.ts` (solution/effect), eksporttekst uten de tre feltene
- [ ] Integration: `PATCH` ignorerer de tre feltene
- [ ] E2E: Chrome mot produksjon (se over)

## Rollback Strategy
Deploy A: `git revert` + «Redeploy» — databasen er uendret, så trygt. Deploy B (kolonner droppet): rollback av koden krever en ny migrering som legger kolonnene tilbake (tomme). Derfor deploys B først etter at A er verifisert.

## Migration Strategy
Se «Utrulling i to deploys». SQL genereres med `prisma migrate diff`, kun stdout (ikke `2>&1`), skrives uten BOM og kontrolleres på første byte og innhold før commit.

## Risks
- **Irreversibelt datatap** i tre felt — akseptert, men permanent.
- **Mangler-logikken endres** (statuskrav) — dekket av tester; FR-CASE-004/005 oppdateres i samme CR.
- **Kundevendt side endres** — verifiseres i nettleser (åpen/låst/ugyldig).
- **Mange filer berøres** — mitigert av TypeScript (fjernet felt i Prisma-typene gir kompileringsfeil på resterende bruk) og tester.

## Dependencies
Bygger på CR-033/034. Ingen nye pakker. Deploy B krever at A er live og verifisert.

## Validation Notes

**Implementert lokalt 2026-10-22 (deploy A, ikke pushet):** feltene er fjernet fra `schema.prisma`, `PATCH`-tillatt-liste, `GET /api/cases?q=`, eksport, redigeringsskjema, mangler-panel, case-side, godkjenningsside, Oppfølging og casekort. Ingen nye avhengigheter; `package.json`/lockfile uendret.

**Endrede regler (valg tatt av Claude ut fra «fjern feltene», uten ny avklaring):** «Pågår» krever løsning; «Ferdigstilt» krever løsning og effekt (tidligere problem eller løsning / problem, løsning, effekt eller læring). Innhold-kortet har «N av 2». Mangler-gruppen «For bruk i presentasjoner» viser kun NDA-informasjon. Mangler-IDer: `solution`, `effect` (tidligere `problem`, `problemOrSolution`, `effectOrLearning`, `customerFacingSummary`). Oppfølging: «Mangler effekt»; gruppen for kundevennlig beskrivelse er fjernet. Godkjenningssiden viser kundenavn, tittel og skjemaet.

**Verifisering lokalt:** TypeScript (fjernede Prisma-felt) fanget alle gjenværende bruk i testene; kilden hadde ingen. `npm test` 203/203, `tsc`, `next build` grønt. Lint på endrede filer: kun den eldre ISSUE-018-feilen (`Date.now()` i `oppfolging/page.tsx`) + 2 eldre warnings. 5 mutasjoner fanget (PATCH aksepterer fjernet felt igjen; Ferdigstilt krever ikke effekt; Pågår krever ikke løsning; feil total for innhold-fremdrift; effekt lagres utrimmet/tom). `PATCH`-testen sender nå `problem`, `learning`, `customerFacingSummary` og `pitchText` og bekrefter at de ignoreres.

**Migrasjons-SQL for deploy B** (generert med `prisma migrate diff`, kun stdout, kontrollert byte for byte; ligger i temp-mappe, IKKE i repoet): `ALTER TABLE "Case" DROP COLUMN "customerFacingSummary", DROP COLUMN "learning", DROP COLUMN "problem";` — én setning, ingen BOM, ingen støytekst.

**Specs oppdatert:** `requirements.md` (FR-CASE-003/004/005/006, FR-LIB-002/006, FR-PUB-002, FR-OPPS-001, NFR-002), `ui-spec.md`, `vision.md` (jobb nr. 1: «løsning eller effekt»; resten av visjonsteksten om «læring» som tema er uendret). `docs/SMOKE-TEST.md` justert.

**Gjenstår:** push deploy A → Chrome-test mot produksjon (test-case: skjema, panel, case-side, godkjenningsside uten beskrivelsesboks, Oppfølging, søk) → deploy B (migrering) → ny kort verifisering → Done.
