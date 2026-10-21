# CR-032: Minimal automatisert test-suite (Vitest) og skriftlig smoke-test-sjekkliste

**Status:** In Progress (godkjent av produkteier 2026-10-21)
**Created:** 2026-10-20

---

## Business Goal
Gi prosjektet et automatisert sikkerhetsnett for de delene av koden som har størst konsekvens ved regresjon (tilgangskontroll, bruksgodkjenning/samtykke, filhåndtering, datoformatering), slik at endringer — inkl. avhengighetsoppgraderinger som CR-028/CR-031 — kan verifiseres på sekunder i stedet for ved manuell produksjonstesting.

## Problem Statement
Prosjektet har ingen automatiserte tester (CURRENT-STATE.md → Risks, siden 2026-08-04). All verifisering er `npm run build` + `tsc --noEmit` + manuell produksjonstesting. Konsekvenser dokumentert i sessions/:
- To nedetider (ISSUE-011) og tre feilslåtte CR-011-deploys kunne vært fanget før push.
- CR-029 (feil tidssone i e-post) var en regresjon som kun ble funnet av produkteier ved tilfeldig smoke-test etter CR-028.
- CR-031 (2026-10-20) krevde en manuell Chrome-gjennomgang (Reply-To/cc, filopplasting/-nedlasting, eksport, sletting) for å bekrefte at en rutinemessig oppgradering ikke brøt noe — det er nøyaktig det en suite skal ta over for logikken, og en sjekkliste for resten.
- `qa.md` krever tester per CR ("Tests live next to the code"), men det finnes ingen infrastruktur å skrive dem i; alle tidligere CR-er har måttet stå med `Required Tests: —`.

## Proposed Solution
Innføre **Vitest** (TypeScript-native, ingen Babel-/Jest-konfigurasjon, enkel `vi.mock`) og skrive tester i to lag, pluss én dokumentasjonsleveranse. Ingen DB, ingen nettverk, ingen S3, ingen SMTP i testene (jf. `qa.md`: deterministiske, mocks for eksterne tjenester).

### Lag 1 — enhetstester av rene funksjoner (`lib/*.test.ts`)
| Fil | Hva testes | Hvorfor |
|---|---|---|
| `lib/usage-approval.ts` | `sanitizeChoices` (NDA blokkerer alt; «kun anonymisert» blokkerer alt; ellers uendret; utrygge/manglende felter → `false`), `buildApprovalText` (URL bygges fra `appUrl`/`caseId`/`token`; med/uten godkjennernavn; inneholder personvern + GDPR-tekst + caseeier-navn/e-post), `buildPrivacyNotice` | Samtykkelogikk (CR-020). Server-side håndheving av gjensidig utelukkelse |
| `lib/cases.ts` | `getMissingInfo` for alle tre lister, inkl. NDA-regel og grenseverdier (tomme arrays/null) | Oppfølging-siden bygger på denne |
| `lib/auth.ts` | `isBasEmail` (case, whitespace, `@bas.no.evil.com`, `@xbas.no`), `nameFromEmail`, `generateOtp` (6 sifre, i område), `hashOtp`/`verifyOtp` (riktig/feil kode) | Innloggingsgrensen (NFR: kun `@bas.no`) |
| `lib/format.ts` | `formatDate` med eksplisitt sommer-/vintertid-datoer i `Europe/Oslo` uavhengig av prosessens `TZ` (regresjonstest for CR-029), `formatBytes` (B/KB/MB-grenser), `formatRelativeDate` med `vi.useFakeTimers` | CR-029-regresjon |
| `lib/storage.ts` | `isAllowedCaseFileType` (alle 7 tillatte kombinasjoner, feil ext/mime-kombinasjon, `.png.exe`, ingen ext, stor/liten bokstav), `slugifyForFilename` (æøå, trunkering 80, kantstreker), `buildCaseZip` (S3-klient mockes: navnekollisjon → `-2`, `-3`; ekstra-oppføringer + filer i samme arkiv) | CR-027: opplastingsgrense og zip-dedup |
| `lib/case-export.ts` | `buildCaseExportText` — alle seksjoner, tom godkjenningshistorikk, flere godkjenninger | CR-025 |

### Lag 2 — route-handler-tester med mocking (`app/api/**/route.test.ts`)
`getSession`, `prisma`, `lib/storage` og `lib/email` mockes med `vi.mock`; handlerne kalles direkte med `NextRequest`. Kun ruter der en feil er sikkerhets- eller samtykkekritisk:

1. `PATCH /api/cases/[id]` — 401 uten sesjon; 404 ukjent case; 403 for ikke-eier uten admin; eier OK; admin OK; **bruksrettighetsfelt droppes når `usageApprovalStatus === "submitted_locked"`** (CR-021) men andre felt går gjennom; `updatedByEmail` settes.
2. `DELETE /api/cases/[id]` — 401/404/403; eier og admin kan slette; `deleteCaseFile` kalles per fil; **en S3-feil (`Promise.allSettled`) hindrer ikke at casen slettes** (dokumenterer dagens atferd; se Risks om orphan-objekter).
3. `POST /api/godkjenning/[caseId]/[token]` — 404 feil token; 409 når status ikke er `open`; 400 uten navn/e-post; 400 uten valg; NDA + andre valg lagres som kun NDA (`sanitizeChoices` brukes på serveren); transaksjon opprettet; e-postfeil stopper ikke svaret (`allSettled`).
4. `POST /api/auth/request-code` — avviser ikke-`@bas.no`; 429 etter 5 forsøk/minutt per e-post (`vi.useFakeTimers` for vindu); alltid gyldig JSON ved intern feil (CR-011).
5. `GET /api/cases/[id]/files/[fileId]` + `DELETE` — 401; 404 når fil tilhører annen case; DELETE 403 for ikke-eier.

### Leveranse 3 — `docs/SMOKE-TEST.md` (manuell sjekkliste)
Skriftlig versjon av gjennomgangen fra 2026-10-20 (ny test-case → bruksgodkjenning til egen adresse → sjekk `reply-to`/`cc`/`from` i mottatt e-post → opplasting/nedlasting/eksport → slett → bekreft 404), for det automatiserte lag ikke dekker (ekte SMTP, S3, DB). Inkl. råd om å bruke tydelig fiktive testdata og slette test-casen etterpå.

### Teknisk oppsett
- `vitest` som devDependency (ev. også `@vitest/coverage-v8` kun hvis dekningsrapport ønskes — ikke et krav). **Ingen** ekstra pakke for path-alias: `@/*` settes via `resolve.alias` i `vitest.config.ts`.
- `vitest.config.ts` (environment `node`, `include: ["**/*.test.ts"]`, `exclude` `node_modules`/`.next`).
- `package.json`: `"test": "vitest run"`, `"test:watch": "vitest"`. **`build`-scriptet endres IKKE** og Dockerfile endres IKKE — tester kjøres lokalt før push, ikke i Coolify-bygget (ville øke byggetid og kunne ta ned produksjon pga. en testfeil uten at koden er feil).
- Testfiler ligger ved siden av koden de tester (`qa.md`). `tsconfig.json` `include` dekker allerede `**/*.ts`, så testene typesjekkes av `tsc --noEmit`/`next build` — verifiseres at `vitest`-typer ikke bryter `next build`.
- Installasjon: samme supply-chain-prosedyre som CR-031 — `npm install --ignore-scripts`, scriptet lockfile-diff (nye pakker, `resolved` utenfor registry.npmjs.org, `hasInstallScript`), `npm audit` før/etter. Vitest drar inn `vite`/`rollup`/`esbuild` med plattformspesifikke valgfrie pakker — forventet, men gjennomgås.

### Utenfor scope (bevisst)
- **Browser E2E (Playwright):** krever auth-/OTP-håndtering og en testdatabase; vurderes først når lag 1–2 er på plass.
- **Integrasjonstester mot ekte Postgres/S3/SMTP:** ingen lokal Postgres tilgjengelig i dette miljøet (jf. CR-024/CR-025-notater).
- **CI-pipeline (GitHub Actions) som blokkerer deploy:** Coolify autodeployer ved push uavhengig av tester, så en CI-jobb ville kun varsle, ikke hindre. Foreslås som egen oppfølger (CR-033) hvis ønskelig. NFR («Ingen separat CI-pipeline i fase 1») gjelder fortsatt.
- **Refaktorering av produksjonskode for testbarhet:** ingen endringer i `app/`, `lib/` eller `prisma/`. Hvis noe viser seg utestbart uten endring, stoppes og flagges det i stedet for å endres stille (CLAUDE.md: ingen udokumenterte endringer / ingen urelatert refaktorering). Funn av faktiske feil dokumenteres som ISSUE-er, ikke fikses i denne CR-en.

## Impact Analysis

### Affected Specs
- [ ] specs/vision.md
- [ ] specs/requirements.md
- [ ] specs/entities.md
- [ ] specs/flows.md
- [x] specs/architecture.md — legge til konvensjon: tester ved siden av koden, `vitest`, mocking-grenser (prisma/session/storage/email)
- [ ] specs/api.yaml
- [ ] specs/ui-spec.md
- [x] specs/nfr.md — «CI/CD»-seksjonen: legge til at tester kjøres lokalt (`npm test`) før push, ikke i Coolify-bygget

### Affected Components
- `package.json` / `package-lock.json` — `vitest` 5.0.5 (devDependency, eksakt pin), `@types/node` ^20→^22 (krevd av Vitest 5, se Validation Notes), scripts `test`/`test:watch`
- `vitest.config.ts` — ny
- `lib/*.test.ts`, `app/api/**/route.test.ts` — nye
- `docs/SMOKE-TEST.md` — ny
- Ingen endring i produksjonskode, `Dockerfile` eller `build`-script

### Database Impact
Ingen.

### API Impact
Ingen.

### UX Impact
Ingen.

### Security Impact
Positiv: tilgangskontroll (owner/admin-sjekker), `@bas.no`-grense, bruksrettighetslås og rate limit får regresjonsdekning. Ny devDependency-kjede (vite/rollup/esbuild) øker supply-chain-flaten i dev — mitigert med `--ignore-scripts` + lockfile-gjennomgang + `npm audit`. Ingen produksjonskjøring påvirkes (devDependency).

### Performance Impact
Ingen i produksjon. `next build` typesjekker nå også testfilene (marginal økning).

---

## Acceptance Criteria
- [x] `npm test` kjører grønt lokalt, deterministisk (tre kjøringer på rad, ingen flaky), uten nettverk/DB/S3/SMTP og uavhengig av maskinens `TZ` (verifisert med `TZ=UTC`, `Europe/Oslo`, `America/Los_Angeles`, `Pacific/Auckland`; konfigurasjonen tvinger i tillegg `TZ=UTC` for å speile produksjonscontaineren)
- [x] Alle rader i Lag 1-tabellen har tester, inkl. CR-029-regresjonstest for `formatDate` med både sommer- og vinterdato
- [x] Alle fem rutegrupper i Lag 2 har tester for hvert listet scenario
- [x] Testnavn beskriver scenarioet (jf. `qa.md`)
- [x] Mutasjonssjekk: 15 bevisste ødeleggelser av produksjonskode, alle fanget av tester (se Validation Notes); filene er gjenopprettet med `git checkout`
- [x] `npx tsc --noEmit` og `npm run build` grønt med testfilene inkludert; `Dockerfile` og `build`-script er uendret
- [x] Lockfile-diff gjennomgått (ingen `resolved` utenfor registry.npmjs.org, ingen nye install-scripts); `npm audit signatures`: 681 pakker med verifiserte signaturer; `npm audit`: 5 high (uendret, ISSUE-015), 0 critical
- [ ] `docs/SMOKE-TEST.md` finnes ✓, men er ikke validert ved at en annen person har fulgt den uten ekstra kontekst
- [x] `specs/architecture.md` og `specs/nfr.md` oppdatert (se Affected Specs)
- [x] Funn av faktiske feil under testskrivingen er registrert som ISSUE-er (ikke fikset stille) — ISSUE-016, ISSUE-017

## Required Tests
- [ ] Unit: se Lag 1 (6 moduler)
- [ ] Integration: se Lag 2 (5 rutegrupper, mocked I/O) — ikke ekte DB/S3/SMTP
- [ ] E2E: manuell, `docs/SMOKE-TEST.md` (ikke automatisert i denne CR-en)

## Rollback Strategy
Ren additiv endring (nye filer + én devDependency + to scripts). Rollback = revert commit(s). Ingen påvirkning på produksjonsatferd; Coolify-deployen er uendret i innhold bortsett fra at `package-lock.json` endres. Foreslår to commits: (1) vitest-oppsett + Lag 1, (2) Lag 2 + SMOKE-TEST.md + spec-oppdateringer.

## Migration Strategy
Ingen datamigrasjon. Eksisterende CR-er beholder sin «Required Tests: —» historikk; kun nye CR-er forventes å legge til tester.

## Risks
- **Mocking kan gi falsk trygghet:** route-tester med mocket Prisma verifiserer logikk og tilgangsregler, ikke SQL/skjema/cascade. Mitigert av at SMOKE-TEST.md dekker det som krever ekte infrastruktur, og at dette er eksplisitt dokumentert.
- **Testene kan «fryse» uønsket atferd:** f.eks. at `Promise.allSettled` svelger S3-feil ved case-sletting (kan etterlate orphan-objekter i bucket uten at noen merker det). Testen dokumenterer dagens atferd; hvis den vurderes uønsket, åpnes egen ISSUE/CR — denne CR-en endrer den ikke.
- **Import av `next/server`/`@/lib/auth` i Vitest:** `lib/auth.ts` importerer `next/headers` og leser `IRON_SESSION_SECRET` ved modulinnlasting; kan kreve mocking/env-stubbing. Hvis ikke løsbart uten å endre produksjonskode, flagges det og scope reduseres (jf. «utenfor scope»).
- **Next 16/Turbopack og Vitest-versjoner:** kompatibilitet verifiseres lokalt; ingen antakelser gjort om `vitest`-versjon før research (se Dependencies).
- **Supply-chain:** ny dev-kjede (se Security Impact). Aktiv npm-ormekampanje (jf. DECISIONS 2026-10-20) gjør `--ignore-scripts` + diff-gjennomgang obligatorisk, ikke valgfri.
- **Vedlikeholdsbyrde:** liten kodebase og få utviklere — testsuiten holdes bevisst minimal for å unngå at den forfaller.

## Dependencies
- Research før implementasjon (lærdom fra CR-028/CR-031): les offisiell Vitest-dokumentasjon for gjeldende stabile versjon og Node 22-kompatibilitet; verifiser `vi.mock`-oppførsel med path-alias og `next/server`. Ikke gjettet i dette utkastet.
- Anbefalt rekkefølge: etter CR-031 (Done). Ingen blokkerende avhengigheter.
- Valgfri senere oppfølger: CR-033 (CI-varsling via GitHub Actions).

## Validation Notes

**Resultat:** 10 testfiler, 144 tester, ~4 s, grønt. Lag 1: `usage-approval`, `cases`, `auth`, `format`, `storage`, `case-export` (85 tester). Lag 2: `PATCH/DELETE /api/cases/[id]`, `POST /api/godkjenning/[caseId]/[token]`, `POST /api/auth/request-code`, `GET/DELETE /api/cases/[id]/files/[fileId]` (59 tester). Alt mocket (Prisma, session, S3-SDK, e-post, Sentry); ingen nettverk/DB.

**Avvik fra utkastet (dokumentert, ikke skjult):**
1. **Vitest-versjon: 5.0.5 (eksakt pin), ikke "nyeste uten research".** Research/forsøk: (a) Vitest 5 krever `@types/node` ≥22, prosjektet hadde ^20 → npm ERESOLVE. (b) Vitest 4.1.12 ga intern npm-feil (`Cannot read properties of null (reading 'edgesOut')` i Arborist `#loadPeerSet`) uavhengig av `--dry-run`/`--package-lock-only`/forhåndsinstallert vite. (c) Vitest 3.2.7 installerte, men `npm audit` ga 2 critical + 1 moderate (`tinypool` prototype-pollution→RCE, `@vitest/mocker` path traversal; rettet i ≥4.1.11/5.x) — avvist fordi vi ikke bevisst innfører critical-funn, selv om dev-only. Valg: 5.0.5.
2. **`@types/node` ^20 → ^22** (ikke i opprinnelig scope). Begrunnelse: kreves av Vitest 5; samsvarer med faktisk runtime (Node 22 lokalt og i Dockerfile). `tsc --noEmit` og `npm run build` er grønne etter bumpet; ingen kodeendring nødvendig. `vite` 8.3.4 (peer, auto-installert) bruker rolldown, ikke esbuild → ingen install-scripts i den nye kjeden.
3. **`vitest.config.mts`, ikke `.ts`:** `.ts` ga Vite-advarsel (ESM i CommonJS-pakke). `tsconfig.json` `include` dekker `**/*.mts`.
4. **`TZ=UTC` tvunget i konfigurasjonen:** første mutasjonskjøring av `formatDate` (fjernet `timeZone`) ble IKKE fanget, fordi utviklermaskinen står i `Europe/Oslo` og dermed gir identisk resultat. Uten tvunget UTC ville CR-029-regresjonstesten bare virket på maskiner utenfor Norge. Etter fiksen fanges mutasjonen.

**Supply-chain:** installert med `--ignore-scripts`; lockfile-diff scriptet (nye pakker, `resolved`-domener, `hasInstallScript`, tarball-navn): ingen avvik. `npm audit signatures`: 681 pakker verifiserte registry-signaturer, 176 med attestations. Vitest 5.0.5 er publisert 2026-10-15, Vite 8.3.4 2026-10-08 (ferske, men signaturverifisert).

**Mutasjonssjekk (produksjonskode midlertidig ødelagt → tester feilet → gjenopprettet):** `sanitizeChoices` NDA-utelukkelse; `isBasEmail` domenesjekk; `formatDate` uten `timeZone` (CR-029); `sanitizeFilename` slipper `/` (path traversal); `buildCaseZip` dedupe-løkke; `PATCH` bruksrettighetslås (CR-021); owner/admin-sjekk i `PATCH`+`DELETE`; S3-opprydding i case-`DELETE`; token-sjekk, status=open-sjekk og server-side `sanitizeChoices` i godkjenning; rate limit 5→50; `@bas.no`-sjekk i request-code; eierskapssjekk (case/fil) i files GET; owner/admin-sjekk i files DELETE.

**Funn (ikke endret i produksjonskode, jf. scope):** se ISSUE-016 (S3-feil ved sletting) og ISSUE-017 (mindre punkter).

**Gjenstår:** manuell validering av `docs/SMOKE-TEST.md` av en annen person; commit/push (to commits foreslått); spec-/sessions-oppdateringer er gjort lokalt men ikke committet.
