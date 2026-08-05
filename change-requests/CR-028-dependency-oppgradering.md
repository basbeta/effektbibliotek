# CR-028: Sikkerhetsoppgradering av gjenstående avhengigheter (ISSUE-012)

**Status:** Done, bekreftet i produksjon
**Created:** 2026-08-05

---

## Business Goal
Lukke de 4 gjenstående høy-alvorlighetsgrad-sårbarhetene som `npm audit fix` (uten `--force`) ikke kunne løse i forrige økt, uten å introdusere regresjon i produksjon.

## Problem Statement
`npm audit` viser 4 gjenværende high-severity-sårbarheter (ISSUE-012):
- `next` 9.3.4-canary.0–16.3.0-preview.10 — flere CVE-er (SSRF i Server Actions/rewrites på custom servers, cache-forvirring, DoS i Image Optimization via SVG, uautentisert disclosure av interne Server Function-endepunkter, m.fl.)
- `postcss` (bundlet transitivt via `next`) — XSS via ustrippet `</style>`, path traversal/informasjonslekkasje via `sourceMappingURL`
- `sharp` (bundlet transitivt via `next`, brukes til Image Optimization) — arvede libvips-CVE-er (CVE-2026-33327/33328/35590/35591)
- `nodemailer` — "raw"-opsjonen kan omgå `disableFileAccess`/`disableUrlAccess`, gir potensiell fil-lesing/SSRF

Alle fire krever `npm audit fix --force`, som installerer `next@16.3.0` (utenfor `package.json` sin pinnede `16.2.6`) og `nodemailer@9.0.4` (major-bump fra `^8.0.7`). Dette ble bevisst utsatt i forrige økt (commit 78bf6c0) for å bli vurdert som en egen, testet oppgradering.

## Proposed Solution
Kjør `npm audit fix --force`, verifiser at oppgraderingen er trygg for denne kodebasen spesifikt, og bygg/typecheck lokalt før push.

**Research utført før implementering:**
- Next.js 16.3 sine offisielle breaking changes (Node.js ≥20.9, TypeScript ≥5.1, synkron `params`/`searchParams`-tilgang forbudt) er allerede oppfylt av dette prosjektet (Node 22, TS 5.x, og `params`/`searchParams` awaites allerede iht. `sessions/CURRENT-STATE.md` sine Tech Stack Notes).
- Nodemailer v9 sin eneste reelle breaking change er strengere TLS-sertifikatvalidering for eksterne HTTP(S)-kall gjort AV nodemailer selv (attachment-URL-henting, OAuth2-token-endepunkter, proxy CONNECT) og at `disableFileAccess`/`disableUrlAccess` nå faktisk håndheves for `raw`-opsjonen. `lib/email.ts` bruker ingen av disse (ingen attachments, ingen OAuth2, ingen `raw`-melding, kun standard `sendMail({from, to, cc, replyTo, subject, text})`) — ingen kodeendring forventet nødvendig.

## Impact Analysis

### Affected Specs
- [x] specs/nfr.md — "Next.js 16.x" i tech-stack-tabellen dekker fortsatt 16.3.0, ingen tekstendring nødvendig

### Affected Components
- `package.json` / `package-lock.json` — `next` 16.2.6→16.3.0, `nodemailer` ^8.0.7→^9.0.4, transitivt `postcss`/`sharp` oppgradert via `next`
- `eslint-config-next` bør følge samme `next`-versjon (pinnet eksakt i devDependencies)
- `lib/email.ts` — ingen forventet endring, men verifiseres eksplisitt siden det er eneste bruker av `nodemailer`

### Database Impact
Ingen.

### API Impact
Ingen tilsiktet endring i API-kontrakter.

### UX Impact
Ingen.

### Security Impact
Lukker 4 kjente høy-alvorlighetsgrad CVE-er. Positiv sikkerhetsendring.

### Performance Impact
Ingen forventet endring.

## Acceptance Criteria
- [x] `npm audit` viser 0 sårbarheter etter oppgradering
- [x] `npm run build` (inkl. `prisma generate` + TypeScript-sjekk) grønt
- [x] `npx tsc --noEmit` grønt
- [x] Manuell kodegjennomgang av `lib/email.ts` bekrefter ingen bruk av nodemailer sine berørte funksjoner (attachments via URL, OAuth2, `raw`)
- [x] Push til master og bekreftet ren autodeploy i Coolify — bekreftet av produkteier 2026-08-05 (OTP-innlogging og bruksgodkjenning-e-post fungerer)

## Required Tests
- [ ] Unit: —（ingen automatiserte tester i prosjektet, jf. Risks i CURRENT-STATE.md)
- [ ] Integration: `npm run build` som proxy for kompileringskorrekthet
- [ ] E2E: Manuell verifisering av OTP-innlogging og bruksgodkjenning-e-post i produksjon etter deploy (av produkteier)

## Rollback Strategy
Ren `package.json`/`package-lock.json`-endring, ingen skjema- eller API-endring. Rollback = revert commit, `npm install`, redeploy. Lavt blast radius siden Coolify autodeployer fra master — hvis noe uventet skjer, samme reverter-mønster som tidligere emergency-fixes i dette prosjektet.

## Migration Strategy
Ingen datamigrasjon.

## Risks
- `next`-major-lignende bump (16.2.6→16.3.0) er utenfor tidligere pinnet range — selv om offisielle breaking changes ikke ser ut til å berøre denne kodebasen, er dette ikke verifisert med en full manuell gjennomgang av alle Next.js 16.3-endringer, kun de dokumenterte breaking changes
- `nodemailer` major-bump (8→9) — mitigert av at berørte funksjoner (attachment-URL-henting, OAuth2, `raw`) ikke brukes i `lib/email.ts`
- Ingen automatiserte tester i prosjektet — verifisering er begrenset til `npm run build`/TypeScript-sjekk + manuell kodegjennomgang, samme begrensning som alle tidligere CR-er i dette prosjektet

## Dependencies
Ingen.

## Validation Notes
`npm audit fix --force` kjørt: `next` 16.2.6→16.3.0 (re-pinnet eksakt, ikke `^16.3.0`, i tråd med prosjektets eksisterende konvensjon), `nodemailer` ^8.0.7→^9.0.4. `eslint-config-next` manuelt oppdatert til `16.3.0` for å matche (samme konvensjon som før), `@types/nodemailer` bumpet til nyeste tilgjengelige `^8.0.1` (ingen v9-typer publisert på DefinitelyTyped ennå — API-et er uendret, ingen typefeil observert). `npm audit` viser 0 sårbarheter etter oppgradering. `npm run build` (Next.js 16.3.0, Turbopack) og `npx tsc --noEmit` begge grønne, alle 27 ruter (inkl. Proxy/middleware) kompilerte uten advarsler. Se `sessions/IMPLEMENTATION-LEDGER.md` for full build-output og `sessions/DECISIONS.md` for beslutningsgrunnlaget.

Pushet, autodeployet og bekreftet i produksjon av produkteier 2026-08-05 via manuell OTP/bruksgodkjenning-smoke-test. Denne testen avdekket en separat, pre-eksisterende feil (feil klokkeslett i bekreftelsesepost pga. manglende `timeZone`-option, ikke forårsaket av denne oppgraderingen) — dokumentert og løst som CR-029/ISSUE-013.
