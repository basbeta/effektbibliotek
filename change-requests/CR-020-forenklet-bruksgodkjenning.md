# CR-020: Forenklet bruksgodkjenning — 6 tydelige valg, fjern redundant bruksnivå

**Status:** Done
**Created:** 2026-08-03

---

## Business Goal
Case-siden viste tidligere både et avledet "bruksnivå" (badge) og separate "begrensninger" (pills) — samme informasjon dobbelt opp, på to forskjellige måter. Produkteier ba om å forenkle til nøyaktig 6 tydelige valg, uten redundans.

## Problem Statement
Det gamle systemet hadde: en `CaseUsageLevel`-enum (`not_cleared`/`internal_only`/`presentation_allowed`) utledet fra rå checkbox-valg via `computeUsageLevel()`, PLUSS separate boolske felt (`ndaRestricted`, `anonymizedUseOnly`, `competitionUseAllowed`) vist som egne pills ved siden av. Godkjenningsskjemaet hadde 5 valg, hvorav ett («Casen kan presenteres internt i Bas») ikke lenger var ønsket, og to nye brukstilfeller (hjemmeside, anbudsbesvarelser) manglet helt.

## Proposed Solution
Erstattet hele modellen med 6 rene boolske valg — ingen avledet "nivå":
1. `ndaRestricted` — NDA (blokkerer alle andre valg)
2. `anonymizedUseOnly` — Kun anonymisert (blokkerer nå også alle andre valg, tidligere kun en modifikator)
3. `websiteUseAllowed` (**ny**) — Kan brukes som case på hjemmeside
4. `presentationUseAllowed` — Kan brukes som case i presentasjoner
5. `tenderUseAllowed` (**ny**) — Kan brukes som case i anbudsbesvarelser
6. `competitionUseAllowed` — Kan brukes som case i konkurranse/award-show

**Fjernet:** `internalUseAllowed` ("Kan presenteres internt i Bas") — ikke i den nye listen. `CaseUsageLevel`-enumen og `computeUsageLevel()` er fjernet i sin helhet, erstattet med `sanitizeChoices()` som kun håndhever gjensidig utelukkelse (NDA/anonymisert blokkerer resten) — ingen syntetisert "nivå".

## Impact Analysis

### Affected Components
16 filer — se commit for full liste. Kjernen:
- `prisma/schema.prisma` — `Case.usageLevel` fjernet; `Case` fikk `websiteUseAllowed`/`presentationUseAllowed`/`tenderUseAllowed`; `UsageApproval.internalUseAllowed` fjernet, fikk `websiteUseAllowed`/`tenderUseAllowed`; `CaseUsageLevel`-enum fjernet
- `lib/usage-approval.ts` — `computeUsageLevel` → `sanitizeChoices`, nye `choiceLabels`
- `components/cases/UsageBadge.tsx` — fullstendig omskrevet: viser NDA slett ikke (vises allerede prominent andre steder), "Kun anonymisert" som egen badge, ellers én liten badge per godkjent bruksområde
- `app/godkjenning/[caseId]/[token]/ApprovalForm.tsx` — 6 avkrysningsbokser med to gjensidig utelukkende valg (NDA, anonymisert)
- `components/cases/EditCaseForm.tsx` — "Begrensninger" → "Bruksrettigheter", nå 6 avkrysningsbokser i stedet for 3 + en separat bruksnivå-dropdown
- `app/api/cases/route.ts` — bibliotek-filter bygger nå `where`-betingelser per flagg i stedet for `usageLevel`-likhet
- `app/api/godkjenning/[caseId]/[token]/route.ts` — server-side sanering av innsendte valg (uavhengig av klient), lagres identisk på både `UsageApproval` og `Case`

### Database Impact
**Skjemaendring med reelt datatap ved neste deploy:** `prisma db push --accept-data-loss` (CR-011) vil droppe kolonnene `Case.usageLevel` og `UsageApproval.internalUseAllowed`. Akseptabelt gitt at effektbiblioteket er i tidlig betatesting uten produksjonsdata av verdi (samme vurdering som ved CR-008-migreringen), men nevnes eksplisitt siden det er et reelt bortfall av lagret informasjon, ikke bare en additiv endring.

### API Impact
`PATCH /api/cases/:id` godtar ikke lenger `usageLevel`, godtar nå `websiteUseAllowed`/`presentationUseAllowed`/`tenderUseAllowed`. Bibliotek-filterets `usage`-query-parameter har nye gyldige verdier (`nda`/`anonymized`/`website`/`presentation`/`tender`/`competition`/`not_cleared` i stedet for enum-verdiene).

### UX Impact
- Case-detaljsiden viser nå kun én badge-gruppe (ingen duplisering)
- En case kan ha flere godkjente bruksområder samtidig, vist som separate små badges (bekreftet med produkteier)
- Godkjenningsskjemaet (ekstern side) har 6 valg i stedet for 5, med tydeligere gjensidig utelukkelse mellom NDA og "kun anonymisert"

### Security Impact
Ingen.

## Acceptance Criteria
- [x] Lokal `npm run build` fullfører uten feil på tvers av alle 16 endrede filer
- [ ] Manuell test i produksjon: send inn en godkjenning med flere valg, verifiser at case-siden viser riktige badges uten duplisering
- [ ] Verifiser at bibliotek-filteret fungerer med de nye verdiene
- [ ] Verifiser at admin/eier kan sette bruksrettigheter manuelt via redigeringsskjemaet

## Required Tests
- [x] Lokal build verifisert grønn
- [ ] Manuell ende-til-ende-test i produksjon (gjenstår)

## Rollback Strategy
Reverter denne commiten. Merk: hvis `db push` allerede har droppet `usageLevel`/`internalUseAllowed`-kolonnene før en eventuell rollback, må skjemaet pushes på nytt for å gjenopprette dem (tomme/default-verdier, ingen historisk data å gjenopprette).

## Migration Strategy
Ingen datamigrasjon utført — kolonnene droppes og gjenskapes friskt ved neste `db push`. Vurdert og akseptert som lavrisiko gitt betastatus.

## Risks
- **Medium (dokumentert, akseptert):** Reelt datatap på to kolonner ved deploy — se Database Impact.
- Lav: UI-endringene er omfattende i antall filer, men mekanisk like (samme mønster gjentatt) — redusert risiko for spredte feil, verifisert av at build er grønn på tvers av alle.

## Dependencies
- CR-011 (Done) — `db push --accept-data-loss`-mønsteret denne stoler på for skjemaoppdatering

## Validation Notes
`npm run build` kjørt lokalt og bekreftet grønn etter alle 16 filendringer. Ikke testet i faktisk produksjon i denne økten — spesielt viktig å verifisere bibliotek-filteret og badge-visningen etter deploy.
