# CR-033: Enklere utfylling av casedetaljer (redigeringsskjema) og fjerning av Pitchtekst

**Status:** Done (2026-10-21). Deploy A (`3ab0f1d`) verifisert i produksjon; deploy B (`9cb65b2`, drop av `pitchText`) pushet og funksjonstestet i produksjon. Migreringen er bekreftet anvendt i Coolify-loggen (skjermbilde fra produkteier 2026-10-21: «4 migrations found», «Applying migration `20261021120000_drop_case_pitchtext`», «All migrations have been successfully applied», Next.js 16.4.2 Ready). (Godkjent av produkteier 2026-10-21: «Begynn med din anbefaling først», Pitchtekst droppes helt, tap av data er greit — alle caser er testcaser)
**Created:** 2026-10-21

---

## Business Goal
Gjøre det raskt og lett å fylle ut casedetaljer i alt fra en liten A/B-test til et stort prosjekt, uten å måtte forholde seg til felter og valg som ikke er relevante for den aktuelle casen. Støtter visjonens kjerneprinsipp «Ikke ferdig er bedre enn ikke registrert» og jobb nr. 3 («komplettere eller forbedre en case»).

## Problem Statement
Redigeringsskjemaet (`components/cases/EditCaseForm.tsx`) er én lang side der alt har lik vekt og alt alltid vises:
- 9 tekstbokser (Beskrivelse, Problem, Løsning, Effekt, Læring, Relevans, Pitchtekst, Kundevennlig beskrivelse, Interne notater), 8 tekstfelt, 4 nedtrekk og 40 valgknapper (Kanal 14, Case-type 14, Effekttype 12).
- Samme skjema for en liten test og et stort prosjekt: alle åtte måle-feltene, innsalg og kundetekst vises uansett.
- Overlappende begreper (Effekt / Effekttype / Effektmåling) og tre tekster for tre lesere som ser like ut.
- Skjemaet bruker ikke det systemet allerede vet om hva som mangler (`getMissingInfo`, FR-CASE-004/005).
- Pitchtekst brukes ikke i praksis og tas bort.

## Proposed Solution
Første leveranse («anbefaling først» fra forslagsrunden 2026-10-21): punkt 1, 2, 4 og deler av 7. Ingen ny datamodell utover at Pitchtekst fjernes.

1. **Vis bare det som er relevant, legg til resten.** Kjernen vises alltid (kunde, tittel, beskrivelse, status, ansvarlig). Valgfrie blokker — *Relevans, Effektmåling, Kundevennlig tekst, Interne notater* — vises bare hvis de har innhold eller brukeren har lagt dem til med «+ Legg til»-knapper.
2. **Seksjoner som sammenleggbare kort med fremdrift.** Hvert kort viser fremdrift («2 av 3», «✓», «tom») i overskriften og et kort sammendrag når det er lukket. Første ufullstendige kort er åpent; resten lukket. Fremdrift bruker samme krav som FR-CASE-004/005.
3. **Færre valg.** Kanal og Case-type blir søkbare flervalg (valgte vises som fjernbare chips) i stedet for 14 knapper hver. Effektmåling viser *Hva ble målt, Resultat, Evidensnivå* som standard; *Før, Etter, Periode, Datakilde* ligger under «Flere måledetaljer» (åpen hvis noe er utfylt). Effekttype flyttes inn i Effektmåling-blokken.
4. **Småting:** «Eksporter» og «Slett case» flyttes til en «⋯»-meny (slette-bekreftelsen er uendret); sticky Lagre-linje; kundenavn med autofullføring fra eksisterende caser på «Ny case».
5. **Pitchtekst fjernes helt:** fra UI, API (tillatt-liste, søk), eksport, Oppfølging-siden («Mangler pitchtekst») og datamodellen.

**Bevisst utsatt (senere CR-er):** statusstyrt sjekkliste øverst (forslag 3), klikk-for-å-fylle-ut direkte på case-siden (forslag 6), caseformat/maler, bransjeforslag fra tidligere caser, autolagrede utkast.

### Utrulling i to deploys (expand/contract)
Prisma-klienten velger alle kolonner eksplisitt, så å droppe en kolonne mens en gammel container fortsatt kjører ville gitt feil under utrullingen. Derfor:
- **Deploy A:** all kode + `pitchText` fjernet fra `schema.prisma`, **uten** migrering. Databasen beholder kolonnen (nullable, ubrukt) — ufarlig.
- **Deploy B (egen commit etter at A er bekreftet):** migrering `ALTER TABLE "Case" DROP COLUMN "pitchText"`, generert statisk, BOM-fri (lærdom fra ISSUE-011).

## Impact Analysis

### Affected Specs
- [ ] specs/vision.md
- [x] specs/requirements.md — FR-LIB-002, FR-OPPS-001 (pitchtekst fjernes), FR-PUB-002/NFR-002 (ordet pitchtekst fjernes), FR-CASE-003 (seksjoner vises ved behov)
- [ ] specs/entities.md
- [ ] specs/flows.md
- [ ] specs/architecture.md
- [ ] specs/api.yaml
- [x] specs/ui-spec.md — fylles ut for skjermen «Rediger case» (stub i dag; «No UI may be implemented that is not defined here»)
- [ ] specs/nfr.md

### Affected Components
- `components/cases/EditCaseForm.tsx` — omskrives (seksjonskort, blokkvelger, sticky lagre-linje, ⋯-meny)
- Nye: `lib/case-form.ts` (ren logikk: fremdrift per seksjon, hvilke valgfrie blokker som er synlige, første ufullstendige), `components/cases/MultiSelect.tsx` (søkbart flervalg), `components/cases/CollapsibleCard.tsx`
- `app/(app)/case/ny/page.tsx` — kundenavn-autofullføring
- `app/api/customers/route.ts` — ny, `GET` distinkte kundenavn (innlogget)
- `app/api/cases/route.ts` (søk), `app/api/cases/[id]/route.ts` (tillatt-liste), `lib/case-export.ts`, `app/(app)/oppfolging/page.tsx` — `pitchText` fjernes
- `prisma/schema.prisma` + ny migrering (deploy B)
- Tester: `lib/case-form.test.ts`, `app/api/customers/route.test.ts`; justeringer i `lib/case-export.test.ts` og `app/api/cases/[id]/route.test.ts` ved behov

### Database Impact
Kolonnen `Case.pitchText` droppes (deploy B). Dataene i den går tapt — bekreftet akseptabelt av produkteier (testdata). Ingen andre skjemaendringer.

### API Impact
`PATCH /api/cases/[id]` slutter å godta `pitchText` (ignoreres av tillatt-listen). `GET /api/cases?q=` søker ikke lenger i `pitchText`. Ny `GET /api/customers`.

### UX Impact
Større endring i redigeringsskjemaet; case-siden og biblioteket er uendret. Eksisterende innhold i valgfrie blokker vises automatisk (ingenting skjules som har data).

### Security Impact
Ny rute `/api/customers` krever innlogging og returnerer kun kundenavn (samme tilgangsnivå som biblioteket, som er synlig for alle `@bas.no`-brukere). Ingen endring i tilgangskontroll for redigering.

### Performance Impact
`/api/customers` gjør ett `DISTINCT`-oppslag på `customerName`; ubetydelig ved dagens datamengde.

---

## Acceptance Criteria
- [x] Pitchtekst er borte fra UI, API-tillatt-liste, søk, eksport, Oppfølging og `schema.prisma` (deploy A ✓, verifisert i produksjon 2026-10-21), og migreringen som dropper kolonnen er pushet (deploy B, `9cb65b2`). Anvendelsen er bekreftet i Coolify-loggen (se Validation Notes)
- [x] Nytt skjema: kjernefelt alltid synlige; valgfrie blokker kun synlige når de har innhold eller er lagt til; «+ Legg til»-knapper for de som mangler
- [x] Hver seksjon viser fremdrift; første ufullstendige er åpen; lukkede kort viser sammendrag
- [x] Kanal og Case-type er søkbare flervalg (tastatur: skriv for å filtrere, Enter velger, chips kan fjernes); alle eksisterende enum-verdier kan fortsatt velges (alle valg kommer fra de samme label-tabellene som før)
- [x] Effektmåling: tre felt som standard + «Flere måledetaljer»; Effekttype ligger inne i blokken; alle data vises og lagres uendret
- [x] «⋯»-meny med Eksporter og Slett case (slette-bekreftelsen og fil/lenke-listen som før); sticky Lagre/Avbryt
- [x] Autofullføring av kundenavn på «Ny case» (verifisert i produksjon: 7 unike, ikke-tomme forslag)
- [x] Ingen eksisterende data går tapt bortsett fra `pitchText`: en case med alle felt utfylt kan åpnes, lagres uendret og gir identisk data (lokalt: utgående PATCH-payload identisk med utgangsdata; produksjon: case-siden identisk før/etter «lagre uten endring», 753 tegn)
- [x] `npm test` grønt (187 tester), `npx tsc --noEmit` og `npm run build` grønt; lockfile uendret (ingen nye avhengigheter)
- [x] Verifisert i faktisk nettleser (Claude in Chrome) på en test-case som ble slettet etterpå: opprett, åpne blokker, flervalg (inkl. æøå i filter), lagre, gjenåpne, lagre uendret, ⋯-meny, eksport, slett
- [x] `specs/ui-spec.md` og `specs/requirements.md` oppdatert

## Required Tests
- [ ] Unit: `lib/case-form.ts` (fremdrift, synlige blokker, første ufullstendige), kantverdier (tomme strenger, tomme lister)
- [ ] Integration: `GET /api/customers` (401, distinkt, sortert, trimmer/ignorerer tomme); `PATCH` ignorerer `pitchText`; eksporttekst uten pitchtekst
- [ ] E2E: manuell/Chrome mot produksjon etter deploy (se Acceptance Criteria); `docs/SMOKE-TEST.md` utvides med skjemaflyten

## Rollback Strategy
Deploy A: revert commit(s), «Redeploy» — databasen er uendret, så trygt. Deploy B (kolonne droppet): rollback av koden gir en `pitchText`-kolonne som ikke finnes; gjenoppretting krever en ny migrering som legger kolonnen tilbake (tom). Derfor deploys B først etter at A er bekreftet stabil.

## Migration Strategy
Se «Utrulling i to deploys». Migreringen for B genereres med `prisma migrate diff --from-schema <før> --to-schema <etter> --script`, skrives BOM-fritt (`[System.IO.File]::WriteAllText(..., UTF8Encoding($false))`) og kontrolleres for BOM før commit.

## Risks
- **Oppdagbarhet:** skjulte valgfrie blokker kan gjøre at man glemmer felt. Mitigert av «+ Legg til»-knappene, fremdriftsvisning, og at alt med innhold alltid vises.
- **Flervalg-komponenten** er ny kode (tilgjengelighet, tastatur) uten komponenttester (ingen jsdom/testing-library installert; bevisst ikke lagt til for å unngå flere avhengigheter). Verifiseres i nettleser; ren logikk legges i `lib/` og enhetstestes.
- **Nedetid-vindu:** unngås ved to deploys (se over). Krever to «push» og en bekreftelse imellom.
- **Skjemaets bredde:** nåværende `max-w-2xl` kan bli for trangt for kort-layouten; justeres i implementasjonen.
- Ingen UI-tester finnes fra før; regresjonsrisiko i skjemalagring er reell. Mitigeres av «åpne og lagre uendret»-testen i nettleser og av at API-et ikke endres utover `pitchText`.

## Dependencies
- Ingen nye npm-pakker (bevisst; samme supply-chain-hensyn som CR-031/032).
- Deploy B krever at deploy A er live og bekreftet.

## Validation Notes

**Deploy A** (commit `3ab0f1d`, pushet 2026-10-21): 22 filer, ingen nye avhengigheter, lockfile uendret. `npm test` 187/187, `tsc`, `next build`, lint på endrede filer grønt. 5 mutasjoner av ny kode fanget av tester. Ruten `/api/customers` ga 404 til bygget var live og 200 etterpå.

**Lokal visuell verifisering** (midlertidig forhåndsvisningsside med fiktive data, slettet før commit): flervalg med tastatur (Enter sender ikke skjemaet), chips legges til/fjernes, fremdrift oppdateres live, blokker, ⋯-meny, slette-panel. «Åpne fullt utfylt case og lagre» sendte payload identisk med utgangsdata og uten `pitchText`.

**Produksjonsverifisering** (Claude in Chrome, egen test-case «TEST CR-033 skjema (slettes)», slettet etterpå): «Ny case» med autofullføring (7 unike forslag); redigeringsskjemaet; bransje, kanal (SMS, E-post), case-type, effekttype («økt salg» med æøå i filteret), innhold, effektmåling inkl. «Flere måledetaljer» (Periode, Datakilde), Kundevennlig tekst-blokk; lagring → alle felt vises på case-siden; gjenåpning viser tre ✓, to blokker med sammendrag og kun Relevans/Interne notater under «Legg til»; «lagre uten endring» ga identisk case-side; Oppfølging uten pitchtekst-gruppe; søk (`?q=`) fungerer; `GET /api/cases` har ingen `pitchText`-nøkkel; redigeringssiden for en eksisterende case åpnes (status 200); eksport gir `application/zip`; ⋯-meny → «Slett case …» → bekreftelse → 404 på case og eksport, borte fra biblioteket.

**Funn underveis:** (1) `2>&1` blandet Prismas stderr inn i migrerings-SQL-en første gang (filen begynte med «nod…») — fanget av byte-sjekk, regenerert med kun stdout. (2) Første `git commit` feilet fordi doble anførselstegn i commit-meldingen ble delt opp av PowerShell 5.1; løst med `git commit -F` (ingenting ble committet av feil). (3) `next dev` genererte en `AGENTS.md`, slettet og ikke committet. (4) Eldre lint-feil i `oppfolging/page.tsx` → ISSUE-018 (ikke fra CR-033). (5) Kort ventetid etter push før ny versjon var live (~4–5 min).

**Deploy B** (commit `9cb65b2`, pushet 2026-10-21): `prisma/migrations/20261021120000_drop_case_pitchtext/migration.sql` = `ALTER TABLE "Case" DROP COLUMN "pitchText";` (én setning, kontrollert BOM-fri og byte-identisk med den verifiserte SQL-en). Funksjonstest i produksjon etterpå (Claude in Chrome, test-case «TEST CR-033B migrering (slettes)» slettet etterpå): biblioteket (7 caser), åpne og redigere eksisterende case, Oppfølging; opprette (201), PATCH med mange felt (200, verdier lagret, `pitchText` ignorert og ikke i svaret), case-side og redigeringsside (200), søk, eksport (200), sletting (200 → 404); biblioteket tilbake på 7. **Migrasjonslogg (bekreftet av produkteier via skjermbilde fra Coolify):** `4 migrations found in prisma/migrations` → `Applying migration '20261021120000_drop_case_pitchtext'` → `All migrations have been successfully applied.` → Next.js 16.4.2 Ready (480 ms). Ingen feil. Funksjonstesten alene kunne ikke bevise dette (koden fra deploy A refererer ikke kolonnen), men loggen gjør det.

**Ikke gjort (bevisst utsatt):** statusstyrt sjekkliste øverst, klikk-for-å-fylle-ut direkte på case-siden, caseformat/maler, bransjeforslag fra tidligere caser, autolagrede utkast (se «Proposed Solution»).
