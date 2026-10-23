# CURRENT-STATE.md

> Updated at the end of every session. Read by Claude at startup.

## Current Phase
**Drift og vedlikehold (per slutten av Session 11, 2026-10-21).** Appen kjører stabilt i produksjon på next 16.4.2 / nodemailer 10 / Prisma 7.10.1 etter sikkerhetsoppgraderingen CR-031 (0 critical, 5 dev-only high — ISSUE-015). Prosjektet har nå en lokal automatisert test-suite (CR-032, 144 tester, `npm test`) og en manuell smoke-test-sjekkliste (`docs/SMOKE-TEST.md`). Ingen aktiv CR. CR-033 til CR-038 er Done. Historikk fra tidligere faser følger under.

MIGRERING FERDIG — CR-008 (porting fra Vercel/Neon til Hetzner/Coolify/PostgreSQL 18) er markert Done 2026-08-05: produkteier bekreftet at daglig backup og Uptime Kuma-overvåking er satt opp, og ga klarsignal til å fjerne Vercel-prosjektet og Neon-databasen fullstendig (ingen data av verdi der). Selve fjerningen skjer i Vercel/Neon sine dashboards, utenfor det en Claude Code-økt har tilgang til — produkteier utfører dette steget selv. Se `docs/COOLIFY-DEPLOY.md` §7. Appen kjører stabilt på `effektbibliotek.basbeta.no`. Innlogging (CR-009–011), feilsporing (CR-012), direkte utsending av bruksgodkjenning (CR-013), rediger eget navn (CR-014), det forenklede bruksrettighets-systemet (CR-020–023), CR-025 (case-sletting/eksport/eierbytte) og CR-026 (Bruksgodkjenning-widget i redigeringsskjemaet) er alle bekreftet fungerende i produksjon av produkteier per 2026-08-04. CR-015–019 er deployet og ble funksjonelt utøvd gjennom den samme produksjonstestingen, men er ikke bekreftet feature-for-feature enkeltvis — se Next Recommended Actions punkt 2. ISSUE-011 er nå løst: appen kjører permanent på `prisma migrate deploy` igjen (etter en andre, kortvarig nedetid under selve oppryddingen — se DECISIONS.md 2026-08-04 for lærdommen om `--rolled-back` vs. `--applied`). **CR-027 (filopplasting til Materiale-seksjonen — bilder/PDF/Word, 100MB per case, lagret i Hetzner Object Storage) er fullt implementert, pushet og bekreftet fungerende i produksjon av produkteier 2026-08-04** (opplasting/nedlasting/last-ned-alle/sletting, synlig på selve case-siden i tillegg til redigeringssiden, Eksporter-knappen bundler faktiske filer i et zip-arkiv). S3-env-variabler er satt i Coolify av produkteier. **2026-08-05 (Session 8 fortsatt):** `npm audit fix` (uten `--force`) rettet 9 av 13 avhengighetssårbarheter, inkl. en produksjonsrelevant nodemailer-CVE — 4 gjenstår og krever en bevisst Next.js-major-oppgradering, sporet som ISSUE-012. ISSUE-005 (`docs/extracted.txt` committed) løst — gitignored og fjernet fra tracking, lokal kopi beholdt.

**2026-08-05 (Session 9):** ISSUE-012 løst via ny CR-028 — `npm audit fix --force` kjørt etter forutgående research av Next.js 16.3 og nodemailer v9 sine breaking changes (begge bekreftet trygge for denne kodebasens faktiske bruk). `next` 16.2.6→16.3.0 (re-pinnet eksakt), `nodemailer` ^8.0.7→^9.0.4, `eslint-config-next`→16.3.0, `@types/nodemailer`→^8.0.1. `npm audit` viser nå 0 sårbarheter. `npm run build`/`npx tsc --noEmit` grønne. CR-028 pushet og bekreftet i produksjon av produkteier. **CR-029 (samme økt, funnet under CR-028-smoke-testen):** feil klokkeslett i bruksgodkjenning-bekreftelsesepost — containeren kjører i UTC (ingen `TZ` satt i Dockerfile), og tre `toLocale*`-kall (`lib/email.ts` x2, `lib/format.ts` sin `formatDate()`) manglet `timeZone`-option. Lagt til `timeZone: "Europe/Oslo"` alle tre steder. Build/tsc grønt. Pushet og **bekreftet i produksjon av produkteier** — korrekt klokkeslett i ny bruksgodkjenning-e-post.

**CR-030 (samme økt):** "+ Legg inn case"-knappen flyttet fra topbaren til toppen av venstre kolonne, omdøpt til "Ny Case". `npm run build`/`npx tsc --noEmit` grønt. Pushet og **bekreftet visuelt i produksjon av produkteier** ("ser bra ut").

**2026-08-05 (Session 9, fortsatt) — CR-025 delvis E2E-verifisert:** Produkteier testet slett-case-dialogen og eksport-knappen direkte i produksjon — begge bekreftet å fungere ("slett og eksport ser bra ut"). Eierbytte-flyten er IKKE testet ennå — krever en annen brukers innlogging (ikke-admin-eier) for å verifisere fullt ut, og produkteier har ikke en annen bruker tilgjengelig akkurat nå. Se ISSUE-010/Current Objectives punkt 1.

**2026-10-20 (Session 10) — CR-031 sikkerhetsoppgradering:** `npm audit` viste 18 sårbarheter (1 critical `next`-RCE, 16 high), nye advisories siden CR-028 — tidligere «0 sårbarheter» var utdatert. CR-031 (Done) levert i to deploys: (1) `next` 16.4.2, `eslint-config-next` 16.4.2, `prisma`/`@prisma/client`/`@prisma/adapter-pg` ^7.10.1 (commit 265a044, lukker ISSUE-014); (2) `nodemailer` ^10.1.7, `@types/nodemailer` fjernet, `npm audit fix` (commit 0f5148d). Audit 18→5 (0 critical; 5 high gjenstår i dev-only lint-kjede, **ISSUE-015**). Alle installasjoner med `--ignore-scripts` og lockfile-diff gjennomgått. Produkteier bekreftet OTP + bruksgodkjenning-e-post i produksjon; `migrate deploy` ren. **Reply-To/cc, filopplasting/-nedlasting, eksport og slett case er re-verifisert i produksjon etter oppgraderingen** (Claude in Chrome på en test-case, alt ✓; S3-opprydding ved sletting ikke verifisert — se IMPLEMENTATION-LEDGER). Untracked `triage.ps1` (defensivt skript mot npm-supply-chain-orm, ukjent opphav, ikke committet) ble gjennomgått og triage-sjekkene kjørt manuelt: ingen funn — ikke bevis for ren maskin, ingen tokens tilbakekalt (se DECISIONS 2026-10-20). Coolify-loggen viser ekstern Server Action-sondering mot appen (ingen Server Actions i koden, avvist korrekt av Next.js).

**2026-10-21 (Session 10, fortsatt) — CR-032 automatiserte tester (Done, pushet som 391baf6 + d49b70f):** Vitest 5.0.5 (eksakt pin) + `@types/node` ^20→^22; 144 tester i 10 filer (6 `lib/*.test.ts`, 4 `app/api/**/route.test.ts`) uten nettverk/DB; `vitest.config.mts` med `TZ=UTC`; `docs/SMOKE-TEST.md` (manuell sjekkliste); `specs/architecture.md` og `specs/nfr.md` oppdatert. Kjør `npm test` før push. 15 mutasjoner av produksjonskode fanget. Vitest 4.1.12 ga intern npm-feil og 3.2.7 hadde 2 critical — se DECISIONS 2026-10-21. Ingen produksjonskode endret; funn → ISSUE-016 (S3-feil ved sletting svelges/uhåndtert), ISSUE-017 (mindre punkter). Ikke validert: `docs/SMOKE-TEST.md` fulgt av en annen person.

**2026-10-21 (Session 11) — CR-033 enklere utfylling av casedetaljer (In Progress; deploy A forberedt lokalt, IKKE pushet):** Etter et forslagsrunde ba produkteier om å begynne med anbefalingen «først» og å droppe Pitchtekst helt (tap av data greit — alle caser er testcaser). Levert lokalt: skjemaet som sammenleggbare kort med fremdrift og sammendrag, valgfrie blokker via «+ Legg til», søkbart flervalg (Kanal/Case-type/Effekttype), Effektmåling med 3 standardfelt, sticky lagre-linje + ⋯-meny, kundenavn-autofullføring (`GET /api/customers`), Pitchtekst fjernet fra kode og `schema.prisma`. Ny ren logikk i `lib/case-form.ts`. 187 tester ✓, `tsc` ✓, `build` ✓, lockfile uendret, ingen nye avhengigheter. Verifisert visuelt i Chrome mot en midlertidig lokal forhåndsvisning (slettet). Utrulling i to deploys: **A** = kode + schema uten migrering; **B** = egen commit med `ALTER TABLE "Case" DROP COLUMN "pitchText";` (SQL generert og kontrollert i scratchpad, ikke i repoet ennå). Utsatt: statusstyrt sjekkliste, klikk-for-å-fylle-ut på case-siden, caseformat/maler, bransjeforslag, autolagrede utkast. Ikke verifisert i produksjon ennå (Chrome-test mot prod etter deploy A; test-case slettes etterpå). Se `change-requests/CR-033-…md`, DECISIONS 2026-10-21 og ISSUE-018 (eldre lint-feil, ikke fra CR-033).

**Oppdatering Session 11 (samme dag):** Deploy A (`3ab0f1d`) er pushet og **verifisert i produksjon** via Claude in Chrome på en test-case som ble slettet (alle skjemaflyter, «Ny case»-autofullføring, Oppfølging uten pitchtekst, søk, eksport, ⋯-meny + sletting, «lagre uten endring» gir identisk case). Deploy B (migrering `20261021120000_drop_case_pitchtext`, `DROP COLUMN "pitchText"`) er forberedt i arbeidskatalogen, **IKKE committet/pushet**.

**Oppdatering Session 11 (slutten):** Deploy B (`9cb65b2`) er pushet og funksjonstestet i produksjon (opprett/oppdater/åpne/søk/eksport/slett test-case, biblioteket uendret på 7 caser). **CR-033 er satt til Done.** Migrasjonen `20261021120000_drop_case_pitchtext` er **bekreftet anvendt** i Coolify-loggen (skjermbilde fra produkteier: «All migrations have been successfully applied», Next.js Ready).

**2026-10-21/22 (Session 11, fortsatt) — CR-034 fyll ut direkte fra «Dette kan kompletteres» (Done 2026-10-22; pushet som `4831489`, verifisert i produksjon):** Chipsene på case-siden er klikkbare for eier/admin og åpner en liten editor for akkurat det feltet (Bransje, Kanal, Case-type, Problem, Løsning, Effekt eller læring, Kundevennlig beskrivelse); NDA-meldingen er ren informasjon; andre brukere ser ren tekst. Ingen API-, skjema- eller avhengighetsendring (gjenbruker `PATCH /api/cases/[id]`). Ny logikk i `lib/missing-fields.ts` og `getMissingItems` (`getMissingInfo` uendret), ny `components/cases/MissingInfoPanel.tsx`. 210 tester ✓, `tsc`/`build`/lint ✓, 4 mutasjoner fanget. Fant og rettet en feil lokalt: Escape i `MultiSelect` lukket hele editoren. **Verifisert i produksjon (Chrome, test-case slettet etterpå):** alle sju felttyper lagrer riktig og rører kun sitt eget felt; «Lagre» deaktivert når tomt; Avbryt forkaster; Escape-rettelsen virker; «Effekt eller læring» med bare Effekt lar Læring stå tom; panelet forsvinner når alt er utfylt. Første forsøk 2026-10-21 ble avbrutt av at Chrome-utvidelsen mistet forbindelsen (ingenting opprettet). `docs/SMOKE-TEST.md` utvidet med skjemaflyten (CR-033) og fyll-ut-fra-panel (CR-034). Ikke verifisert: ikke-eier-visning med en reell annen konto.

**2026-10-22 (Session 11, fortsatt) — CR-035 fjern Problem / kontekst, Læring og Kundevennlig beskrivelse (Done 2026-10-22; deploy A `25d43de` verifisert i produksjon, deploy B `7e585a6` pushet og funksjonstestet — Coolify-migrasjonsloggen ikke sett av Claude):** Produkteier ba om å fjerne de tre feltene og slette eksisterende data (kun testcaser). Fjernet fra schema, API (tillatt-liste, søk), skjema, mangler-panel, case-side, kundevendt godkjenningsside (beskrivelsesboksen), Oppfølging, casekort og eksport. Nye regler: «Pågår» krever løsning; «Ferdigstilt» krever løsning og effekt; Innhold-kortet viser «N av 2». 203 tester ✓, `tsc`/`build` ✓, lockfile uendret, 5 mutasjoner fanget. **Deploy A verifisert i produksjon** (Chrome, test-case slettet): panel, Løsning/Effekt lagres hver for seg, API uten de fjernede nøklene, skjema uten feltene, lagre uten endring, godkjenningssiden lekker ingen intern tekst, Oppfølging, søk, alle eksisterende caser åpnes. **Deploy B** (egen commit): `DROP COLUMN` for de tre kolonnene, migrasjonsfil `prisma/migrations/20261022120000_drop_problem_learning_customerfacing` ligger i arbeidskatalogen, kontrollert BOM-fri og byte-identisk med verifisert SQL. Gjenstår: push B → bekreft «Applying migration» i Coolify-logg → kort funksjonstest → Done. Se `change-requests/CR-035-…md`.

**2026-10-22 (Session 11, fortsatt) — CR-036 eier rett til «Rediger» (Done 2026-10-22; pushet `3a225b2` og verifisert i produksjon):** Når caseeieren åpner en case sendes de rett til redigeringsvisningen (`/case/[id]/rediger`). Skrivebeskyttet visning via `/case/[id]?visning=1`, som «Tilbake», «Avbryt» og lagring peker på (hindrer omdirigeringsløkke). Admin på andres caser og andre brukere omdirigeres ikke. Ren logikk i `lib/case-routing.ts`. 211 tester ✓, `tsc`/`build` ✓, lockfile uendret, 5 mutasjoner fanget. **Verifisert i produksjon (Chrome, test-caser slettet):** kort i biblioteket → `/rediger`; «Tilbake»/«Avbryt»/«Lagre» → `?visning=1` uten løkke; mangler-panelet blir på `?visning=1`; ny case via skjema → `/rediger`. Ikke verifisert: admin/ikke-eier med reell annen konto (enhetstest). Se `change-requests/CR-036-…md` og DECISIONS 2026-10-22.

**2026-10-22 (Session 11, slutten) — CR-037 og CR-038 Done:** Pushet `6af9f93` (CR-037 + CR-038 deploy A) og `27ade1b` (CR-038 deploy B, migrasjon `20261022130000_drop_case_relevance_internalnotes`, `DROP COLUMN "relevance", "internalNotes"`). CR-037 verifisert i produksjon (Chrome, test-case slettet): «Lagre» blir på `/rediger`, «✓ Lagret», «Lukk» → `?visning=1`, «Lagret» forsvinner ved ny endring, verdier i databasen; feilsituasjoner senere verifisert (simulert 500 og nettverksfeil, ekte klientvalidering: feilmelding, ingen «Lagret», DB uendret). CR-038: Relevans og Interne notater fjernet (skjema, visning, eksport, API, database); Effektmåling er eneste valgfrie blokk; FR-CASE-007 fjernet. Deploy A verifisert, og deploy B er **bekreftet anvendt i Coolify-loggen av produkteier** og funksjonstestet i produksjon (opprett/PATCH/GET/visning/slett; test-caser slettet, ingen «TESTKUNDE» igjen). 207 tester ✓, `tsc`/`build` ✓, lockfile uendret. Mutasjonssjekk ikke gjort for CR-038 (mest sletting av kode).

**(Tidligere i økten) CR-037 bli stående på siden etter «Lagre»:** Etter vellykket lagring blir eieren stående i redigering (`router.refresh()`), «✓ Lagret» vises til neste endring, «Avbryt» heter «Lukk» når alt er lagret. Endringsteller hindrer feil «Lagret» ved endring under lagring. 211 tester ✓, `tsc`/`build` ✓, lockfile uendret. Ingen komponenttester: gjenstår Chrome-test i produksjon. Se `change-requests/CR-037-…md` og DECISIONS 2026-10-22.

## Current Objectives
000. Bekreft i Coolify-loggen at `20261022120000_drop_problem_learning_customerfacing` ble anvendt (CR-035 deploy B; ikke sett av Claude; CR-038 sin migrasjon er bekreftet; ISSUE-019). Deretter neste forbedring av skjemaet/appen — se Next Actions
00a. ~~CR-034~~ — Done 2026-10-22 (pushet `4831489`, verifisert i produksjon)
00. Deretter neste forbedring av skjemaet (klikk-for-å-fylle-ut på case-siden er nå CR-034), anbefalt rekkefølge: (1) klikk-for-å-fylle-ut direkte på case-siden («Dette kan kompletteres»-chips åpner et lite felt), (2) statusstyrt sjekkliste øverst, (3) caseformat/maler, (4) bransjeforslag og autolagrede utkast — hver som egen CR
0a. ~~Commit/push CR-032~~ — gjort 2026-10-21 (391baf6, d49b70f). Gjenstår: bekreft at Coolify-bygget gikk rent, og at en annen person følger `docs/SMOKE-TEST.md`
0. ~~Avgjør skjebnen til `triage.ps1`~~ — slettet 2026-10-22 etter ordre fra produkteier (var untracked, aldri committet)
1. Manuell E2E-verifisering av CR-025 sine egne flyter: slett-case-dialog og eksport ✓ bekreftet 2026-08-05. **Gjenstår:** eierbytte for en ikke-admin eier — blokkert på at produkteier ikke har en annen brukerkonto tilgjengelig for testing akkurat nå
2. (Valgfritt, lav prioritet) Bekreft CR-015–019 individuelt hvis det er ønskelig med fullstendig sikkerhet — se Next Recommended Actions
3. Ende-til-ende-test av gjenstående flyter: case-opprettelse, redigering av felt utenom bruksrettigheter
4. Produkteier fjerner Vercel-prosjektet og Neon-databasen manuelt (klarert 2026-08-05, se CR-008/docs/COOLIFY-DEPLOY.md §7)

## Current Branch
master (alle endringer CR-009–038 + emergency-fix er pushet direkte til master, ingen feature-branch brukt). Siste kode-commit `27ade1b` (CR-038 deploy B); siste commit `074b168` (docs for CR-037/038). Arbeidskatalogen var ren før denne avslutningen; kun session-filene fra `/end-session` er endret og ikke committet. `triage.ps1` er slettet. Ingen midlertidige filer ligger igjen

## Blockers
Manuelt Coolify/Hetzner-oppsett kan ikke utføres fra Claude Code-økten (ingen tilgang til Coolify-instansen). Krever produkteier/admin på `coolify.basbeta.no`.

## Risks / Tech Debt (per 2026-10-21)
- **(Ny, Session 11) CR-034 er pushet og verifisert i produksjon** (`4831489`); den forrige risikoen (kun lokalt arbeid) er løst. Gjenstående: ikke-eier-visning er ikke prøvd med en reell annen konto.
- **(Ny) Ingen komponenttester for skjemaene (CR-033/034):** kun ren logikk (`lib/case-form.ts`, `lib/missing-fields.ts`, `lib/cases.ts`) er enhetstestet; flervalg, kort og editorer verifiseres manuelt. `docs/SMOKE-TEST.md` dekker nå CR-033/034-flytene (utvidet 2026-10-22), men har ikke vært fulgt av en annen person.
- **(Ny) To redigeringsflater** (hele skjemaet og mangler-panelet) skriver samme felt; siste skriving vinner (uendret fra før). Skjulte valgfrie blokker (CR-033) kan redusere oppdagbarhet.
- **(Ny) Irreversibelt datatap:** `Case.pitchText` er droppet i produksjon (CR-033 deploy B) — bevisst og akseptert, men ikke gjenopprettbart.
- **(Ny) Arbeidsmåte-fallgruver som har bitt:** `2>&1` blandet Prisma-stderr inn i migrerings-SQL (fanget av byte-sjekk); PowerShell 5.1 deler commit-meldinger med doble anførselstegn (bruk `git commit -F`); `next dev` genererer `AGENTS.md` og `.next/dev`-cache som må ryddes; midlertidige forhåndsvisningssider + `proxy.ts`-endring må ALDRI committes (sjekk `git status`/`git diff --cached` før hver commit).
- **(Ny) Antakelse:** testing i produksjon gjøres med én innlogget bruker (produkteier); ikke-eier-visning og 403 for andre kontoer er verifisert med tester/kodegjennomgang, ikke med en reell annen konto.
- **(Ny, Session 10) Testsuiten kan gi falsk trygghet:** 144 tester med mocket Prisma/S3/SMTP verifiserer logikk og tilgangsregler, ikke SQL, cascade, S3 eller UI. De kjøres kun manuelt (`npm test` før push) — ingen CI, så en glemt kjøring slipper gjennom, og Coolify deployer uansett ved push. `docs/SMOKE-TEST.md` er ikke validert av en annen person.
- **(Ny) Coolify-bygget etter CR-032-push (lockfile med vitest/vite 8/rolldown, `@types/node` ^22) er ikke eksplisitt verifisert** — lokalt er `tsc`/`build` grønt, men Docker-bygget er ikke prøvd av Claude. Rollback: `git revert d49b70f 391baf6` + «Redeploy».
- **(Ny) npm-verktøykjede:** npm 10.9.8 ga intern Arborist-feil (`edgesOut`) ved Vitest 4.x; fremtidige Vitest-oppgraderinger kan treffe samme feil. Vitest/Vite er eksakt pinnet/ferske (publisert okt. 2026), signaturverifisert, men nye devDependency-kjeder øker supply-chain-flaten under en aktiv npm-ormekampanje.
- **(Ny) Maskintriage er et negativt funn, ikke bevis for ren maskin** — ingen tokens tilbakekalt; `triage.ps1` hadde ukjent opphav og er nå slettet uten å ha vært committet (DECISIONS 2026-10-20).
- **(Ny, 2026-10-22) Irreversibelt datatap:** `Case.relevance` og `Case.internalNotes` er droppet i produksjon (CR-038 deploy B), bevisst og akseptert; ikke gjenopprettbart uten backup. Ingen intern-notat-funksjon finnes lenger.
- **(Ny, 2026-10-22) Etter CR-037 gjenstår ulagrede endringer uten advarsel ved navigering bort** (utenfor scope), og en ekte serverfeil ved lagring er ikke fremprovosert (kun simulert 500/nettverksfeil og ekte klientvalidering).
- **(Ny, 2026-10-22) CR-038 ble ikke mutasjonstestet** (mest sletting av kode); 207 tester.
- **(Ny, 2026-10-22) Verktøy-/prosjektgrense:** produkteier spurte om en filvelger («Velg HTML-fil(er)») som ligger i et annet prosjekt (`Basbeta\sider`, `components/NewPageForm.tsx`), ikke i effektbibliotek. Ingenting ble endret; produkteier fikser det selv i riktig repo.
- **(Ny) ISSUE-015 (5 high, dev-only lint-kjede), ISSUE-016 (S3-sletting svelges/uhåndtert → mulige orphan-objekter), ISSUE-017 (mindre punkter)** er åpne og ikke endret.
- **(Ny) Ekstern Server Action-sondering** mot appen i Coolify-loggene — ingen Server Actions i koden, avvist av Next.js; ingen rate limit utover `request-code`.
- **(Oppdatert 2026-10-21, CR-032)** Automatiserte tester finnes nå lokalt (144 tester, `npm test`) etter commit; de dekker logikk og tilgangskontroll, ikke SQL/S3/SMTP/UI, og blokkerer ikke deploy. Historisk beskrivelse under: ~~Ingen automatiserte tester i prosjektet.~~ All verifisering tidligere økter var `npm run build`/TypeScript-sjekk + manuell produksjonstesting av produkteier. Fungerer for nå, men skalerer dårlig etter hvert som appen vokser — regressonsrisiko ved fremtidige endringer er reelt.
- **CR-015, 016, 019 ikke enkeltvis bekreftet** (ISSUE-010) — lav risiko. CR-018 (Reply-To/cc) er bekreftet 2026-10-20 i faktisk mottatt e-post (headeren; ikke testet ved at noen faktisk svarer).
- **Ingen tilgang til Coolify-instansen fra Claude Code-økter** — enhver fremtidig feilsøking som krever env-var-endringer, redeploy-trigger, eller database-terminal må gjøres av produkteier manuelt, med skjermbilder/copy-paste av logger tilbake til denne økten. Dette var flaskehalsen i mesteparten av CR-009–011-feilsøkingen.
- ~~Vercel/Neon (gammel produksjon) står fortsatt aktiv som fallback~~ — Klarert for fjerning av produkteier 2026-08-05, gjenstår kun selve utførelsen i Vercel/Neon sine dashboards
- ~~4 gjenstående avhengighetssårbarheter (ISSUE-012)~~ — Løst 2026-08-05 via CR-028, pushet og bekreftet i produksjon
- **Eierbytte (del av CR-025) ikke E2E-testet** — blokkert på tilgang til en ikke-admin-brukerkonto for produkteier å teste med

## Løst: OTP-innlogging hang (CR-009, CR-010, CR-011) og feilsporing (CR-012)
Etter CR-008-deploy hang OTP-innlogging. Rotårsak (CR-011, funnet via Coolify runtime-logger): den ferske Coolify-databasen hadde ingen tabeller, siden `prisma/migrations` aldri har eksistert i repoet og `prisma migrate deploy` derfor var en stille no-op. Fikset med `prisma db push --accept-data-loss`. CR-009 (SMTP-timeout) og CR-010 (DB connection-timeout) var reelle forbedringer underveis, men ikke selve rotårsaken. Full historikk (inkl. to feilslåtte deploys som crash-loopet appen) i `sessions/IMPLEMENTATION-LEDGER.md` og `sessions/DECISIONS.md`.

CR-012 la til Bugsink-feilsporing (Sentry-kompatibel, selvhostet på errors.basbeta.no) — bekreftet fungerende med en reell testfeil. Viktig detalj: DSN må bruke `https://`, ikke `http://` (Bugsink-hosten redirecter, og Sentry sin transport følger ikke redirects).

## Node.js nå tilgjengelig lokalt
Node.js 22 (matcher Dockerfile) installert på denne maskinen via `winget install OpenJS.NodeJS.22` 2026-08-03. `npm`/`npx`/`node` er IKKE på PATH i allerede-kjørende PowerShell-verktøyprosesser i denne økten (winget sin PATH-endring krever ny prosess) — prefiks kommandoer med `$env:PATH = "C:\Users\haavard.kvinnesland\AppData\Local\Microsoft\WinGet\Packages\OpenJS.NodeJS.22_Microsoft.Winget.Source_8wekyb3d8bbwe\node-v22.23.2-win-x64;" + $env:PATH` før `node`/`npm`/`npx`-kall inntil en frisk økt bekrefter det er unødvendig. Dette åpner for faktisk `npm run build`/`tsc --noEmit`-verifisering fremover, i stedet for kun visuell kodegjennomgang slik CR-009 til CR-011 måtte gjøre.

## Active Change Requests
- CR-001 (Done) — Auth
- CR-002 (Done) — Case CRUD + Bibliotek
- CR-003 (Done) — Mine caser + Oppfølging
- CR-004 (Done) — Bruksgodkjenning (intern + kundevendt)
- CR-005 (Done) — Materiale/lenker
- CR-006 (Done) — Admin
- CR-007 (Done) — Redirect etter innlogging
- CR-008 (Done 2026-08-05) — Port til Hetzner/Coolify/PostgreSQL 18. Alle acceptance criteria oppfylt (backup + Uptime Kuma bekreftet av produkteier). Vercel/Neon klarert for fjerning, ubrukt `resend`-avhengighet fjernet, README.md rettet
- CR-009 (Done) — SMTP-timeout på Brevo-transportøren (bugfix: OTP-innlogging hang)
- CR-010 (Done) — Connection-timeout på Prisma/pg-adapteren (bugfix, ikke rotårsak)
- CR-011 (Done) — Faktisk rotårsak: tomt databaseskjema (db push i stedet for migrate deploy) + manglende feilhåndtering i request-code-routen
- CR-012 (Done) — Feilsporing med Bugsink (Sentry-kompatibel, selvhostet på errors.basbeta.no). Verifisert i produksjon: bevisst testfeil dukket opp i Bugsink
- CR-013 (Done, bekreftet i produksjon) — Direkte utsending av bruksgodkjenningsforespørsel på e-post (til godkjenner, cc caseeier), erstatter "kopier tekst"-flyten. To runder feilsøking på godkjenningslenken før den fungerte: (1) request.url.origin upålitelig bak Coolify/Traefik, byttet til NEXT_PUBLIC_APP_URL — (2) det slo heller ikke gjennom, fordi NEXT_PUBLIC_-variabler bygges statisk inn i koden ved build time (også server-side). Endte på en vanlig `APP_URL` (uten prefiks), satt i Coolify. Bekreftet fungerende av produkteier 2026-08-03
- CR-014 (Done, bekreftet i produksjon) — Brukere kan overstyre sitt eget visningsnavn (blyant ved "Ansvarlig" på case-siden, kun for seg selv). Løser at nameFromEmail() mister spesialtegn (æøå) som ikke finnes i e-postadressen
- CR-015 (Done, deployet — funksjonelt utøvd via senere testing, ikke enkeltvis bekreftet) — E-postforhåndsvisning i ApprovalSection, forhåndsutfylt navn/e-post på godkjenningssiden, personvern-/GDPR-avsnitt i godkjenningse-posten
- CR-016 (Done, deployet — funksjonelt utøvd via senere testing, ikke enkeltvis bekreftet) — Kvitteringstekst presiserer at godkjenner + caseeier får bekreftelse; personvern-/GDPR-tekst i sidens footer
- CR-017 (Done, deployet — funksjonelt utøvd via senere testing, ikke enkeltvis bekreftet) — ApprovalSection som trekkspill, kollapset som default for `not_requested`/`open`-status (permanent åpen for `submitted_locked`, se CR-023)
- CR-018 (Done, deployet — reply-to-header ikke eksplisitt verifisert ved faktisk svar-e-post) — Reply-To satt til caseeierens e-post på de to eksterne e-postene; "kontaktpersonen din i Bas" erstattet med caseeierens navn
- CR-019 (Done, deployet — funksjonelt utøvd via senere testing, ikke enkeltvis bekreftet) — Personvernteksten nevner caseeier ved navn og e-post
- CR-020 (Done, bekreftet i produksjon) — Stor forenkling av bruksgodkjenning: fjernet "bruksnivå"-enum og duplisert badge-visning, erstattet med 6 rene valg (NDA, kun anonymisert, hjemmeside, presentasjoner, anbud, konkurranse), gjensidig utelukkelse for NDA/anonymisert. **Skjemaendring med reelt datatap** — Case.usageLevel og UsageApproval.internalUseAllowed droppet ved db push, bekreftet gjennomført uten problemer
- CR-021 (Done, bekreftet i produksjon) — Bruksrettigheter skrivebeskyttet i redigeringsskjemaet når submitted_locked (viser hvem som godkjente + dato), håndhevet UI + server-side
- CR-022 (Done, bekreftet i produksjon) — Tydeligere låst visning, "Lås opp godkjenning" direkte fra redigeringsskjemaet
- CR-023 (Done, bekreftet i produksjon 2026-08-04) — ApprovalSection permanent utvidet når submitted_locked; redigerbar liste viser bold/dempet basert på avkrysning; låst visning bruker ✓/— (flat stil, matcher appens øvrige read-only lister — valgt fremfor ☑/☐ etter avklaring med produkteier)
- CR-024 (Done, bekreftet i produksjon 2026-08-04) — Formelle Prisma-migreringer (ISSUE-009), rullet ut i to atskilte deploys pga. autodeploy på master: Deploy A (migreringsfiler, uendret CMD) → manuelt `migrate resolve --applied` mot prod via Coolify Terminal → Deploy B (CMD → `migrate deploy`). Begge deploys bekreftet vellykket, appen kjører normalt
- CR-025 (Done, live i produksjon 2026-08-04 — med en hendelse underveis) — Slett case (eier eller admin, med advarsel-dialog: lenkeliste, godkjenningshistorikk-varsel, eksporter-knapp), eksport av full case-tekst/lenker/godkjenninger, eierbytte-dropdown nå synlig for eieren selv (ikke bare admin). Skjemaendring: `onDelete: Cascade` på UsageApproval/CaseLink. Migreringsfilen hadde en BOM som crash-loopet produksjon (se ISSUE-011) — nødløsning (revert til `db push`) bekreftet stabil, selve funksjonaliteten fungerer
- CR-026 (Done, bekreftet i produksjon 2026-08-04) — Redigeringsskjemaets "Bruksrettigheter"-avkrysningsbokser erstattet med samme ApprovalSection/Bruksgodkjenning-widget som case-siden bruker. Fjerner en duplisert UI og duplisert lås/opplås-logikk. Bugfix underveis: ApprovalSection sine 5 knapper manglet `type="button"`, trigget skjema-innsending av EditCaseForm i stedet for å bare toggle trekkspillet — fikset
- CR-028 (Done, bekreftet i produksjon 2026-08-05) — Sikkerhetsoppgradering av gjenstående avhengigheter (ISSUE-012): next 16.2.6→16.3.0, nodemailer ^8.0.7→^9.0.4, postcss/sharp (transitivt via next), eslint-config-next→16.3.0, @types/nodemailer→^8.0.1. `npm audit` 0 sårbarheter. Produkteiers smoke-test bekreftet at kjernefunksjonaliteten (OTP, bruksgodkjenning-e-post) fungerer — avdekket samtidig CR-029 (klokkeslett-bug, ikke forårsaket av denne oppgraderingen)
- CR-029 (Done, bekreftet i produksjon 2026-08-05) — Feil klokkeslett i bruksgodkjenning-bekreftelsesepost og datovisninger: containeren kjører i UTC, tre `toLocale*`-kall manglet `timeZone`. Lagt til `timeZone: "Europe/Oslo"` i `lib/email.ts` (x2) og `lib/format.ts`
- CR-030 (Done, bekreftet i produksjon 2026-08-05) — "+ Legg inn case"-knappen flyttet fra topbaren til toppen av venstre kolonne (SideNav), omdøpt til "+ Ny Case"
- CR-038 (Done 2026-10-22; deploy A `6af9f93`, deploy B `27ade1b`, migrasjon bekreftet anvendt i Coolify-logg) — Fjern Relevans og Interne notater
- CR-037 (Done 2026-10-22; pushet `6af9f93`, verifisert i produksjon) — Bli stående på redigeringssiden etter «Lagre»
- CR-036 (Done 2026-10-22; pushet `3a225b2`, verifisert i produksjon) — Eier åpner redigeringsvisningen direkte; skrivebeskyttet visning via `?visning=1`
- CR-035 (Done 2026-10-22; deploy A `25d43de` verifisert i produksjon, deploy B `7e585a6` pushet og funksjonstestet — Coolify-migrasjonsloggen ikke sett av Claude) — Fjern Problem / kontekst, Læring og Kundevennlig beskrivelse
- CR-034 (Done 2026-10-22; pushet som `4831489`, verifisert i produksjon) — Fyll ut manglende felt direkte fra «Dette kan kompletteres» på case-siden
- CR-033 (Done 2026-10-21; deploy A `3ab0f1d` verifisert i produksjon, deploy B `9cb65b2` pushet, funksjonstestet og migrasjonen bekreftet anvendt i Coolify-loggen) — Enklere utfylling av casedetaljer + fjerning av Pitchtekst
- CR-032 (Done 2026-10-21, pushet som 391baf6 + d49b70f) — Automatiserte tester (Vitest 5.0.5, 144 tester) + `docs/SMOKE-TEST.md`. Ingen produksjonskode endret. Åpent: ingen annen person har fulgt SMOKE-TEST.md; Coolify-bygget etter push ikke eksplisitt verifisert av Claude. Se Session 10-avsnittet
- CR-031 (Done, bekreftet i produksjon 2026-10-20) — Sikkerhetsoppgradering: next 16.3.0→16.4.2, nodemailer 9→10, prisma 7.9.1→7.10.1 (+ adapter/klient), @types/nodemailer fjernet, `npm audit fix`. Audit 18→5, 0 critical. Rest: dev-only lint-kjede (ISSUE-015)
- CR-027 (Done, bekreftet i produksjon 2026-08-04) — Filopplasting til "Materiale"-seksjonen (bilder jpg/png/webp/gif, PDF, doc/docx), 100MB total-grense per case, lagret i Hetzner Object Storage (S3-kompatibel, delt bucket med backup, egen prefiks `effektbibliotek/case-materiale/`). Nytt `CaseFile`-modell, nye API-routes for opplasting/nedlasting/last-ned-alle/sletting. `Materiale`-widgeten (utvidet `LinksSection.tsx`) viser nå lenker og filer på BÅDE case-siden (kun vis/last ned) og redigeringssiden (full administrasjon). Eksporter-knappen (CR-025) gir nå et zip med tekstsammendrag + alle faktiske filer, ikke bare filnavn. To bugfixer underveis: (1) manglende `type="button"` i `LinksSection.tsx` sine egne knapper (samme klasse som CR-026-fiksen), (2) `LinksSection` sin "legg til lenke"-widget var et nestet `<form>` inni EditCaseForm sitt eget `<form>` (ugyldig HTML), konvertert til en vanlig `<div>` med knapp-triggered handler. S3_*-env-variabler er satt i Coolify av produkteier

## Production URL
https://effektbibliotek.basbeta.no — live, eneste produksjonsmiljø
https://effektbibliotek.vercel.app (gammel — klarert for fjerning 2026-08-05, se CR-008)

## Recently Modified Systems (denne økten, CR-009–023)
- Dockerfile — `prisma db push --accept-data-loss` (byttet fra `migrate deploy`, CR-011)
- lib/email.ts — SMTP-timeout (CR-009), sendUsageApprovalRequest med reply-to (CR-013/018), APP_URL (ikke NEXT_PUBLIC_, CR-013)
- lib/prisma.ts — connectionTimeoutMillis på pg-adapteren (CR-010)
- lib/usage-approval.ts — buildApprovalText personalisert (CR-013), PRIVACY_NOTICE/GDPR_NOTICE → buildPrivacyNotice (CR-015/019), sanitizeChoices erstatter computeUsageLevel (CR-020)
- lib/labels.ts — usageLevelLabels fjernet (CR-020)
- prisma/schema.prisma — approverName/approverEmail (CR-013), usageLevel-enum fjernet, 6 nye bruksrettighetsfelt (CR-020)
- instrumentation.ts, instrumentation-client.ts — nye, Bugsink/Sentry-init (CR-012)
- next.config.ts — wrappet med withSentryConfig (CR-012)
- app/api/auth/request-code/route.ts — try/catch + Sentry.captureException (CR-011/012)
- app/api/auth/me/route.ts — ny PATCH for å endre eget navn (CR-014)
- app/api/cases/[id]/send-approval-request/route.ts — ny, erstatter copy-approval-text (CR-013)
- app/api/cases/[id]/route.ts — server-side lås av bruksrettighetsfelt når submitted_locked (CR-021)
- app/api/cases/route.ts — bibliotek-filter bygget om for 6 flate bruksrettighetsfelt (CR-020)
- app/api/godkjenning/[caseId]/[token]/route.ts — sanitizeChoices, ownerEmail i emailParams (CR-018/020)
- app/godkjenning/[caseId]/[token]/page.tsx, ApprovalForm.tsx — forhåndsutfylling, personvern/GDPR-footer, 6 nye valg (CR-015/016/019/020)
- components/cases/ApprovalSection.tsx — e-postforhåndsvisning, trekkspill, permanent åpen ved lås (CR-015/017/023)
- components/cases/EditCaseForm.tsx — bruksrettigheter-seksjon (6 valg), lås ved submitted_locked, unlock-widget, visuell finpuss (CR-020–023)
- components/cases/UsageBadge.tsx — omskrevet for 6 flate valg i stedet for avledet nivå (CR-020)
- components/cases/CaseCard.tsx, CaseRow.tsx — oppdatert for nye UsageBadge-props (CR-020)
- components/cases/OwnerNameEditor.tsx — ny, blyant for å endre eget navn (CR-014)
- app/(app)/case/[id]/page.tsx — OwnerNameEditor, UsageBadge-props (CR-014/020)
- app/(app)/case/[id]/rediger/page.tsx — henter usageApprovalStatus + siste UsageApproval (CR-021)
- app/(app)/bibliotek/page.tsx — filter-dropdown for 6 bruksrettigheter (CR-020)
- app/(app)/mine-caser/page.tsx, oppfolging/page.tsx — oppdatert datamapping for nye felt (CR-020)
- .env.example, docs/COOLIFY-DEPLOY.md — SENTRY_DSN/NEXT_PUBLIC_SENTRY_DSN (CR-012), APP_URL (CR-013)
- package.json/package-lock.json — @sentry/nextjs lagt til (CR-012)

## Nylig endret (CR-024–027, 2026-08-04)
- Dockerfile — `prisma migrate deploy` (CR-024), revertert til `db push --accept-data-loss` to ganger under ISSUE-011-hendelsene (CR-025-nedetiden, deretter en andre nedetid under selve oppryddingen), endelig tilbake på `prisma migrate deploy` (commit a25de77) — dette er GJELDENDE tilstand akkurat nå, ISSUE-011 er løst
- prisma/schema.prisma — `onDelete: Cascade` på UsageApproval/CaseLink (CR-025), nytt `CaseFile`-modell med `onDelete: Cascade` fra start (CR-027)
- prisma/migrations/20260804120000_init — baseline-migrering (CR-024), BOM fjernet i emergency-fix
- prisma/migrations/20260804130000_case_cascade_delete — cascade-migrering (CR-025), BOM fjernet i emergency-fix, nå korrekt anvendt av `migrate deploy` (ISSUE-011 løst 2026-08-05)
- prisma/migrations/20260804140000_case_file — ny, `CaseFile`-tabell (CR-027), generert BOM-fritt fra start denne gangen
- lib/case-export.ts — ny, bygger tekst-eksport av case/lenker/godkjenninger (CR-025)
- lib/storage.ts — ny, S3-klient-wrapper for Hetzner Object Storage (CR-027). Fikk delte `buildCaseZip()`/`slugifyForFilename()`-hjelpefunksjoner, gjenbrukt av export- og download-all-routene
- lib/format.ts — ny `formatBytes()`-hjelpefunksjon (CR-027)
- app/api/cases/[id]/route.ts — ny DELETE-handler (CR-025), rydder nå også opp S3-objekter før sletting (CR-027)
- app/api/cases/[id]/export/route.ts — ny, tekst-eksport (CR-025) — returnerer nå et zip-arkiv med tekstsammendrag + alle faktiske opplastede filer, ikke bare filnavn (CR-027)
- app/api/cases/[id]/files/route.ts, files/[fileId]/route.ts, files/download-all/route.ts — nye, opplasting/nedlasting/last-ned-alle (zip)/sletting (CR-027)
- app/api/admin/users/list/route.ts — tilgang relaksert til alle innloggede (CR-025)
- components/cases/LinksSection.tsx — utvidet til å vise/administrere opplastede filer i tillegg til lenker, eksplisitt "Last ned"/"Last ned alle", `window.confirm()` før filsletting (CR-027). To bugfixer: manglende `type="button"` på to eksisterende knapper; "legg til lenke"-widgeten var et nestet `<form>` inni EditCaseForm sitt eget `<form>` (ugyldig HTML) — konvertert til `<div>` med knapp-triggered handler
- components/cases/EditCaseForm.tsx — "Farlig sone"-slette-dialog og eierbytte-dropdown for eier ELLER admin (CR-025); Bruksrettigheter-avkrysningsbokser fjernet, erstattet med ApprovalSection-widget (CR-026); slette-dialogen lister nå også filer (CR-027)
- components/cases/ApprovalSection.tsx — manglende `type="button"` på alle 5 knapper, fikset (CR-026 bugfix)
- app/(app)/case/[id]/page.tsx — eksporter-knapp (CR-025); viser nå også Materiale-widgeten (kun vis/last ned, `canManage={false}` uansett rolle — administrasjon er kun i redigeringsskjemaet), med `mb-4`-wrapper for riktig spacing mot ApprovalSection over (CR-027)
- app/(app)/case/[id]/rediger/page.tsx — henter full usageApprovals-historikk, isOwner-prop (CR-025); henter owner.name, sender approverName/approverEmail/ownerName/token/appUrl til EditCaseForm (CR-026); henter og sender `files` (CR-027)
- .env.example, docs/COOLIFY-DEPLOY.md — nye S3_*-env-variabler (CR-027)
- package.json/package-lock.json — `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `jszip` lagt til (CR-027)

## Nylig endret (Session 8, 2026-08-04–05)
- Dockerfile — ISSUE-011 endelig løst: `db push` → `migrate deploy` (78c8dfc) → crash-loop nr. 2 (P3009 på `case_file`) → `db push` emergency-fix (a4490c7) → `migrate deploy` på nytt etter korrekt `migrate resolve --applied 20260804140000_case_file` (a25de77). GJELDENDE tilstand: `migrate deploy`, bekreftet stabil.
- package-lock.json — `npm audit fix` (uten `--force`), 9 av 13 sårbarheter rettet, `package.json` uendret (78bf6c0)
- .gitignore, docs/extracted.txt — ISSUE-005: lagt til gitignore, fjernet fra tracking med `git rm --cached`, lokal fil beholdt (53cf5ba)
- sessions/*.md — løpende oppdatert gjennom økten for CR-027-bekreftelse, ISSUE-011 (to hendelser + løsning), ISSUE-012 (ny), ISSUE-005 (løst)

## Nylig endret (Session 9, 2026-08-05)
- change-requests/CR-028-dependency-oppgradering.md — ny, dokumenterer next/nodemailer/postcss/sharp-oppgraderingen (ISSUE-012)
- package.json, package-lock.json — `next` 16.2.6→16.3.0 (eksakt pin), `nodemailer` ^8.0.7→^9.0.4, `eslint-config-next`→16.3.0, `@types/nodemailer`→^8.0.1. Pushet og bekreftet i produksjon
- change-requests/CR-029-tidssone-klokkeslett-bugfix.md — ny, dokumenterer klokkeslett-bugen funnet under CR-028-smoke-testen
- lib/email.ts, lib/format.ts — lagt til `timeZone: "Europe/Oslo"` i alle tre `toLocale*`-kall (CR-029). Pushet og bekreftet i produksjon
- change-requests/CR-030-ny-case-knapp-sidemeny.md — ny, dokumenterer knappeflyttingen
- components/layout/Topbar.tsx, components/layout/SideNav.tsx — "+ Legg inn case"-knapp flyttet fra topbar til toppen av sidemenyen, omdøpt til "+ Ny Case" (CR-030). Pushet og bekreftet visuelt i produksjon
- app/godkjenning/[caseId]/[token]/ApprovalForm.tsx, page.tsx, lib/usage-approval.ts — produkteier sine egne manuelle ordlyd-justeringer på godkjenningssidens kvitteringsskjerm og personvernavsnitt (to commits: "copy: soften confirmation wording...", "General text updates" + én ekstra "Tekstendring"-commit produkteier pushet selv). Ingen funksjonell endring, `npx tsc --noEmit` ✓ verifisert av Claude for den delen som ble committet gjennom denne økten
- **CR-008 avsluttet:** package.json/package-lock.json — ubrukt `resend`-avhengighet fjernet (`npm audit`: fortsatt 0 sårbarheter). README.md — auto-generert Vercel-deploy-seksjon fra `create-next-app` erstattet med korrekt Coolify/Docker-beskrivelse. change-requests/CR-008-port-til-hetzner-coolify.md, docs/COOLIFY-DEPLOY.md §7 — oppdatert til Done/klarert for fjerning

## Tidligere sesjoners systemer (uendret denne økten)
- app/api/cases/[id]/unlock-approval/route.ts, components/cases/LinksSection.tsx, app/(app)/admin/*, app/api/admin/*, components/layout/SideNav.tsx, proxy.ts

## Tech Stack Notes (oppdaget under implementering)
- Next.js 16.2.6 bruker `proxy.ts` ikke `middleware.ts`
- Prisma 7 krever driver adapter (`@prisma/adapter-pg`) — ingen URL i constructor
- Tailwind v4: tokens via `@theme inline {}` i CSS, ikke `tailwind.config.ts`
- Prisma client output: `app/generated/prisma/client.ts` (ikke `@prisma/client`)
- Next.js 16: `params` og `searchParams` i page/layout er Promises — må awaites
- **OPPDATERT i CR-013 (se linje under om NEXT_PUBLIC_-fallgruven):** Godkjenningslenke brukte tidligere (Vercel-æraen) alltid `new URL(request.url).origin`. Etter porten til Coolify/Traefik er dette upålitelig i API-routes (resolver til `localhost:3000`) — lenkebygging bruker nå `process.env.APP_URL` først, med `request.url.origin` kun som lokal dev-fallback
- `crypto.randomUUID().replace(/-/g, "")` brukes for token-generering (ingen @paralleldrive/cuid2)
- E-post sendes via Nodemailer + Brevo SMTP (byttet fra Gmail SMTP i CR-008), aldri Resend
- `Promise.allSettled()` for e-postutsending (feil i e-post stopper ikke godkjenning)
- `prisma generate && next build` i build-script — kjøres nå inne i Docker-imaget, ikke på Vercel
- Prisma 7 driver adapter er "engine-less" (ingen Rust query-engine-binær) — Dockerfile trenger ikke kopiere Prisma-engines separat
- `prisma migrate deploy` kjøres i container-`CMD` ved hver oppstart (idempotent) i stedet for som eget Coolify-hook — dette gikk gjennom to runder nedetid (CR-025 sin BOM-feil, deretter en `--rolled-back` vs. `--applied`-forveksling under selve ISSUE-011-oppryddingen), men er nå den stabile, gjeldende tilstanden per 2026-08-04
- Node 22 Alpine i Dockerfile for å matche faktisk utviklingsmiljø (avviker fra `basbeta-bootstrap`-malens Node 20)
- nodemailer-transportøren i lib/email.ts hadde ingen connection/socket-timeout — en feilkonfigurert eller nettverksmessig utilgjengelig SMTP-server hang requesten på ubestemt tid i stedet for å feile (CR-009)
- `pg.Pool` (brukt av `@prisma/adapter-pg`) sin default `connectionTimeoutMillis` er `0` — ingen timeout, venter for alltid ved utilgjengelig database. Satt eksplisitt til 10s i lib/prisma.ts (CR-010). Samme bugklasse som CR-009, bare ett lag lenger opp i requesten
- `prisma/migrations` eksisterte ikke i dette repoet før CR-024 (2026-08-04) — frem til da brukte prosjektet alltid `prisma db push` for skjema. `prisma migrate deploy` i Dockerfile CMD var derfor en stille no-op mot den ferske Coolify-databasen i CR-011. CR-024 rettet opp dette: baseline-migrering generert og produksjonsdatabasen baselinet med `migrate resolve --applied`, rullet ut i to atskilte deploys pga. autodeploy (se `sessions/DECISIONS.md` for full rekkefølge). Skjemaendringer skal fra nå av gjøres med `prisma migrate dev` lokalt, ikke `db push`
- Uhåndterte feil i en Next.js Route Handler gir ikke garantert gyldig JSON-svar — hvis frontend gjør `res.json()` uten feilhåndtering, kan en rask serverfeil se ut som en evig hengende request i UI-et (CR-011)
- `NEXT_PUBLIC_*`-variabler bygges statisk inn i koden ved `next build`, også i server-only kode — en variabel som ikke er tilgjengelig ved selve build-steget (kun "Runtime" i Coolify, ikke "Buildtime") blir permanent `undefined`, uansett senere runtime-endringer. Bruk aldri dette prefikset for verdier som kun trengs server-side (CR-013)
- Sentry sin transport følger ikke HTTP-redirects — hvis Bugsink-hosten redirecter HTTP→HTTPS, feiler event-sending stille med kun en `debug: true`-synlig 307-logglinje, ingen synlig feil ellers (CR-012)
- I dette prosjektet er skrivebeskyttede/read-only informasjonslister stilt med flat ✓/— i stedet for checkbox-glyfer (☑/☐) — sistnevnte oppleves som en inert/deaktivert form, ikke informasjon (CR-023, avklart med produkteier via mockup-spørsmål)
- **PowerShell sin `Out-File -Encoding utf8` skriver en UTF-8 BOM** (`ef bb bf`) først i filen. For migration.sql-filer som faktisk kjøres av Postgres (ikke bare leses/diffes), avviser Postgres hele scriptet med en syntax-feil ved posisjon 0. Bruk `[System.IO.File]::WriteAllBytes` med BOM-en manuelt fjernet, eller `-Encoding utf8NoBOM`, for enhver fil generert via PowerShell som skal kjøres som SQL (CR-025/ISSUE-011 — crash-loopet produksjon til Coolify sin restart-grense og krevde manuell "Redeploy" for å komme tilbake). Windows PowerShell 5.1 (denne maskinen) støtter IKKE `-Encoding utf8NoBOM` (lagt til i PowerShell 6+/Core) — bruk `[System.IO.File]::WriteAllText($path, $content, (New-Object System.Text.UTF8Encoding($false)))` i stedet (CR-027, migreringen generert BOM-fritt fra start med denne metoden)
- Hetzner Object Storage (S3-kompatibel) krever `forcePathStyle: true` i `@aws-sdk/client-s3` sin `S3Client`-config — Coolify sitt "S3 Storages"-panel viser Endpoint og Bucket som separate felt (ikke `bucket.endpoint`-virtual-hosted-stil), som indikerer path-style-adressering (CR-027, `lib/storage.ts`)

## Validation Status
- Build (lokal, `npm run build`): ✓ — kjørt og bekreftet grønt etter HVER commit fra CR-011 og utover (Node 22 installert lokalt spesifikt for dette, se notat over)
- TypeScript: ✓ (ingen feil)
- Docker build: verifisert indirekte — bygger og kjører stabilt i Coolify (produkteiers egen build)
- Build (Vercel prod, gammel): ✓
- Deploy Coolify: ✓ live på effektbibliotek.basbeta.no, container kjører stabilt (ikke lenger crash-loop)
- Innlogging (OTP via Brevo) i produksjon: ✓ bekreftet av produkteier 2026-08-03
- Feilsporing (Bugsink): ✓ bekreftet med reell testfeil 2026-08-03
- Direkte utsending av bruksgodkjenning (CR-013): ✓ bekreftet — e-post sendt og godkjenningslenke fungerer
- Rediger eget navn (CR-014): ✓ bekreftet
- Forenklet bruksrettighets-system, låst/opplåst UI (CR-020–023): ✓ bekreftet av produkteier 2026-08-04, inkl. skjemaendring (kolonner droppet) uten problemer
- Formelle Prisma-migreringer (CR-024) og ISSUE-011-opprydding: ✓ — appen kjører nå permanent på `prisma migrate deploy`, alle tre migreringer (`init`, `case_cascade_delete`, `case_file`) korrekt bokført som `applied`, bekreftet av produkteier 2026-08-04
- Slett case / eksport / eierbytte for eier (CR-025): ✓ live i produksjon 2026-08-04. `onDelete: Cascade` bekreftet anvendt ("database er nå i sync med Prisma-skjema"). Slett-dialog og eksport ✓ E2E-bekreftet av produkteier 2026-08-05. Eierbytte fortsatt ikke E2E-testet — krever en annen brukerkonto
- Bruksrettigheter via ApprovalSection i redigeringsskjemaet (CR-026): ✓ bekreftet i produksjon av produkteier 2026-08-04, inkl. bugfix (manglende `type="button"`)
- Filopplasting til Materiale-seksjonen (CR-027): `npm run build` ✓ (inkl. TypeScript-sjekk) på alle seks commits. Pushet, autodeployet og bekreftet fungerende i produksjon av produkteier 2026-08-04
- npm audit fix (ISSUE-012 åpnet for resten): `npm run build` ✓ (Next.js forblir 16.2.6, ingen major-bump), pushet og autodeployet uten incident
- docs/extracted.txt gitignore-opprydding (ISSUE-005): ingen kodeendring, ingen build påvirket, pushet uten incident
- CR-028 (ISSUE-012 løst): `npm audit` 0 sårbarheter (ned fra 4), `npm run build` ✓ (Next.js 16.3.0/Turbopack, alle 27 ruter), `npx tsc --noEmit` ✓. Pushet, bekreftet i produksjon av produkteier (OTP/bruksgodkjenning fungerer)
- CR-029 (klokkeslett-bugfix): `npx tsc --noEmit` ✓, `npm run build` ✓. Pushet, bekreftet i produksjon av produkteier — korrekt klokkeslett i ny test-e-post
- CR-030 ("Ny Case"-knapp flyttet til sidemeny): `npx tsc --noEmit` ✓, `npm run build` ✓. Pushet, bekreftet visuelt i produksjon av produkteier
- CR-008 avsluttet: backup + Uptime Kuma bekreftet av produkteier, `npm install`/`npx tsc --noEmit`/`npm run build` ✓ etter fjerning av ubrukt `resend`-avhengighet, `npm audit` fortsatt 0 sårbarheter

## Next Actions (prioritert)
**Anbefalt rekkefølge for neste økt (oppdatert ved slutten av Session 11, 2026-10-22):**
0. **Først:** commit/push session-filene fra `/end-session` (diff → «push»). Deretter ISSUE-019: bekreft i Coolify-loggen at CR-035-migrasjonen ble anvendt.
1. ~~Fullfør CR-034~~ — ferdig 2026-10-22 (pushet, verifisert i produksjon, Done). CR-035 til CR-038 er også Done.
2. ~~Utvid `docs/SMOKE-TEST.md`~~ — gjort 2026-10-22 (steg 1b skjema, 1c fyll-ut-fra-panel). **Gjenstår:** få en annen person til å følge hele sjekklisten uten ekstra kontekst og rette uklarheter (åpent akseptansekriterium fra CR-032).
3. ~~Rydd `triage.ps1`~~ — slettet 2026-10-22.
4. **ISSUE-016:** bestem om S3-feil ved sletting skal logges/Sentry-rapporteres (egen CR) eller aksepteres; sjekk evt. bucketen manuelt for orphan-objekter etter test-caser.
5. **Liten opprydding-CR for ISSUE-018** (`npm run lint` er rød fra før: `Date.now()` i `oppfolging/page.tsx` + to ubrukte importer), slik at lint kan brukes som grønn port. Kan samles med ISSUE-017 (`isBasEmail`, OTP-grense, `formatBytes`).
6. **Videre skjemaforbedringer, hver som egen CR:** klikk-for-å-fylle-ut også på Oppfølging/Mine caser; statusstyrt sjekkliste øverst i redigeringsskjemaet; caseformat/maler; bransjeforslag fra tidligere caser; autolagrede utkast.
7. Lav prioritet: ISSUE-015 (dev-only lint-kjede), ISSUE-006 (verifiser om admin-bruker i prod er ordnet), ISSUE-010 (CR-015/016/019 enkeltvis), eierbytte-testen (CR-025, krever ikke-admin-konto), CI-varsling (potensiell CR-035), rate-limit/Traefik-filter mot Server Action-sondering. Produkteier fjerner Vercel/Neon (CR-008) hvis ikke gjort.

**Eldre liste (delvis utdatert, beholdt for historikk):**
0. **(Ny, Session 10)** (a) ~~Re-verifiser etter CR-031: Reply-To/cc, filnedlasting, slett/eksport~~ — utført 2026-10-20 via Claude in Chrome på en test-case, alt ✓ (se IMPLEMENTATION-LEDGER; S3-opprydding ved sletting ikke verifisert). (b) ~~Registrer ny CR for minimal automatisert smoke-test-suite~~ — CR-032 implementert lokalt 2026-10-21, venter på commit/push og gjennomgang; deretter: ta stilling til ISSUE-016/017 og om CI-varsling (CR-033) er ønskelig. (c) Ta stilling til ISSUE-015 (dev-only `braces`) når `eslint-config-next` får patch. (d) Vurder rate-limit/Traefik-filter hvis Server Action-sondering i loggene blir støyende
1. **Produkteier fjerner Vercel-prosjektet og sletter Neon-databasen** manuelt i sine respektive dashboards — klarert 2026-08-05 (CR-008 Done), ingen kodeendring involvert. Gi beskjed når gjort så det kan logges
2. **Eierbytte-testen (siste del av CR-025)** — opprett/bruk en annen brukerkonto (ikke-admin) og bekreft at eierbytte-dropdownen fungerer for en faktisk ikke-admin-eier. Blokkert inntil produkteier har en slik konto tilgjengelig
3. **(Anbefalt, lav innsats)** Bekreft CR-015, CR-016, CR-018, CR-019 hver for seg hvis full sikkerhet ønskes: (a) sammenlign e-postforhåndsvisning mot faktisk mottatt e-post ord for ord, (b) svar på en godkjenningsforespørsel-e-post og verifiser at svaret går til caseeieren (reply-to), (c) les gjennom kvitteringssiden og personvernteksten på selve godkjenningssiden (ikke bare i e-post)
4. Opprett admin-bruker i produksjonsdatabasen (første login + manuell `isAdmin`-sett i Coolify sin database-ressurs) — ISSUE-006, fortsatt åpen
5. Ende-til-ende-test av gjenstående flyter: case-opprettelse, redigering av felt utenom bruksrettigheter (de er nå grundig testet)
6. ~~Vurder om det skal legges til en enkel automatisert test/smoke-test-suite~~ — gjort via CR-032 (2026-10-21)
