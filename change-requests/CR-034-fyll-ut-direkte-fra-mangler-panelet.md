# CR-034: Fyll ut manglende felt direkte fra «Dette kan kompletteres»

**Status:** Done (2026-10-22). Pushet som `4831489` (2026-10-21) og verifisert i produksjon av Claude via Claude in Chrome på en test-case som ble slettet. Åpent forbehold: ikke-eier-visning er ikke prøvd med en reell annen konto.
**Created:** 2026-10-21

---

## Business Goal
Gjøre det trivielt å komplettere en case over tid: ett klikk på det som mangler, fyll ut det ene feltet, lagre — uten å åpne hele redigeringsskjemaet. Støtter visjonens jobb nr. 3 («komplettere eller forbedre en case») og kjerneprinsippet «Ikke ferdig er bedre enn ikke registrert». Neste steg etter CR-033 (enklere skjema).

## Problem Statement
Case-siden viser allerede «Dette kan kompletteres» med chips for det som mangler (Bransje, Kanal, Case-type, Problem / kontekst, Løsning, Effekt eller læring, Kundevennlig beskrivelse). Chipsene er bare tekst. For å fylle ut ett enkelt felt må eieren trykke «Rediger», finne riktig kort i et skjema med mange felt, fylle ut, og lagre. Det er flere steg enn nødvendig for en liten, vanlig handling, og terskelen gjør at casen blir stående ufullstendig.

## Proposed Solution
Gjør chipsene i «Dette kan kompletteres» **klikkbare for eier og admin**. Et klikk åpner et lite redigeringsfelt rett i panelet, kun for det aktuelle feltet:

| Chip | Redigering i panelet |
|---|---|
| Bransje | nedtrekk |
| Kanal | søkbart flervalg (`MultiSelect` fra CR-033) |
| Case-type | søkbart flervalg |
| Problem / kontekst | tekstboks |
| Løsning | tekstboks |
| Effekt eller læring | to tekstbokser (Effekt, Læring); minst én må fylles ut for å lagre |
| Kundevennlig beskrivelse | tekstboks |
| «NDA er satt — kan ikke brukes i presentasjoner» | ikke redigerbar (informasjon, ikke manglende felt) |

Oppførsel:
- Kun ett felt åpent om gangen. Knappene «Lagre» og «Avbryt». «Lagre» er deaktivert til noe er fylt ut.
- Lagring sender kun de aktuelle feltene via eksisterende `PATCH /api/cases/[id]` (API-et støtter delvis oppdatering og håndhever allerede eier/admin). Deretter `router.refresh()`, slik at chipen forsvinner og case-siden viser innholdet.
- Feil (f.eks. 403, nettverk) vises i panelet uten å miste det brukeren skrev.
- Brukere uten redigeringsrett ser chipsene som i dag (ren tekst).
- Tastatur: Enter i et enkeltlinjefelt/flervalg sender ikke noe uventet; Escape avbryter.

**Teknisk tilnærming:** `getMissingInfo` får et strukturert søsken (`getMissingItems`) som returnerer `{ id, label }` per mangel (id = f.eks. `industry`, `channels`, `caseTypes`, `problem`, `solution`, `effectOrLearning`, `customerFacingSummary`, `nda`), og `getMissingInfo` utledes fra den slik at eksisterende label-utdata og tester er uendret. En ren funksjon bygger PATCH-payloaden per id (og avgjør om «Lagre» er aktiv). Ny klientkomponent `MissingInfoPanel` bruker disse. Ingen skjemaendring, ingen nye avhengigheter, ingen API-endring.

**Utenfor scope (egne CR-er):** samme klikk-for-å-fylle-ut på Oppfølging- og Mine caser-sidene, statusstyrt sjekkliste øverst i redigeringsskjemaet, caseformat/maler, bransjeforslag, autolagrede utkast.

## Impact Analysis

### Affected Specs
- [ ] specs/vision.md
- [x] specs/requirements.md — FR-MISS-001–003 beholdes; ny FR-MISS-004: «Eier og admin kan fylle ut et manglende felt direkte fra mangler-panelet uten å åpne redigeringsskjemaet.»
- [ ] specs/entities.md
- [ ] specs/flows.md
- [ ] specs/architecture.md
- [ ] specs/api.yaml
- [x] specs/ui-spec.md — ny skjerm-seksjon «Case-side: Dette kan kompletteres» (klikkbare chips, per-felt redigering)
- [ ] specs/nfr.md

### Affected Components
- `lib/cases.ts` — `getMissingItems` (ny), `getMissingInfo` utledes fra den (uendret utdata)
- `lib/case-form.ts` (eller ny `lib/missing-fields.ts`) — ren funksjon for payload per mangel-id og «kan lagres»-sjekk
- `components/cases/MissingInfoPanel.tsx` — ny klientkomponent
- `app/(app)/case/[id]/page.tsx` — bytter ut det statiske panelet med `MissingInfoPanel`
- Gjenbruk: `components/cases/MultiSelect.tsx`
- Tester: `lib/cases.test.ts` (utvides), ny test for payload-logikken

### Database Impact
Ingen.

### API Impact
Ingen endring. Gjenbruker `PATCH /api/cases/[id]` (delvis oppdatering, eier/admin-sjekk).

### UX Impact
Case-siden: chips får klikkbar affordance (markør, fokusring, «+»-hint) for de med redigeringsrett; per-felt redigering i panelet. Ingen endring for andre brukere.

### Security Impact
Ingen ny tilgangssti; all skriving går via eksisterende PATCH som håndhever eier/admin og bruksrettighetslåsen (CR-021). UI skjuler redigering for andre, men er ikke den eneste beskyttelsen.

### Performance Impact
Ubetydelig (ett PATCH-kall pluss `router.refresh()`).

---

## Acceptance Criteria
- [x] Eier og admin kan klikke en chip og fylle ut det feltet direkte; chipen forsvinner etter lagring og innholdet vises på siden (verifisert i produksjon: lagret verdi bekreftet via `GET /api/cases/[id]` etter hver lagring)
- [x] Alle redigerbare chips fungerer: Bransje, Kanal, Case-type, Problem / kontekst, Løsning, Effekt eller læring (to felt, minst ett), Kundevennlig beskrivelse (alle sju verifisert i produksjon, hver for seg, og hver lagring rørte kun sitt eget felt)
- [x] NDA-meldingen er ikke klikkbar (en `span`, ikke en knapp; verifisert i nettleser og i enhetstest)
- [x] Ikke-eiere (uten admin) ser ren tekst uten klikk-/redigeringsmulighet (verifisert lokalt: 0 knapper, ingen «+»); API-et avviser fortsatt PATCH fra dem (403, dekket av eksisterende PATCH-tester fra CR-032). Ikke testet med en reell annen brukerkonto
- [x] «Lagre» er deaktivert til noe er fylt ut; Escape/Avbryt forkaster; kun ett felt åpent om gangen
- [x] Feil ved lagring vises i panelet og bevarer det brukeren skrev (403 → «Du har ikke tilgang …», nettverksfeil → «Noe gikk galt …», teksten bevart, «Lagre» aktiv igjen)
- [x] `getMissingInfo` gir uendret utdata (eksisterende tester grønne uendret; i tillegg en test som beviser at den er identisk med labels fra `getMissingItems`)
- [x] `npm test` (210), `npx tsc --noEmit`, `npm run build` grønt; lockfile og `package.json` uendret
- [x] Verifisert i faktisk nettleser (Claude in Chrome) mot produksjon på en test-case som ble slettet etterpå (se Validation Notes)
- [x] `specs/requirements.md` (FR-MISS-004) og `specs/ui-spec.md` oppdatert

## Required Tests
- [ ] Unit: `getMissingItems` (alle ids, rekkefølge, NDA-elementet, tomme strenger/lister) og at `getMissingInfo` er uendret; payload-bygger per id (inkl. «Effekt eller læring» med bare ett felt, trimming, tom → ikke lagrbar)
- [ ] Integration: ingen ny rute; eksisterende `PATCH`-tester dekker tilgang og delvis oppdatering (verifiseres at delvis payload kun endrer de angitte feltene)
- [ ] E2E: manuell/Chrome mot produksjon etter deploy; `docs/SMOKE-TEST.md` utvides med «fyll ut fra mangler-panelet»

## Rollback Strategy
Ren frontend-endring uten skjema- eller API-endring. Rollback = `git revert` + «Redeploy»; ingen datapåvirkning.

## Migration Strategy
Ingen.

## Risks
- **Test av «ikke-eier»:** jeg har kun en innlogget bruker (produkteier, trolig admin/eier). Ikke-eier-visningen og 403 verifiseres derfor med enhetstest/PATCH-test og kodegjennomgang, ikke i nettleser med en annen konto (samme begrensning som eierbytte-testen i CR-025).
- **Klientkomponent uten komponenttester** (ingen jsdom/testing-library, bevisst, jf. CR-033): ren logikk i `lib/` enhetstestes; selve UI-et verifiseres i nettleser.
- **To redigeringssteder** (panelet og skjemaet) kan gi uenighet om hva som er «lagret»; mitigert av `router.refresh()` etter lagring og at panelet kun skriver feltene det eier.
- **Samtidige redigeringer** (last-write-wins) finnes allerede og endres ikke.

## Dependencies
Bygger på CR-033 (`MultiSelect`, `lib/case-form.ts`). Ingen nye npm-pakker.

## Validation Notes

**Implementert lokalt 2026-10-21 (ikke pushet):** nye `lib/missing-fields.ts` (+ test), `getMissingItems` i `lib/cases.ts` (+ tester; `getMissingInfo` utledes og er uendret), `components/cases/MissingInfoPanel.tsx`, case-siden bruker panelet. Ingen API-, skjema- eller avhengighetsendring. 210 tester (23 nye), `tsc`/`build`/lint på endrede filer grønt.

**Mutasjonssjekk (4, alle fanget):** tom «læring» overskriver ved lagring av «effekt»; utrimmet/tom tekst lagres; NDA gjort redigerbar; NDA-elementet får feil id.

**Lokal visuell verifisering** (midlertidig forhåndsvisning, slettet før commit; `fetch` til PATCH fanget): sju klikkbare chips (+ NDA som vanlig tekst); editor åpner med fokus i feltet og «Lagre» deaktivert; Bransje → `{"industry":"retail"}`; Kanal via tastatur (`sm` + Enter) fungerer; «Effekt eller læring» med bare Effekt → kun `{"resultSummary":"Fiktiv effekt æøå"}` (trimmet, ingen `learning`); 403 og nettverksfeil gir feilmelding og bevarer teksten; `canEdit=false` gir 0 knapper.

**Feil funnet og rettet underveis:** Escape for å lukke forslagslisten i `MultiSelect` boblet opp og lukket hele editoren (forkastet valget). Rettet i `MultiSelect`: mens listen er åpen lukker Escape bare listen (`stopPropagation`); er den allerede lukket, bobler Escape opp. Verifisert (første Escape: editor åpen, chip beholdt, liste lukket; andre Escape: editor lukket, ingen PATCH). Rettelsen gjelder også `MultiSelect` i redigeringsskjemaet (CR-033), uten bivirkning der.

**Produksjonsverifisering (2026-10-22, Claude in Chrome; test-case «TEST CR-034 mangler-panel (slettes)», kunde «TESTKUNDE CR-034»):** Første forsøk 2026-10-21 ble avbrutt fordi Chrome-utvidelsen mistet forbindelsen (ingenting ble opprettet; bekreftet ved å sjekke at ingen «TESTKUNDE CR-034» lå igjen, biblioteket 7 caser). Etter gjenoppkobling: ny versjon bekreftet live (panelet med «+»-chips på case-siden). Resultater: (1) chipsene vises som «+ Bransje», «+ Case-type», «+ Kanal», «+ Problem / kontekst», «+ Løsning», «+ Effekt eller læring», «+ Kundevennlig beskrivelse». (2) Bransje: fokus i feltet, «Lagre» deaktivert når tomt; lagret `industry: retail`, chip borte, siden viser Retail. (3) Kanal: `sm` + Enter, første Escape lukket bare listen (editor åpen, SMS-chip beholdt — Escape-rettelsen fungerer i produksjon), lagret `channels: ["sms"]`, bransje urørt. (4) Case-type: lagret `["automation"]`, de andre urørt. (5) Problem: **Avbryt** lagret ingenting (chip igjen, DB `null`), gjenåpning ga tomt utkast; deretter lagret trimmet `"Fiktiv problemtekst (CR-034-test) æøå"`, løsning urørt. (6) Effekt eller læring med bare Effekt: `resultSummary` lagret, `learning` forble `null`, problem urørt. (7) Løsning og Kundevennlig beskrivelse lagret hver for seg. (8) Til slutt: alle felt satt, panelet «Dette kan kompletteres» forsvant, status urørt (`started`). (9) Sletting (200 → 404), biblioteket tilbake på 7, ingen «TESTKUNDE» igjen.

**Ikke verifisert:** ikke-eier-visning med en reell annen konto (kun enhetstest/lokal forhåndsvisning: 0 knapper, ingen «+»; API-et avviser PATCH fra ikke-eiere med 403, dekket av eksisterende tester). Feilhåndtering (403/nettverk) er verifisert lokalt, ikke utløst i produksjon.

**Dokumentasjon:** `docs/SMOKE-TEST.md` utvidet med skjemaflyten (CR-033, steg 1b) og fyll-ut-fra-panel (CR-034, steg 1c).
