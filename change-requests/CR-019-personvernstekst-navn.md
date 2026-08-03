# CR-019: Personvernteksten nevner caseeier ved navn og e-post

**Status:** Done
**Created:** 2026-08-03

---

## Business Goal
Personvernteksten (CR-015/CR-016) skal fortelle godkjenneren nøyaktig hvem de kan kontakte for å trekke tilbake tillatelsen eller be om sletting — ikke bare vise til en generisk "kontaktperson".

## Proposed Solution
`PRIVACY_NOTICE` (tidligere en fast tekstkonstant) er gjort om til `buildPrivacyNotice(ownerName, ownerEmail)`, som setter inn caseeierens faktiske navn og e-post i setningen "...ta kontakt med {navn} på {e-post}." Brukes nå i både e-postteksten (`buildApprovalText`) og den offentlige godkjenningssidens footer — samme tekst begge steder, bygget fra samme funksjon.

## Impact Analysis

### Affected Components
- `lib/usage-approval.ts` — `PRIVACY_NOTICE` → `buildPrivacyNotice(ownerName, ownerEmail)`
- `app/godkjenning/[caseId]/[token]/page.tsx` — kaller ny funksjon med `c.owner.name`/`c.owner.email`

### UX Impact
Personvernteksten er nå konkret og handlingsrettet i stedet for generisk.

## Acceptance Criteria
- [x] Lokal `npm run build` fullfører uten feil
- [ ] Manuell test i produksjon: verifiser at personvernteksten viser riktig navn og e-post i både e-post og på godkjenningssiden

## Validation Notes
`npm run build` kjørt lokalt og bekreftet grønn. Ikke testet i faktisk produksjon i denne økten.
