# CR-037: Bli stående på redigeringssiden etter «Lagre»

**Status:** Done (2026-10-22; pushet `6af9f93`, verifisert i produksjon av Claude via Chrome: «Lagre» blir på siden, «✓ Lagret», «Lukk», «Lagret» forsvinner ved endring, verdier i DB; feilsituasjoner verifisert senere samme dag, se under) (godkjent av produkteier 2026-10-22: «Man bør bli stående på siden når man lagrer»)
**Created:** 2026-10-22

---

## Business Goal
Redigering er nå hovedskjermen for eieren (CR-036). Da skal man ikke kastes ut til den skrivebeskyttede siden hver gang man lagrer, men kunne fylle ut, lagre og fortsette. Støtter «komplettere over tid».

## Problem Statement
Etter «Lagre» i redigeringsskjemaet sendes brukeren til `/case/[id]?visning=1`. Det avbryter flyten når man bare vil lagre underveis, og man må trykke «Rediger» for å fortsette.

## Proposed Solution
Etter en vellykket lagring:
- Brukeren **blir stående på siden** (ingen navigasjon, scrollposisjon og åpne kort beholdes).
- Siden oppdateres i bakgrunnen (`router.refresh()`) slik at serverdata er ferske; skjemaets verdier er allerede de lagrede.
- Et tydelig, vedvarende «✓ Lagret» vises i handlingslinjen (`role="status"`), og forsvinner så snart brukeren endrer noe igjen (da er det ulagrede endringer).
- Knappen «Avbryt» heter «Lukk» når alt er lagret (den fører fortsatt til den skrivebeskyttede visningen, `?visning=1`).
- Feil ved lagring vises som før og gir ikke «Lagret».

Konsekvens verdt å vite: hvis eieren overfører eierskap til en annen og lagrer, mister de redigeringsrett; oppdateringen sender dem da til visningen (samme sjekk som ved første innlasting).

**Utenfor scope:** advarsel om ulagrede endringer ved navigering bort; autolagring.

## Impact Analysis

### Affected Specs
- [ ] specs/vision.md
- [x] specs/requirements.md — FR-CASE-009: «Lagre» beholder brukeren i redigering
- [ ] specs/entities.md
- [ ] specs/flows.md
- [ ] specs/architecture.md
- [ ] specs/api.yaml
- [x] specs/ui-spec.md — oppføringen for «Lagre»/«Lukk» og «Åpne en case»
- [ ] specs/nfr.md

### Affected Components
- `components/cases/EditCaseForm.tsx` (`handleSave`, `set`, handlingslinjen)
- `docs/SMOKE-TEST.md`

### Database Impact
Ingen.

### API Impact
Ingen (samme `PATCH /api/cases/[id]`).

### UX Impact
Bli på siden etter lagring med «Lagret»-bekreftelse; «Avbryt» → «Lukk» når alt er lagret.

### Security Impact
Ingen.

### Performance Impact
Ett `router.refresh()` per lagring (som tidligere sidenavigasjonen).

---

## Acceptance Criteria
- [ ] «Lagre» holder brukeren på `/case/[id]/rediger`; ingen navigasjon
- [ ] «✓ Lagret» vises etter vellykket lagring og forsvinner ved neste endring; ikke ved feil
- [ ] «Avbryt» heter «Lukk» når alt er lagret og fører til `?visning=1`
- [ ] De lagrede verdiene er i databasen og vises ved neste innlasting; åpne kort og scrollposisjon beholdes etter lagring
- [ ] Validerings- og serverfeil vises som før uten «Lagret»
- [ ] `npm test`, `npx tsc --noEmit`, `npm run build` grønt; lockfile uendret
- [ ] Verifisert i faktisk nettleser (Claude in Chrome) mot produksjon på en test-case som slettes etterpå
- [ ] `specs/requirements.md` og `specs/ui-spec.md` oppdatert

## Required Tests
- [ ] Unit: ingen ny ren logikk (endringen er tilstand i en klientkomponent; ingen komponenttester i prosjektet, bevisst, jf. CR-033)
- [ ] Integration: ingen endring i API
- [ ] E2E: Chrome mot produksjon (se over)

## Rollback Strategy
Ren frontend-endring. Rollback = `git revert` + «Redeploy».

## Migration Strategy
Ingen.

## Risks
- **Ingen komponenttester:** oppførselen verifiseres kun i nettleser.
- **Ulagrede endringer kan gå tapt** ved å navigere bort uten advarsel (uendret fra før, men nå mer synlig fordi man blir stående); «Lagret»-indikatoren gjør statusen tydelig.
- **Eierskapsoverføring** sender brukeren til visningen etter lagring (forklart over).

## Dependencies
Bygger på CR-036.

## Validation Notes

**Implementert lokalt 2026-10-22 (ikke pushet):** i `EditCaseForm.tsx` erstatter `setSaved(true); router.refresh();` den tidligere `router.push(viewHref(...))` etter vellykket lagring; ny tilstand `saved` som nullstilles av `set()` (alle skjemaendringer går via `set`); «Avbryt» → «Lukk» når `saved`; «✓ Lagret» (`role="status"`) i handlingslinjen, ikke ved feil. En endringsteller (`editCountRef`) sikrer at «Lagret» bare vises hvis ingenting ble endret mens lagringen pågikk (ellers ville nyeste endring feilaktig vist som lagret). Ingen API-, skjema- eller avhengighetsendring.

**Verifisering lokalt:** 211 tester ✓ (uendret, ingen ny ren logikk), `tsc`, `next build` ✓, lint på endrede filer uten funn, lockfile uendret. Specs (FR-CASE-009, ui-spec) og `docs/SMOKE-TEST.md` oppdatert.

**Ikke verifisert ennå:** selve oppførselen i nettleser — ingen komponenttester finnes (bevisst, jf. CR-033), så dette må sees i Chrome mot produksjon etter deploy.

**Feilsituasjoner verifisert i produksjon (2026-10-22, Chrome, test-case «TEST CR-037 lagrefeil (slettes)», slettet etterpå):** etter en vellykket lagring («✓ Lagret», «Lukk») ga (1) simulert serverfeil (`PATCH` → 500 med `{error}`, injisert via `window.fetch` i nettleseren, ikke mot serveren) feilmeldingen «Simulert serverfeil», ingen «Lagret», og «Lukk» ble «Avbryt»; (2) simulert nettverksfeil «Noe gikk galt. Prøv igjen.», ingen «Lagret»; (3) tom tittel (ekte klientvalidering) «Kundenavn, tittel og beskrivelse er påkrevd.», ingen forespørsel sendt, ingen «Lagret». Ingen av de mislykkede lagringene endret databasen (tittel uendret, bransje fortsatt tom). Merk: feilene 1–2 er simulert på klientsiden; en ekte serverfeil er ikke fremprovosert.

**(Opprinnelig plan) Gjenstår:** push → Chrome-test mot produksjon (test-case slettes etterpå): fyll ut → «Lagre» → blir på `/rediger`, «✓ Lagret», «Lukk»; endre noe → «Lagret» forsvinner, «Avbryt»; feil → ingen «Lagret»; verdier i DB; åpne kort/scroll beholdt; «Lukk» → `?visning=1` → Done.
