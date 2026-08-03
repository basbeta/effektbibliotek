# CR-018: Reply-To til ansvarlig + navn i stedet for "kontaktpersonen din i Bas"

**Status:** Done
**Created:** 2026-08-03

---

## Business Goal
Når en ekstern mottaker svarer på en godkjenningsrelatert e-post, skal svaret gå direkte til den ansvarlige Bas-personen, ikke til `effektbibliotek@basbeta.no` (avsenderadressen). E-postene skal også omtale kontaktpersonen ved navn i stedet for en upersonlig frase.

## Proposed Solution
På de to e-postene som går til en ekstern mottaker i bruksgodkjenningsflyten:
- **`sendUsageApprovalRequest`** (den initielle forespørselen, CR-013) — sendt til godkjenner, cc caseeier
- **`sendUsageApprovalConfirmation`** (bekreftelsen etter innsendt godkjenning)

satt `replyTo` til caseeierens e-postadresse. `sendUsageApprovalCopyToBas` (går allerede direkte til caseeieren) er ikke endret — reply-to til seg selv gir ingen mening der.

Frasen "kontaktpersonen din i Bas" i disse to e-postenes footer er erstattet med caseeierens faktiske navn.

## Impact Analysis

### Affected Components
- `lib/email.ts` — `replyTo` lagt til på to `sendMail`-kall; `sendUsageApprovalConfirmation` fikk nytt `ownerEmail`-parameter
- `lib/usage-approval.ts` — `buildApprovalText` sin footer bruker nå `${params.ownerName}` i stedet for generisk tekst
- `app/api/godkjenning/[caseId]/[token]/route.ts` — `ownerEmail` lagt til i delt `emailParams`, fjernet nå-redundant eksplisitt `ownerEmail`-felt på `sendUsageApprovalCopyToBas`-kallet

### API Impact
Ingen endring i offentlige API-kontrakter.

### UX Impact
Svar på e-post fra godkjenner går rett til riktig menneske i Bas. E-postene føles mer personlige.

### Security Impact
Ingen.

## Acceptance Criteria
- [x] Lokal `npm run build` fullfører uten feil
- [ ] Manuell test i produksjon: verifiser at "Svar"/"Reply" på begge e-postene går til caseeierens adresse
- [ ] Verifiser at e-postteksten viser caseeierens navn i stedet for "kontaktpersonen din i Bas"

## Required Tests
- [x] Lokal build verifisert grønn
- [ ] Manuell test i produksjon (gjenstår)

## Rollback Strategy
Reverter denne commiten.

## Risks
Lav — kun tekst- og header-endringer i eksisterende, fungerende e-poster.

## Dependencies
- CR-013, CR-015, CR-016 (Done) — bruksgodkjenningsflyten denne bygger videre på

## Validation Notes
`npm run build` kjørt lokalt og bekreftet grønn. Ikke testet i faktisk produksjon i denne økten (kan ikke verifisere reply-to-header uten en faktisk e-postklient).
