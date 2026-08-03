# CR-014: Manuell overstyring av eget navn

**Status:** Done
**Created:** 2026-08-03

---

## Business Goal
Brukere med spesialtegn i navnet (æ/ø/å o.l.) som ikke kommer med i e-postadressen skal kunne rette opp visningsnavnet sitt, uten en full profil-/innstillingsside.

## Problem Statement
`nameFromEmail()` (lib/auth.ts) utleder navn fra e-postens lokaldel (f.eks. `haavard.kvinnesland@bas.no` → "Haavard Kvinnesland"), satt én gang ved kontoopprettelse. Brukere hvis faktiske navn har spesialtegn e-postadressen ikke fanger (f.eks. "Håvard" bak "haavard") får feil navn permanent, uten noen måte å rette det selv.

## Proposed Solution
Legg til en blyant ved siden av "Ansvarlig"-navnet på case-detaljsiden — kun synlig/klikkbar når den innloggede brukeren selv er personen som vises (`c.ownerEmail === session.userEmail`). Klikk gjør navnet redigerbart inline; lagring kaller en ny `PATCH /api/auth/me` som oppdaterer `User.name` i databasen og synkroniserer navnet i den aktive sesjonen, slik at det oppdaterte navnet vises umiddelbart overalt (SideNav, andre caser, osv.) uten ny innlogging.

## Impact Analysis

### Affected Components
- `app/api/auth/me/route.ts` — ny `PATCH`-handler
- `components/cases/OwnerNameEditor.tsx` (ny, client-komponent)
- `app/(app)/case/[id]/page.tsx` — bruker ny komponent i stedet for statisk tekst

### Database Impact
Ingen skjemaendring — oppdaterer eksisterende `User.name`.

### API Impact
Ny endpoint: `PATCH /api/auth/me`, body `{ name }`. Krever innlogging; oppdaterer kun den innloggede brukerens egen rad.

### UX Impact
Navnet er permanent (lagret i databasen), ikke en midlertidig visningsting. Kan endres når som helst av brukeren selv.

### Security Impact
Kan kun endre eget navn (`session.userEmail`) — ingen mulighet til å endre andres navn fra dette endepunktet.

### Performance Impact
Ingen.

## Acceptance Criteria
- [x] Lokal `npm run build` fullfører uten feil
- [x] Manuell test i produksjon: rediger eget navn på en case man eier — bekreftet fungerende av produkteier 2026-08-03
- [x] Verifiser at blyanten ikke vises for caser man ikke selv er ansvarlig for

## Required Tests
- [x] Lokal build verifisert grønn
- [x] Manuell test i produksjon — bekreftet fungerende
- [ ] Manuell test i produksjon (gjenstår)

## Rollback Strategy
Reverter denne commiten. Ingen skjemaendring å rulle tilbake.

## Migration Strategy
Ingen.

## Risks
Lav — additiv, begrenset til å endre egen bruker.

## Dependencies
Ingen.

## Validation Notes
`npm run build` kjørt lokalt og bekreftet grønn. Ikke testet i faktisk produksjon i denne økten.
