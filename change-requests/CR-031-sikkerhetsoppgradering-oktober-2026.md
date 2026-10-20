# CR-031: Sikkerhetsoppgradering av avhengigheter (next, nodemailer, prisma m.fl.) — oktober 2026

**Status:** Done (2026-10-20, bekreftet i produksjon av produkteier — OTP og bruksgodkjenning-e-post)
**Created:** 2026-10-20

---

## Business Goal
Lukke nye kjente sårbarheter i produksjonsavhengighetene (inkl. 1 critical) og rydde opp i ISSUE-014, uten regresjon i produksjon.

## Problem Statement
`npm audit` (kjørt 2026-10-20) viser 18 sårbarheter (1 critical, 16 high, 1 moderate) — `sessions/`-filene sier fortsatt «0», så de er utdaterte. Nye advisories er publisert siden CR-028 (2026-08-05).

Relevante for produksjonskode:
- **`next@16.3.0` (critical).** Tre RCE-advisories: (a) Windows-hostede servere — ikke relevant, vi kjører Alpine; (b) Image Optimization API med AVIF; (c) `next/og` `ImageResponse` (GHSA-vcvr-r3jv-pc5j / CVE-2026-94545, rammer `>=16.2.0 <16.3.6`). Pluss cache-poisoning av SSG/ISR i selvhostede apper. Fiks: `16.4.2` (ikke semver-major).
- **`nodemailer@9.0.4` (high).** Kvadratisk tid i `addressparser` (DoS), samt bypass av mottakerdomene-validering (IDN/Punycode og RFC 5322-kommentarer) som kan levere e-post til angriper-domene. `lib/email.ts` tar inn brukeroppgitte adresser (godkjenner-e-post), så dette er relevant. Fiks: `10.x` (major).
- **`sharp` (high, transitiv via next).** libheif/librsvg-CVE-er.
- **`prisma`/`@prisma/config`/`deepmerge-ts` (ISSUE-014).** `@prisma/config@7.10.1` bruker `deepmerge-ts@8.0.2` (fikset i 8.0.0). `7.10.1` er en patch-oppgradering innen Prisma 7, ikke nedgradering.
- Dev-/tooling-transitiver: `braces`, `brace-expansion`, `fast-glob`, `micromatch`, `eslint-config-next`, `js-yaml`, `fast-uri`, `browserslist`, `source-map-js`, `baseline-browser-mapping`, `mysql2` (via Prisma-dev).

## Proposed Solution
1. Oppgrader `next` og `eslint-config-next` til eksakt `16.4.2` (bevarer eksakt-pin-konvensjonen).
2. Oppgrader `nodemailer` til `^10.1.7`. Verifiser `@types/nodemailer` (v10 er rapportert å være TypeScript-migrert — typepakken kan være overflødig eller feil).
3. Oppgrader `prisma` og `@prisma/client` til `7.10.1` (IKKE `8.0.0-rc.*`).
4. `npm audit fix` for gjenstående transitiver; `--force` kun etter at hver foreslått endring er vurdert individuelt (jf. ISSUE-014: `--force` har tidligere foreslått nedgradering).
5. Alle `npm install`/`npm update`-kall kjøres først med `--ignore-scripts`, og `package-lock.json`-diffen gjennomgås (nye pakker, `resolved`-URL-er utenfor registry.npmjs.org, nye `hasInstallScript`) før installasjon med scripts. Begrunnelse: aktiv npm-supply-chain-ormkampanje i 2026 (se DECISIONS 2026-10-20).

**Research utført:**
- Kodebasen bruker verken `next/og`, `ImageResponse` eller `next/image` (søk 2026-10-20) — to av tre Next.js-RCE-ene er ikke eksponert i praksis, men oppgraderes uansett.
- Nodemailer 9.0.0 sin breaking change (TLS-validering ved eksterne fetch) er allerede håndtert i CR-028. Nodemailer 10.0.0: Node ≥20 (vi kjører 22) og fjerning av Node 6-syntakssjekk. Kun tredjeparts changelog-speil funnet — **offisiell changelog må leses før implementasjon.**
- Next.js 16.4: offisiell upgrade-guide ikke funnet i søk — **må leses på nextjs.org før implementasjon**; spesielt Cache Components/prefetch-endringer og React 19.3.
- `lib/email.ts` bruker `createTransport` og fire `sendMail`-kall (linje 4, 21, 49, 79, 127); ingen attachments/OAuth2/`raw` (jf. CR-028).

## Impact Analysis

### Affected Specs
- [ ] specs/vision.md
- [ ] specs/requirements.md
- [ ] specs/entities.md
- [ ] specs/flows.md
- [ ] specs/architecture.md
- [ ] specs/api.yaml
- [ ] specs/ui-spec.md
- [x] specs/nfr.md — kun hvis versjonsnumre står eksplisitt (sjekkes ved implementasjon)

### Affected Components
- `package.json` / `package-lock.json`
- `lib/email.ts` — ingen forventet endring, men eneste nodemailer-bruker, verifiseres eksplisitt (særlig typer og mottakerhåndtering)
- `lib/prisma.ts`, `prisma.config.ts`, `prisma/schema.prisma` — verifiseres mot Prisma 7.10.1 (`prisma generate`, driver adapter)
- `proxy.ts`, `next.config.ts` (`withSentryConfig`) — verifiseres mot Next 16.4.2

### Database Impact
Ingen skjemaendring. `prisma migrate deploy` kjører uendret ved oppstart; Prisma-CLI-versjon endres, så deploy-loggen følges nøye (jf. ISSUE-011-historikken).

### API Impact
Ingen tilsiktet endring.

### UX Impact
Ingen.

### Security Impact
Lukker 1 critical + flere high. Positiv. Supply-chain-risiko ved selve oppgraderingen mitigeres med `--ignore-scripts` + lockfile-gjennomgang.

### Performance Impact
Ingen forventet endring.

---

## Acceptance Criteria
- [x] Offisielle upgrade-notater for Next.js 16.4 og nodemailer 10 lest og sammenlignet mot kodebasen (dokumentert under Validation Notes)
- [x] `package-lock.json`-diff gjennomgått: ingen nye/ukjente pakker utover `sql-escaper`/`confbox` (legitime transitiver), ingen `resolved` utenfor registry.npmjs.org, ingen nye install-scripts
- [x] `npm audit` viser 0 critical og 0 high i produksjonsavhengigheter. **Endret fra opprinnelig «0 high totalt»:** 5 high gjenstår i dev-only lint-kjeden (eslint-config-next → braces), sporet som ISSUE-015 — `--force`-fiksen er en nedgradering til 14.2.35
- [x] `npx tsc --noEmit` grønt
- [x] `npm run build` grønt (inkl. `prisma generate`)
- [x] `next` og `eslint-config-next` eksakt pinnet til samme versjon (16.4.2)
- [x] Push (etter eksplisitt «push») og ren autodeploy i Coolify; deploy 1: «No pending migrations to apply», Running (healthy)
- [x] Produkteier bekrefter OTP-innlogging og bruksgodkjenning-e-post i produksjon. Reply-To/cc (reply-to og cc = caseeier, verifisert i mottatt Gmail-header), filopplasting/-nedlasting, eksport (zip) og slett case verifisert via Claude in Chrome på en test-case som ble slettet etterpå. **Ikke verifisert:** at S3-objektet faktisk fjernes ved case-sletting
- [x] ISSUE-014 lukket; OPEN-ISSUES/CURRENT-STATE oppdatert

## Required Tests
- [ ] Unit: — (ingen automatiserte tester i prosjektet; adresseres av egen CR for smoke-tester)
- [ ] Integration: `npm run build` + `tsc --noEmit` som proxy
- [ ] E2E: manuell produksjonssmoke-test (liste over)

## Rollback Strategy
Ren avhengighetsendring uten skjema/API-endring. Rollback = revert commit, redeploy. Hvis containeren crash-looper til restart-grensen kreves manuell «Redeploy» i Coolify (lærdom fra ISSUE-011). Foreslått: del i to commits/deploys (1: next + prisma, 2: nodemailer + resten) for å isolere feilkilde og redusere blast radius.

## Migration Strategy
Ingen datamigrasjon.

## Risks
- Next 16.4 kan inneholde endringer utover det som er funnet i research (Cache Components, prefetch, React 19.3) — mitigeres ved lesing av offisiell guide og `npm run build`
- Nodemailer 10 er en major-bump med TypeScript-migrering; typer og ESM/CJS-oppførsel kan endres
- Prisma-CLI-endring i container-`CMD` (`migrate deploy`) — to tidligere nedetider i dette området
- Ingen automatiserte tester — verifisering er build + manuell smoke-test
- Supply-chain: oppgradering henter mange nye pakkeversjoner; mitigert som beskrevet under Proposed Solution
- Dev-maskin: triage for kjente ormeindikatorer gjort 2026-10-20 uten funn, men det er ikke bevis for at maskinen er ren

## Dependencies
Ingen. Anbefalt rekkefølge: denne CR-en før CR for smoke-tester.

## Validation Notes
**Deploy 1 (commit 265a044):** `next` 16.3.0→16.4.2 (eksakt), `eslint-config-next`→16.4.2, `prisma`/`@prisma/client`/`@prisma/adapter-pg`→^7.10.1 (adapter ble løftet for å unngå versjonsskjevhet mot klient — ikke eksplisitt i opprinnelig scope). Installert med `--ignore-scripts`. Lockfile: 62 versjonsendringer, 2 nye pakker (`sql-escaper` — ny avhengighet av `mysql2@3.24.4`, mysqljs-org; nøstet `confbox@0.3.1`), 5 fjernet; alle `resolved` på registry.npmjs.org; install-scripts kun `prisma`/`@prisma/engines` som før. `deepmerge-ts` 7.1.5→8.0.2 (ISSUE-014 løst). Audit 18→12 (0 critical). Deploy-logg: «3 migrations found / No pending migrations to apply», Next.js 16.4.2 Ready, Running (healthy). OTP bekreftet.

**Deploy 2 (commit 0f5148d):** `nodemailer` ^9.0.4→^10.1.7, `@types/nodemailer` fjernet (v10 har egne typer; `tsc` grønt uten), `npm audit fix` uten `--force` (fast-uri, js-yaml, brace-expansion, browserslist, source-map-js m.fl.). Lockfile: ingen nye pakker, 1 fjernet, 13 versjonsendringer, ingen nye install-scripts. Offline-sanity-test med `jsonTransport` bekreftet from/to/cc/replyTo/subject med æøå. Audit 12→5. OTP og bruksgodkjenning-e-post bekreftet av produkteier.

**Offisielle notater:** Next.js 16-guiden (oppdatert 2026-10-15) — ingen punkter treffer oss (ingen webpack-config, `middleware.ts`, `cacheComponents`, `next/image`, parallelle ruter; Node 22, `proxy.ts`, async params allerede på plass); ingen separate 16.4-breaking changes funnet. Nodemailer changelog 9.0.4→10.1.7: eneste breaking er Node ≥20; resten er parser-/transport-herding.

**Logg-observasjon etter deploy 1:** Coolify-loggen viste mange «Server Reference ID did not match the expected format» (mottatt «0», «1», «action», «x», «y»). Appen bruker ingen Server Actions (ingen `"use server"`/`next-action` i koden), så dette er trolig ekstern skanner-sondering som Next.js avviser korrekt. Ikke verifisert mot Traefik-logger (IP/User-Agent).
