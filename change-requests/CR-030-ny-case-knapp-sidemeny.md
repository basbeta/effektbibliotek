# CR-030: Flytt "Legg inn case"-knappen til sidemenyen, omdøpt til "Ny Case"

**Status:** Done, bekreftet i produksjon
**Created:** 2026-08-05

---

## Business Goal
Enklere, mer synlig tilgang til case-opprettelse — knappen skal ligge naturlig sammen med resten av navigasjonen i venstre kolonne i stedet for i topbaren.

## Problem Statement
Produkteier ba om at "+ Legg inn case"-knappen i topbaren omdøpes til "Ny Case" og flyttes til toppen av venstre kolonne (over Bibliotek/Mine caser/Oppfølging).

## Proposed Solution
Fjernet `Link`-knappen fra `components/layout/Topbar.tsx` (sto tidligere mellom logo og brukernavn/logg-ut). Lagt til samme lenke (til `/case/ny`) øverst i `components/layout/SideNav.tsx`, over `<ul>` med navigasjonspunktene, med tekst "+ Ny Case". Bruker samme knappe-stil (`var(--color-accent)`-bakgrunn, hvit tekst) som andre primærknapper i appen (`EditCaseForm.tsx`, `LinksSection.tsx`) i stedet for topbarens gjennomsiktige on-accent-stil, siden sidemenyen har lys bakgrunn.

## Impact Analysis

### Affected Specs
Ingen.

### Affected Components
- `components/layout/Topbar.tsx` — knapp fjernet
- `components/layout/SideNav.tsx` — knapp lagt til øverst i navigasjonen

### Database Impact
Ingen.

### API Impact
Ingen.

### UX Impact
Case-opprettelse-knappen er nå i venstre kolonne i stedet for topbaren. Lenkemål (`/case/ny`) uendret.

### Security Impact
Ingen.

### Performance Impact
Ingen.

## Acceptance Criteria
- [x] Knappen er fjernet fra topbaren
- [x] Knappen vises øverst i venstre kolonne, over Bibliotek/Mine caser/Oppfølging, med tekst "+ Ny Case"
- [x] `npm run build` / `npx tsc --noEmit` grønt
- [x] Visuell bekreftelse i produksjon av produkteier — bekreftet 2026-08-05 ("ser bra ut")

## Required Tests
- [ ] Manuell: bekreft plassering og lenke fungerer i produksjon

## Rollback Strategy
Ren UI-endring i to layoutkomponenter, ingen skjema/API. Rollback = revert commit.

## Migration Strategy
Ingen.

## Risks
Svært lav risiko — kun JSX-flytting mellom to eksisterende, søsken-komponenter i layouten.

## Dependencies
Ingen.

## Validation Notes
Ikke visuelt testet i nettleser i denne økten (krever innlogget session med @bas.no OTP, ikke tilgjengelig lokalt). Verifisert med `npm run build`/`npx tsc --noEmit`. Visuell bekreftelse gjøres av produkteier etter deploy.
