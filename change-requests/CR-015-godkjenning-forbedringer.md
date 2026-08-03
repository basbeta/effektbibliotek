# CR-015: E-postforhåndsvisning, forhåndsutfylt godkjenner, personvern/GDPR-tekst

**Status:** Done
**Created:** 2026-08-03

---

## Business Goal
Produkteier ba om tre forbedringer til bruksgodkjenningsflyten (CR-013) etter første reelle bruk: (1) e-posten som sendes skal vises i UI-et før avsending, så det ikke oppleves som en skummel svart boks, (2) godkjenneren skal slippe å taste inn sitt eget navn/e-post på nytt på godkjenningssiden når vi allerede har spurt om det, (3) e-posten skal inneholde et personvern- og GDPR-avsnitt.

## Problem Statement
- Bas-representanten så ikke hva som faktisk ble sendt før de trykket "Send godkjenningsforespørsel" i CR-013.
- Godkjenningssiden (`/godkjenning/[caseId]/[token]`) ba om navn og e-post på nytt, selv om vi allerede hadde disse fra utsendingen (CR-013 sine `approverName`/`approverEmail`-felt).
- E-posten manglet informasjon om datalagring og hvor infrastrukturen driftes — relevant nå som Bas har flyttet til egen, selvhostet EU-infrastruktur (CR-008).

## Proposed Solution
1. **`lib/usage-approval.ts`** — `buildApprovalText` får et nytt personvern-avsnitt ("Vi lagrer navn og e-postadresse... så lenge vi oppbevarer godkjenningen") og et GDPR-avsnitt ("Bas Kommunikasjon sitt effektbibliotek (basbeta.no) driftes utelukkende på europeisk, selvhostet programvare med hosting i EU"), lagt til i e-postens footer. Samme funksjon brukes til både forhåndsvisning og faktisk sending — én kilde til sannhet, ingen fare for at de to driver fra hverandre.
2. **`components/cases/ApprovalSection.tsx`** — ny live forhåndsvisning (emne + brødtekst) rendret rett over "Send"-knappen, oppdateres mens Bas-representanten skriver inn godkjennerens navn. Bruker `buildApprovalText` direkte client-side (ren tekstfunksjon, ingen server-avhengighet).
3. **`app/(app)/case/[id]/page.tsx`** — sender nå `caseTitle`, `ownerName`, `ownerEmail`, `token` og `appUrl` (fra `process.env.APP_URL`, samme kilde som selve e-postutsendingen) videre til `ApprovalSection`, slik at forhåndsvisningen er byte-for-byte lik det som faktisk sendes.
4. **`app/godkjenning/[caseId]/[token]/page.tsx` + `ApprovalForm.tsx`** — henter `approverName`/`approverEmail` fra casen og forhåndsutfyller navn/e-post-feltene på den offentlige godkjenningssiden. Fortsatt redigerbare, i tilfelle en annen person enn den inviterte faktisk fyller ut skjemaet.

## Impact Analysis

### Affected Components
- `lib/usage-approval.ts`
- `components/cases/ApprovalSection.tsx`
- `app/(app)/case/[id]/page.tsx`
- `app/godkjenning/[caseId]/[token]/page.tsx`
- `app/godkjenning/[caseId]/[token]/ApprovalForm.tsx`

### Database Impact
Ingen.

### API Impact
Ingen endring i kontrakter — kun tekstinnhold og forhåndsutfylte skjemaverdier.

### UX Impact
Bas-representanten ser nøyaktig hva som sendes før avsending. Godkjenneren slipper å taste inn navn/e-post på nytt (men kan fortsatt endre det).

### Security Impact
Ingen. `token` (godkjenningstoken) vises i forhåndsvisningen til caseeieren, som allerede har full tilgang til denne via den eksisterende godkjenningslenken.

### Performance Impact
Ingen.

## Acceptance Criteria
- [x] Lokal `npm run build` fullfører uten feil
- [ ] Manuell test i produksjon: forhåndsvisningen oppdateres live idet navn tastes inn, og matcher den faktisk mottatte e-posten ord for ord
- [ ] Manuell test: godkjenningssiden viser forhåndsutfylt navn/e-post for godkjenneren
- [ ] Verifiser at personvern- og GDPR-avsnittet vises i den faktiske e-posten

## Required Tests
- [x] Lokal build verifisert grønn
- [ ] Manuell ende-til-ende-test i produksjon (gjenstår)

## Rollback Strategy
Reverter denne commiten. Ingen skjemaendring å rulle tilbake.

## Migration Strategy
Ingen.

## Risks
Lav — kun tekst- og UI-endringer i en allerede fungerende flyt.

## Dependencies
- CR-013 (Done) — bruksgodkjenningsflyten denne bygger videre på
- CR-011 (Done) — `APP_URL`-mønsteret denne gjenbruker for korrekt lenke i forhåndsvisningen

## Validation Notes
`npm run build` kjørt lokalt og bekreftet grønn. Ikke testet i faktisk produksjon i denne økten.
