# CR-012: Feilsporing med Bugsink (Sentry-kompatibel)

**Status:** Done
**Created:** 2026-08-03

---

## Business Goal
Fremtidige produksjonsfeil skal fanges opp automatisk med full stack trace, i stedet for å måtte diagnostiseres manuelt gjennom Coolify sine ofte flyktige/vanskelig tilgjengelige container-logger — slik CR-009 til CR-011 måtte gjøre i dag.

## Problem Statement
Under feilsøkingen av OTP-innlogging (CR-009–CR-011) var den eneste kilden til den faktiske feilen (`Prisma P2021 TableDoesNotExist`) Coolify sin container-runtime-log. Denne loggen:
- Krever manuelt å velge riktig, aktivt container-instans-ID under "Logs"-fanen
- Forsvinner helt når en container crash-looper til stopp (opplevd direkte under denne feilsøkingen — to mellomforsøk ga ingen tilgjengelig logg i det hele tatt)
- Har ingen historikk, søk, gruppering eller varsling

Produkteier har allerede satt opp Bugsink (selvhostet, Sentry-SDK-kompatibel feilsporing) på `errors.basbeta.no`, med et prosjekt for effektbibliotek og en DSN klar til bruk. Applikasjonen sender ikke feil dit ennå.

## Proposed Solution
1. Legg til `@sentry/nextjs` som avhengighet (Bugsink er protokoll-kompatibel med Sentry sine SDK-er — ingen Bugsink-spesifikk pakke nødvendig)
2. Sett opp Next.js sin standard instrumentering:
   - `instrumentation.ts` (server + edge init)
   - `instrumentation-client.ts` (klient init, App Router-konvensjon)
   - `next.config.ts` wrappet med `withSentryConfig` for automatisk error-boundary-integrasjon
3. `SENTRY_DSN` (og `NEXT_PUBLIC_SENTRY_DSN` for klientsiden) som ny(e) miljøvariabel(er) i Coolify, satt til `https://9ef8b9cd751a40d890431c13921e9468@errors.basbeta.no/1`
4. Fjern ad-hoc `console.error`-kallet i `app/api/auth/request-code/route.ts` (lagt til i CR-011) til fordel for at Sentry/Bugsink sin SDK fanger feilen automatisk — eller behold begge (logging koster ingenting, og er nyttig for rask `docker logs`-titting uavhengig av Bugsink)

## Impact Analysis

### Affected Components
- `package.json` / `package-lock.json` — ny avhengighet (`@sentry/nextjs`), installert med `npm install` (Node ble installert lokalt for denne økten spesifikt for å gjøre dette trygt, se Validation Notes)
- `next.config.ts` — wrappet med `withSentryConfig` (kildekart-opplasting eksplisitt deaktivert — Bugsink trenger ikke Sentry sin auth-token-baserte release-flyt)
- Nye filer: `instrumentation.ts` (server/edge init), `instrumentation-client.ts` (klient init)
- `.env.example` — dokumenterer `SENTRY_DSN` og `NEXT_PUBLIC_SENTRY_DSN`
- `docs/COOLIFY-DEPLOY.md` — de to nye env-variablene lagt til i oppsett-tabellen
- Coolify: `SENTRY_DSN` og `NEXT_PUBLIC_SENTRY_DSN` må settes på app-ressursen (ikke gjort ennå — se Next Recommended Actions i CURRENT-STATE.md)

### Database Impact
Ingen

### API Impact
Ingen endring i kontrakter. Uhåndterte feil i alle routes rapporteres nå automatisk til Bugsink, i tillegg til (ikke i stedet for) eksisterende JSON-feilrespons-mønster fra CR-011.

### UX Impact
Ingen synlig endring for sluttbruker.

### Security Impact
Stack traces og request-kontekst sendes til `errors.basbeta.no`. Vurder om noe av dette (f.eks. e-postadresser i feilkontekst) er personopplysninger som må håndteres i tråd med Bas sin GDPR-praksis — Bugsink er selvhostet på basbeta-infrastrukturen, så dataene forlater ikke Bas sin egen infrastruktur, men bør likevel vurderes kort.

### Performance Impact
Minimal — Sentry SDK-en er asynkron og batcher events.

## Acceptance Criteria
- [x] Lokal `npm run build` fullfører uten feil eller advarsler etter integrasjonen
- [x] `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN` satt i Coolify
- [x] En bevisst utløst feil i produksjon dukker opp i Bugsink sitt "Issues (effektbibliotek)"-prosjekt
- [x] Ingen regresjon i eksisterende feilhåndtering (CR-011 sitt JSON-feilrespons-mønster i request-code fortsatt intakt)

## Required Tests
- [x] Lokal build (`npm run build`) verifisert grønn
- [x] Manuell, etter Coolify-deploy: utløs en bevisst feil, verifiser at den dukker opp i Bugsink
- [x] Manuell: verifiser at appen fortsatt bygger og kjører normalt i Coolify med de nye filene

## Rollback Strategy
Fjern Sentry-avhengigheten, instrumenteringsfilene, og `withSentryConfig`-wrapperen i `next.config.ts`. Additiv endring — ingen eksisterende funksjonalitet avhenger av den.

## Migration Strategy
Ingen datamigrasjon.

## Risks
- Lav: SDK-en er godt utbredt og vedlikeholdt (offisiell Sentry Next.js-integrasjon).
- ~~`errors.basbeta.no` serveres over HTTP~~ **Avklart:** Traefik/Coolify redirecter faktisk HTTP→HTTPS for `errors.basbeta.no` (307-respons observert direkte i produksjonslogg). HTTPS er altså allerede tilgjengelig — DSN-en bruker nå `https://`, ikke `http://`. Nettleseren sitt tidligere "Ikke sikker"-varsel var ikke et reelt hinder for oss.

## Dependencies
- Bugsink allerede satt opp og kjørende på `errors.basbeta.no` (bekreftet av produkteier, prosjekt "effektbibliotek" opprettet)

## Åpne spørsmål
1. ~~DSN-host~~ **Avklart:** bruk `errors.basbeta.no` i stedet for `localhost`.
2. ~~Client-side DSN~~ **Avklart:** begge — `SENTRY_DSN` (server/edge) og `NEXT_PUBLIC_SENTRY_DSN` (klient) er begge lagt til i `instrumentation.ts`/`instrumentation-client.ts`, nettopp for å fange frontend-feil som `res.json()`-hengingen fra CR-011.

## Validation Notes
Node.js 22 (matcher `Dockerfile` sin `node:22-alpine`) ble installert lokalt via `winget install OpenJS.NodeJS.22` spesifikt for å kunne kjøre `npm install @sentry/nextjs` trygt og få en korrekt `package-lock.json` — løser miljøbegrensningen som gjaldt tidligere i denne økten (se historikk i sessions/DECISIONS.md).

`npm run build` kjørt lokalt og bekreftet grønn, inkludert `next.config.ts` sin `withSentryConfig`-wrapping og begge instrumenteringsfilene. `@sentry/nextjs` sin build-tid varslet først om manglende `onRouterTransitionStart`-hook i `instrumentation-client.ts` — lagt til, og påfølgende build var ren uten advarsler.

**Bekreftet løst:** Første forsøk med `http://`-DSN feilet stille — Sentry sin transport følger ikke redirects, og `errors.basbeta.no` redirecter (307) HTTP til HTTPS. Dette var kun synlig ved å slå på `debug: true` på server-SDK-en og lese produksjonsloggen direkte (samme lærdom som CR-011: gjett aldri, les faktiske logger). Byttet DSN-skjema til `https://`, redeployet, og en bevisst utløst testfeil dukket opp i Bugsink sitt "Issues (effektbibliotek)"-prosjekt. Midlertidig testrute (`app/api/sentry-test/route.ts`) og `debug: true` er fjernet igjen etter verifisering.
