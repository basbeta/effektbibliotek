# CR-029: Feil klokkeslett i e-post og datovisning (tidssone-bug)

**Status:** Done, bekreftet i produksjon
**Created:** 2026-08-05

---

## Business Goal
Bekreftelses-e-poster og dato/klokkeslett-visninger i appen skal vise korrekt norsk tid, ikke serverens interne UTC-tid.

## Problem Statement
Produkteier rapporterte at klokkeslettet i bekreftelses-e-posten etter en bruksgodkjenning var feil (viste "5. august 2026 kl. 08:31" for en innsending som faktisk skjedde senere på formiddagen). Rotårsak: `Dockerfile` setter ingen `TZ`-miljøvariabel, så Node-containeren i Coolify kjører i UTC. Tre steder i kodebasen formaterer datoer/klokkeslett med `toLocaleString`/`toLocaleDateString` og norsk locale (`nb-NO`), men UTEN å spesifisere `timeZone` — dermed vises UTC-klokketid med norsk formatering, ikke faktisk norsk lokaltid. Norge er for tiden på sommertid (CEST, UTC+2), så avviket er nøyaktig 2 timer akkurat nå (ville vært 1 time i vintertid).

Berørte steder:
- `lib/email.ts:73` — `sendUsageApprovalConfirmation` (bekreftelses-e-post til godkjenner)
- `lib/email.ts:120` — `sendUsageApprovalCopyToBas` (kopi til caseeier)
- `lib/format.ts:3` — `formatDate()`, brukt i listevisninger og case-eksport for godkjenningshistorikk

## Proposed Solution
Legg til `timeZone: "Europe/Oslo"` i alle tre `toLocale*`-kallene. IANA-tidssonen `Europe/Oslo` håndterer sommertid/vintertid-overgangen automatisk, i motsetning til en fast UTC+1/UTC+2-offset.

## Impact Analysis

### Affected Specs
Ingen — ingen NFR-krav om tidssone var eksplisitt dokumentert, men implisitt forventet at appen viser norsk tid for et internt Bas-verktøy.

### Affected Components
- `lib/email.ts` — to `toLocaleString`-kall
- `lib/format.ts` — `formatDate()`

### Database Impact
Ingen. `submittedAt`/`lockedAt` lagres allerede korrekt som UTC-instanter (`new Date()`) — bugen er kun i visningslaget, ikke i lagret data.

### API Impact
Ingen.

### UX Impact
Klokkeslett i bekreftelses-e-post og datoer i lister/eksport viser nå korrekt norsk lokaltid.

### Security Impact
Ingen.

### Performance Impact
Ingen.

## Acceptance Criteria
- [x] Alle tre stedene bruker `timeZone: "Europe/Oslo"`
- [x] `npm run build` / `npx tsc --noEmit` grønt
- [x] Manuell verifisering i produksjon: ny bruksgodkjenning-e-post viser korrekt klokkeslett — bekreftet av produkteier 2026-08-05

## Required Tests
- [ ] Manuell: send en ny bruksgodkjenning-testinnsending etter deploy, bekreft klokkeslett i e-post matcher faktisk klokketid i Norge

## Rollback Strategy
Ren visningslag-endring, ingen skjema/API/datalagring berørt. Rollback = revert commit.

## Migration Strategy
Ingen.

## Risks
Svært lav risiko — `timeZone`-opsjonen er standard `Intl.DateTimeFormat`-API, ingen ny avhengighet.

## Dependencies
Ingen.

## Validation Notes
Oppdaget under manuell produksjonsverifisering av CR-028 (nodemailer-oppgraderingen) — ikke forårsaket av den oppgraderingen, men et pre-eksisterende visningslag-problem som først ble synlig nå.
