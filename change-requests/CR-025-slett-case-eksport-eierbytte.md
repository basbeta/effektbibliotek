# CR-025: Slett case (med sikkerhetsnett) + eier-initiert eierbytte

**Status:** In Progress
**Created:** 2026-08-04

---

## Business Goal
La caseeieren selv rydde opp caser som ikke lenger er relevante, og overføre eierskap ved f.eks. jobbskifte — uten å måtte gå via admin — samtidig som kundegodkjenninger og tilknyttet materiale ikke kan slettes ved et uhell.

## Problem Statement
1. Det finnes i dag ingen mulighet til å slette en case, verken i UI eller API. Bekreftet gjennom kodesøk: ingen `DELETE`-handler i `app/api/cases/**` (kun for enkeltlenker), ingen "slett case"-UI noe sted.
2. Eierbytte er kun tilgjengelig for admin i UI (`EditCaseForm.tsx` sin "Ansvarlig (admin)"-dropdown er gatet på `isAdmin`), selv om selve API-et (`PATCH /api/cases/[id]`) ikke har noen egen feltbeskyttelse på `ownerEmail` utover den generelle eier-eller-admin-sjekken.

## Proposed Solution

### A) Sletting
- Ny `DELETE /api/cases/[id]` — tilgang: eier ELLER admin, samme mønster som eksisterende `PATCH`-sjekk (`existing.ownerEmail === session.userEmail || session.isAdmin`)
- Ekte (hard) sletting av `Case`-raden. `UsageApproval`- og `CaseLink`-relasjonene har i dag ingen `onDelete`-regel (bekreftet i `prisma/schema.prisma`) — Postgres ville blokkert slettingen med et FK-brudd. Løst ved å legge til `onDelete: Cascade` på begge relasjonene og generere en ny formell migrering (naturlig fortsettelse av CR-024s migreringsoppsett — generert statisk med `prisma migrate diff --from-schema <gammel kopi> --to-schema schema.prisma`, ingen live databasetilkobling nødvendig, samme teknikk som CR-024s baseline)
- **Arkitekturelt unntak, bevisst valgt av produkteier:** `sessions/ARCHITECTURE-STATE.md` har tidligere slått fast at "Bruksgodkjenning-historikk er append-only, aldri overskriv". Full case-sletting er nå det ene, eksplisitt bekreftede unntaket fra dette prinsippet — dokumentet oppdateres til å si dette rett ut, i stedet for å la det stå som en selvmotsigelse
- Ingen sletting skjer uten den eksplisitte advarsel-dialogen (se under) — ingen "slett"-knapp som trigger sletting direkte

### Advarsel-dialog ("Farlig sone" i redigeringsskjemaet)
Vises når eier eller admin trykker "Slett case":
1. Fast advarselstekst: casen slettes permanent, kan ikke angres
2. Liste over alle tilknyttede lenker/materiale (`CaseLink`: tittel + URL) — forberedt for filopplasting senere, men i dag er `CaseLink` det nærmeste vi har til "tilknyttede filer"
3. Hvis casen har én eller flere `UsageApproval`-rader: én ekstra tekstlinje per godkjenning — "Denne casen har følgende godkjenninger fra {customerName} lagt inn av {submittedByName} den {formatDate(submittedAt)}"
4. En "Eksporter"-knapp inni selve dialogen (samme eksportfunksjon som punkt B)
5. Eksplisitt bekreftelsesknapp ("Ja, slett permanent") + avbryt

### B) Eksport
- Ny `GET /api/cases/[id]/export` — tilgang: alle innloggede brukere (matcher dagens åpenhet på `GET /api/cases/[id]`, som ikke har noen eier-restriksjon)
- Returnerer en nedlastbar tekstfil (`Content-Disposition: attachment`) med: alle case-felt (kundenavn, tittel, alle tekstfelt, effektmåling, klassifisering, bruksrettigheter), full lenkeliste, og full godkjenningshistorikk (alle `UsageApproval`-rader, ikke bare siste)
- Knapp både på case-detaljsiden og i slette-dialogen

### C) Eierbytte for ikke-admin eier
- `EditCaseForm.tsx`: "Ansvarlig"-dropdown vises for eier ELLER admin, ikke bare admin
- `/api/admin/users/list` (returnerer allerede kun `{email, name}`, ingen sensitiv admin-data): tilgangssjekk relaksert fra "kun admin" til "alle innloggede brukere" — gjenbruker eksisterende endepunkt i stedet for å duplisere det

---

## Impact Analysis

### Affected Specs
- [ ] specs/vision.md
- [ ] specs/requirements.md
- [ ] specs/entities.md
- [ ] specs/flows.md
- [x] specs/architecture.md — ingen endring nødvendig i selve spec-en, men `sessions/ARCHITECTURE-STATE.md` sitt append-only-prinsipp oppdateres (se over)
- [ ] specs/api.yaml
- [ ] specs/ui-spec.md
- [ ] specs/nfr.md

### Affected Components
- `prisma/schema.prisma` (onDelete: Cascade), ny migrering i `prisma/migrations/`
- `app/api/cases/[id]/route.ts` (ny DELETE)
- `app/api/cases/[id]/export/route.ts` (ny)
- `app/api/admin/users/list/route.ts` (relaksert tilgang)
- `components/cases/EditCaseForm.tsx` (eierbytte-dropdown for eier, ny "Farlig sone"-seksjon)
- `app/(app)/case/[id]/page.tsx` (eksporter-knapp)
- `app/(app)/case/[id]/rediger/page.tsx` (henter full `usageApprovals`-historikk, ikke kun siste)

### Database Impact
Skjemaendring: `onDelete: Cascade` lagt til på `UsageApproval.case` og `CaseLink.case`. Ingen kolonner endres, kun FK-oppførsel ved sletting. Anvendes automatisk av `prisma migrate deploy` ved neste deploy (ingen manuelt baseline-steg nødvendig denne gangen, siden dette er en ekte ny migrering, ikke en baseline av eksisterende tilstand som i CR-024).

### API Impact
Ny `DELETE /api/cases/[id]`, ny `GET /api/cases/[id]/export`. `GET /api/admin/users/list` sin tilgangssjekk relakseres (fortsatt kun navn+e-post i responsen).

### UX Impact
Ny "Farlig sone" i redigeringsskjemaet med slette-flyt. Ny eksporter-knapp på case-siden. Eierbytte-dropdown nå synlig for eieren selv, ikke bare admin.

### Security Impact
`GET /api/admin/users/list` åpnes opp fra admin-only til alle innloggede — vurdert trygt siden responsen kun inneholder navn+e-post, samme data som allerede vises åpent som "Ansvarlig" på enhver case (som alle innloggede kan se via eksisterende åpen `GET /api/cases/[id]`). `DELETE` er destruktiv og irreversibel — beskyttet av samme eier-eller-admin-sjekk som `PATCH`, pluss et obligatorisk UI-bekreftelsessteg.

### Performance Impact
Ingen målbar.

---

## Acceptance Criteria
- [ ] `onDelete: Cascade` lagt til i schema.prisma, ny migrering generert og gjennomlest manuelt
- [ ] `DELETE /api/cases/[id]` fungerer for eier og admin, avvises for andre (403)
- [ ] `GET /api/cases/[id]/export` returnerer en nedlastbar fil med alle felt, lenker og full godkjenningshistorikk
- [ ] `/api/admin/users/list` tilgjengelig for alle innloggede brukere
- [ ] Eierbytte-dropdown synlig for eier (ikke bare admin) i redigeringsskjemaet
- [ ] "Farlig sone" med slette-dialog: advarselstekst, lenkeliste, godkjenningsvarsel (hvis relevant), eksporter-knapp, eksplisitt bekreftelse
- [ ] Eksporter-knapp synlig på case-detaljsiden
- [ ] `npm run build` / `npx tsc --noEmit`: ✓

## Required Tests
- [ ] Unit: —
- [ ] Integration: —
- [ ] E2E: manuell verifisering — slett en test-case med lenker og godkjenningshistorikk, bekreft at eksport lastes ned korrekt før sletting, bekreft at sletting faktisk fjerner casen og alt tilknyttet

## Rollback Strategy
Ny migrering kan reverseres med en oppfølgende migrering som fjerner cascade-regelen. `DELETE`/`export`-routene og UI-endringene kan reverteres uavhengig av skjemaendringen (ren kodeendring).

## Migration Strategy
Statisk `prisma migrate diff --from-schema <gammel kopi> --to-schema schema.prisma --script`, ingen live databasetilkobling nødvendig. Anvendes normalt av `prisma migrate deploy` ved neste autodeploy (ingen manuelt mellomsteg som i CR-024, siden dette ikke er en baseline).

## Risks
- Sletting er ekte og irreversibel — sikkerhetsnettet er UI-bekreftelse + eksportmulighet, ikke en papirkurv/angre-funksjon. Vurdert akseptabelt av produkteier (eksplisitt valgt fremfor soft-delete)
- `onDelete: Cascade` betyr at enhver fremtidig kode som sletter en Case (ikke bare denne nye DELETE-routen) vil cascade-slette godkjenningshistorikk uten videre varsel — viktig å huske ved fremtidig utvikling
- Kan ikke testes fullt ut mot en faktisk database i denne økten — ingen lokal/dev Postgres tilgjengelig

## Dependencies
Bygger på CR-024 sitt migreringsoppsett.

## Validation Notes
- `onDelete: Cascade` lagt til på `UsageApproval.case` og `CaseLink.case` i schema.prisma
- Migrering generert statisk: `prisma migrate diff --from-schema <kopi av gammel schema.prisma> --to-schema schema.prisma --script`, ingen live databasetilkobling nødvendig (samme teknikk som CR-024 sin baseline). Resultat gjennomlest manuelt: kun `DROP CONSTRAINT`/`ADD CONSTRAINT ... ON DELETE CASCADE` på de to FK-ene, ingen andre endringer
- `DELETE /api/cases/[id]` lagt til med samme eier-eller-admin-sjekk som `PATCH`
- `GET /api/cases/[id]/export` bygget med ny `lib/case-export.ts` (ren tekstfil, `Content-Disposition: attachment`), gjenbrukt av både case-detaljsiden og slette-dialogen
- `/api/admin/users/list` sin tilgangssjekk relaksert til alle innloggede — responsen var allerede begrenset til `{email, name}`
- `EditCaseForm.tsx`: eierbytte-dropdown og "Farlig sone" (slette-dialog) vises nå for `isAdmin || isOwner`
- `npm run build` / TypeScript-sjekk (del av `next build`): ✓ — én type-feil oppdaget og rettet underveis (`CaseExportData` manglet `ApprovalChoices`-feltene for "gjeldende bruksrettigheter"-seksjonen i eksporten)
- IKKE testet mot en faktisk database i denne økten — ingen lokal/dev Postgres tilgjengelig. Manuell E2E-verifisering i produksjon gjenstår (opprett testcase med lenker og godkjenning, eksporter, slett, bekreft at alt er borte)
