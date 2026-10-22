# CR-036: Eier går rett til «Rediger» når de åpner en case

**Status:** In Progress (godkjent av produkteier 2026-10-22: «Når du klikker inn på en case du eier så skal du rett på "rediger" bildet. det er et unødvendig ekstra steg»)
**Created:** 2026-10-22

---

## Business Goal
Fjerne et unødvendig steg: den som eier en case åpner den typisk for å fylle ut eller endre den, så de skal lande rett i redigeringsvisningen. Støtter «komplettere over tid» og «ikke ferdig er bedre enn ikke registrert».

## Problem Statement
Å klikke på en case åpner alltid den skrivebeskyttede case-siden, og eieren må deretter trykke «Rediger» for å gjøre noe. For eieren er det et ekstra klikk hver gang.

## Proposed Solution
**Eier åpner redigeringsvisningen direkte.** `GET /case/[id]` omdirigerer (server-side) til `/case/[id]/rediger` når innlogget bruker er caseeier. Dette gjelder alle veier inn: bibliotek, Mine caser, Oppfølging, direkte lenker, lenken i e-posten til eieren, og rett etter at en ny case er opprettet.

Valg som følger av dette (alle med minste mulige endring):
- **Bare eier** omdirigeres (ikke admin på andres caser): en admin som åpner en annen persons case ser fortsatt den skrivebeskyttede siden og kan trykke «Rediger».
- **Den skrivebeskyttede visningen er fortsatt tilgjengelig** for eieren via `/case/[id]?visning=1`. Lenker som tidligere gikk tilbake til visningen bruker denne: «← Tilbake til case», «Avbryt», og lagring i redigeringsskjemaet sender brukeren til visningen (som i dag). Uten dette ville eieren aldri kommet til visningssiden, og «Avbryt»/«Lagre» ville sendt dem rett tilbake til skjemaet.
- Ikke-eiere påvirkes ikke.
- Ren beslutningslogikk i `lib/case-routing.ts` (enhetstestet).

**Utenfor scope:** å endre hva som skjer etter «Lagre» (blir på visningen som før), å la admin også gå rett til redigering, å fjerne den skrivebeskyttede visningen.

## Impact Analysis

### Affected Specs
- [ ] specs/vision.md
- [x] specs/requirements.md — ny FR-CASE-009: eier åpner redigeringsvisningen direkte; visning via `?visning=1`
- [ ] specs/entities.md
- [ ] specs/flows.md
- [ ] specs/architecture.md
- [ ] specs/api.yaml
- [x] specs/ui-spec.md — kort beskrivelse av inngangsflyten
- [ ] specs/nfr.md

### Affected Components
- `lib/case-routing.ts` (ny) + `lib/case-routing.test.ts` (ny)
- `app/(app)/case/[id]/page.tsx` — omdirigering for eier (leser `searchParams.visning`)
- `app/(app)/case/[id]/rediger/page.tsx` — «Tilbake»-lenken peker på `?visning=1`
- `components/cases/EditCaseForm.tsx` — «Avbryt» og lagring peker på `?visning=1`
- `docs/SMOKE-TEST.md`

### Database Impact
Ingen.

### API Impact
Ingen.

### UX Impact
Eier lander i redigering når de klikker på en case, også rett etter opprettelse. Eier som vil se den skrivebeskyttede siden bruker «Tilbake»/«Avbryt»/lagring eller `?visning=1`. Noen få ting som bare finnes på visningssiden (f.eks. blyanten for å endre eget navn, «Eksporter»-knappen, mangler-panelet fra CR-034) er mindre synlige for eieren; eksport finnes i ⋯-menyen i redigering.

### Security Impact
Ingen endring i tilgang: omdirigeringen går til en side som allerede krever eier eller admin, og ikke-eiere sendes fortsatt tilbake til visningen.

### Performance Impact
Ubetydelig (en omdirigering).

---

## Acceptance Criteria
- [ ] Eier som åpner en case (fra bibliotek, Mine caser, Oppfølging eller direkte lenke) havner på `/case/[id]/rediger`
- [ ] Rett etter at en ny case er opprettet havner eieren i redigering
- [ ] `/case/[id]?visning=1` viser den skrivebeskyttede siden for eieren (ingen omdirigering)
- [ ] «← Tilbake til case», «Avbryt» og «Lagre» i redigering sender eieren til visningen (`?visning=1`), uten løkke
- [ ] Ikke-eier (inkl. admin på andres caser) ser den skrivebeskyttede siden uten omdirigering; ikke-eier som åpner `/rediger` sendes fortsatt til visningen
- [ ] `npm test`, `npx tsc --noEmit`, `npm run build` grønt; lockfile uendret
- [ ] Verifisert i faktisk nettleser (Claude in Chrome) mot produksjon på en test-case som slettes etterpå
- [ ] `specs/requirements.md` og `specs/ui-spec.md` oppdatert

## Required Tests
- [ ] Unit: `shouldOpenInEditMode` (eier, ikke-eier, admin uten eierskap, `visning`-parameter, e-postsammenligning)
- [ ] Integration: ingen ny rute
- [ ] E2E: Chrome mot produksjon (se over)

## Rollback Strategy
Ren frontend-/serverkomponent-endring uten skjema- eller API-endring. Rollback = `git revert` + «Redeploy».

## Migration Strategy
Ingen.

## Risks
- **Eieren kommer ikke lenger «naturlig» til visningssiden**; mitigert av `?visning=1`-lenkene og at «Avbryt»/«Lagre» fører dit.
- **Omdirigerings-løkke** hvis en lenke tilbake til visningen mangler `?visning=1` — dekket ved å gå gjennom alle lenker (se Affected Components) og verifisere i nettleser.
- **Admin/ikke-eier-forløpet kan ikke testes med en reell annen konto** (kun én bruker tilgjengelig); dekket av enhetstest og kodegjennomgang.
- Lenken i varslings-e-posten til eieren åpner nå redigering; vurdert som ønsket.

## Dependencies
Ingen. Bygger på eksisterende redigeringsside.

## Validation Notes

**Implementert lokalt 2026-10-22 (ikke pushet):** `lib/case-routing.ts` (`shouldOpenInEditMode`, `viewHref`) + test; `case/[id]/page.tsx` omdirigerer eieren til `/rediger` med mindre `?visning` er satt; `rediger/page.tsx` («← Tilbake til case»), `EditCaseForm` («Avbryt» og etter lagring) peker på `viewHref`. Ingen API-, skjema- eller avhengighetsendring. Alle lenker til `/case/[id]` er gått gjennom: bibliotek-kort, Mine caser/Oppfølging-titler og lenken i varslings-e-posten til eieren åpner nå redigering for eieren (ønsket); `case/ny` sender eieren til redigering rett etter opprettelse; «Rediger»-knappen på visningssiden er uendret.

**Verifisering lokalt:** 211 tester (7 nye for beslutningslogikken, inkl. tom e-post), `tsc`, `next build` grønt; lint på endrede filer uten nye funn; lockfile uendret. 5 mutasjoner fanget (alle omdirigeres; `?visning` ignoreres → løkke; tom bruker matcher tom eier; `viewHref` mister flagget → løkke; …). Første mutasjonskjøring avslørte en test som manglet (tom bruker vs. tom eier); lagt til og re-verifisert.

**Valg tatt av Claude (til gjennomgang):** bare eier omdirigeres (ikke admin på andres caser); etter «Lagre»/«Avbryt»/«Tilbake» havner eieren på visningen som før; eieren kommer til visningen via `?visning=1`. Alternativet «bli i redigering etter lagring» er IKKE gjort og kan være et naturlig neste steg.

**Gjenstår:** push → Chrome-test mot produksjon (test-case slettes etterpå): åpne via bibliotek/direkte lenke → `/rediger`; `?visning=1` → visning; Tilbake/Avbryt/Lagre → visning uten løkke; ny case → redigering → Done. Ikke-eier/admin kan ikke testes med en reell annen konto (enhetstest).
