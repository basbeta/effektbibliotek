# CR-016: Bekreftelseslinje og personvern/GDPR på kvitteringssiden

**Status:** Done
**Created:** 2026-08-03

---

## Business Goal
Etter at godkjenneren sender inn skjemaet på den offentlige godkjenningssiden, skal kvitteringen tydeliggjøre hvem som mottar bekreftelse på e-post, og siden skal ha samme personvern-/GDPR-informasjon som selve e-posten (CR-015).

## Problem Statement
Kvitteringsteksten sa kun "sendt deg en bekreftelse på e-post" — ikke at caseeieren (kontaktpersonen i Bas) også får kopi. Siden hadde heller ingen personvern-/GDPR-tekst i footeren, i motsetning til e-posten som nå har det (CR-015).

## Proposed Solution
1. **`lib/usage-approval.ts`** — `PRIVACY_NOTICE` og `GDPR_NOTICE` eksportert som egne konstanter (tidligere kun inline i `buildApprovalText`), slik at både e-postteksten og godkjenningssidens footer bruker nøyaktig samme ordlyd — ingen risiko for at de to driver fra hverandre.
2. **`ApprovalForm.tsx`** — kvitteringsteksten presiserer nå: "Du og din kontaktperson ({ownerName}) vil motta en bekreftelse på e-post."
3. **`app/godkjenning/[caseId]/[token]/page.tsx`** — footeren viser nå `PRIVACY_NOTICE` og `GDPR_NOTICE` i tillegg til den eksisterende beta-varselen.

## Impact Analysis

### Affected Components
- `lib/usage-approval.ts`
- `app/godkjenning/[caseId]/[token]/ApprovalForm.tsx`
- `app/godkjenning/[caseId]/[token]/page.tsx`

### Database Impact
Ingen.

### API Impact
Ingen.

### UX Impact
Tydeligere kvitteringstekst. Personvern-/GDPR-info synlig på siden i tillegg til i e-posten.

### Security Impact
Ingen.

### Performance Impact
Ingen.

## Acceptance Criteria
- [x] Lokal `npm run build` fullfører uten feil
- [ ] Manuell test i produksjon: send inn en godkjenning, verifiser kvitteringstekst og footer

## Required Tests
- [x] Lokal build verifisert grønn
- [ ] Manuell test i produksjon (gjenstår)

## Rollback Strategy
Reverter denne commiten.

## Migration Strategy
Ingen.

## Risks
Lav — kun tekstendringer.

## Dependencies
- CR-015 (Done) — personvern-/GDPR-teksten denne gjenbruker

## Validation Notes
`npm run build` kjørt lokalt og bekreftet grønn. Ikke testet i faktisk produksjon i denne økten.
