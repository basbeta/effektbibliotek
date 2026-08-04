# CURRENT-STATE.md

> Updated at the end of every session. Read by Claude at startup.

## Current Phase
MIGRERING NESTEN FERDIG — CR-008: porting fra Vercel/Neon til Hetzner/Coolify/PostgreSQL 18. Appen kjører stabilt på `effektbibliotek.basbeta.no`. Innlogging (CR-009–011), feilsporing (CR-012), direkte utsending av bruksgodkjenning (CR-013), rediger eget navn (CR-014), det forenklede bruksrettighets-systemet (CR-020–023), CR-025 (case-sletting/eksport/eierbytte) og CR-026 (Bruksgodkjenning-widget i redigeringsskjemaet) er alle bekreftet fungerende i produksjon av produkteier per 2026-08-04. CR-015–019 er deployet og ble funksjonelt utøvd gjennom den samme produksjonstestingen, men er ikke bekreftet feature-for-feature enkeltvis — se Next Recommended Actions punkt 1. Appen kjører fortsatt på `prisma db push` (ikke `migrate deploy`) etter CR-025-nedetiden — se ISSUE-011, åpen opprydding. **CR-027 (filopplasting til Materiale-seksjonen — bilder/PDF/Word, 100MB per case, lagret i Hetzner Object Storage) er fullt implementert, pushet og bekreftet fungerende i produksjon av produkteier 2026-08-04** (opplasting/nedlasting/last-ned-alle/sletting, synlig på selve case-siden i tillegg til redigeringssiden, Eksporter-knappen bundler faktiske filer i et zip-arkiv). S3-env-variabler er satt i Coolify av produkteier.

## Current Objectives
1. Rydd opp ISSUE-011: kjør `migrate resolve --rolled-back 20260804130000_case_cascade_delete` via Coolify Terminal, deretter egen commit som bytter Dockerfile CMD tilbake til `migrate deploy` (vil da også plukke opp CR-027 sin `CaseFile`-migrering)
2. Manuell E2E-verifisering av CR-025 sine egne flyter (uavhengig av CR-027): opprett en test-case med lenker og godkjenningshistorikk, bekreft eierbytte fungerer for en ikke-admin eier
3. (Valgfritt, lav prioritet) Bekreft CR-015–019 individuelt hvis det er ønskelig med fullstendig sikkerhet — se Next Recommended Actions
4. Ende-til-ende-test av gjenstående flyter: case-opprettelse, redigering av felt utenom bruksrettigheter
5. Fullføre resten av `docs/COOLIFY-DEPLOY.md` (backup, Uptime Kuma)
6. Deretter fjerne Vercel/Neon, marker CR-008 som Done

## Current Branch
master (alle endringer CR-009–027 + emergency-fix er pushet direkte til master, ingen feature-branch brukt, arbeidskatalogen er clean ved sesjonsslutt)

## Blockers
Manuelt Coolify/Hetzner-oppsett kan ikke utføres fra Claude Code-økten (ingen tilgang til Coolify-instansen). Krever produkteier/admin på `coolify.basbeta.no`.
**Appen kjører midlertidig på `prisma db push` igjen** (ikke `migrate deploy`) etter CR-025-nedetiden — se ISSUE-011 for hva som gjenstår for å trygt gå tilbake.

## Risks / Tech Debt (per 2026-08-04)
- **Ingen automatiserte tester i prosjektet.** All verifisering denne økten var `npm run build`/TypeScript-sjekk + manuell produksjonstesting av produkteier. Fungerer for nå, men skalerer dårlig etter hvert som appen vokser — regressonsrisiko ved fremtidige endringer er reelt.
- **`prisma migrate deploy` midlertidig avslått igjen** (ISSUE-011, ny 2026-08-04) — en BOM i en migreringsfil (skrevet av PowerShell) crash-loopet produksjon til Coolify sin restart-grense. Appen kjører nå på `db push` inntil den stuck migration-tilstanden er ryddet opp og CMD byttes tilbake.
- **CR-015, 016, 018, 019 ikke enkeltvis bekreftet** (ISSUE-010) — lav risiko, men reply-to-headeren (CR-018) spesielt er kun kodebekreftet, ikke funksjonelt testet med et faktisk svar.
- **Ingen tilgang til Coolify-instansen fra Claude Code-økter** — enhver fremtidig feilsøking som krever env-var-endringer, redeploy-trigger, eller database-terminal må gjøres av produkteier manuelt, med skjermbilder/copy-paste av logger tilbake til denne økten. Dette var flaskehalsen i mesteparten av CR-009–011-feilsøkingen.
- **Vercel/Neon (gammel produksjon) står fortsatt aktiv** som fallback — ingen data av verdi der, men bør ryddes opp når Coolify er verifisert stabilt over noen dager (se Next Actions).
- **`docs_extracted.txt`** (ISSUE-005) er fortsatt committed med potensielt sensitiv rå-tekst fra produktdokumentasjon — lav prioritet, men uadressert.

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
- CR-008 (In Progress) — Port til Hetzner/Coolify/PostgreSQL 18
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
- CR-027 (Done, bekreftet i produksjon 2026-08-04) — Filopplasting til "Materiale"-seksjonen (bilder jpg/png/webp/gif, PDF, doc/docx), 100MB total-grense per case, lagret i Hetzner Object Storage (S3-kompatibel, delt bucket med backup, egen prefiks `effektbibliotek/case-materiale/`). Nytt `CaseFile`-modell, nye API-routes for opplasting/nedlasting/last-ned-alle/sletting. `Materiale`-widgeten (utvidet `LinksSection.tsx`) viser nå lenker og filer på BÅDE case-siden (kun vis/last ned) og redigeringssiden (full administrasjon). Eksporter-knappen (CR-025) gir nå et zip med tekstsammendrag + alle faktiske filer, ikke bare filnavn. To bugfixer underveis: (1) manglende `type="button"` i `LinksSection.tsx` sine egne knapper (samme klasse som CR-026-fiksen), (2) `LinksSection` sin "legg til lenke"-widget var et nestet `<form>` inni EditCaseForm sitt eget `<form>` (ugyldig HTML), konvertert til en vanlig `<div>` med knapp-triggered handler. S3_*-env-variabler er satt i Coolify av produkteier

## Production URL
https://effektbibliotek.basbeta.no — live, innlogging bekreftet fungerende
https://effektbibliotek.vercel.app (gammel, beholdes urørt inntil Coolify er fullt verifisert)

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
- Dockerfile — `prisma migrate deploy` (CR-024), deretter revertert tilbake til `db push --accept-data-loss` (emergency-fix etter CR-025-nedetiden, se ISSUE-011) — dette er GJELDENDE tilstand akkurat nå
- prisma/schema.prisma — `onDelete: Cascade` på UsageApproval/CaseLink (CR-025), nytt `CaseFile`-modell med `onDelete: Cascade` fra start (CR-027)
- prisma/migrations/20260804120000_init — baseline-migrering (CR-024), BOM fjernet i emergency-fix
- prisma/migrations/20260804130000_case_cascade_delete — cascade-migrering (CR-025), BOM fjernet i emergency-fix, ikke ennå faktisk anvendt av `migrate deploy` (se ISSUE-011)
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
- `prisma migrate deploy` kjøres i container-`CMD` ved hver oppstart (idempotent) i stedet for som eget Coolify-hook — dette var faktisk sant en kort periode etter CR-024 (2026-08-04), men appen kjører **midlertidig tilbake på `db push`** etter CR-025-nedetiden (ISSUE-011), se linjen under om historikken
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
- Formelle Prisma-migreringer (CR-024): delvis — baseline-migreringen ble bekreftet vellykket 2026-08-04, men appen kjører nå midlertidig tilbake på `db push` igjen etter CR-025-nedetiden (se ISSUE-011)
- Slett case / eksport / eierbytte for eier (CR-025): ✓ live i produksjon 2026-08-04. `onDelete: Cascade` bekreftet anvendt ("database er nå i sync med Prisma-skjema"). Manuell E2E-test av selve slette/eksport/eierbytte-flytene i UI-et gjenstår
- Bruksrettigheter via ApprovalSection i redigeringsskjemaet (CR-026): ✓ bekreftet i produksjon av produkteier 2026-08-04, inkl. bugfix (manglende `type="button"`)
- Filopplasting til Materiale-seksjonen (CR-027): `npm run build` ✓ (inkl. TypeScript-sjekk) på alle seks commits. Pushet, autodeployet og bekreftet fungerende i produksjon av produkteier 2026-08-04

## Next Actions (prioritert)
1. Rydd opp ISSUE-011: kjør `migrate resolve --rolled-back 20260804130000_case_cascade_delete` via Coolify Terminal, deretter egen commit som bytter Dockerfile CMD tilbake til `migrate deploy`
2. Manuell E2E-verifisering av CR-025 sine egne flyter: opprett en test-case med lenker og godkjenningshistorikk, bekreft eierbytte fungerer for en ikke-admin eier
3. **(Anbefalt, lav innsats)** Bekreft CR-015, CR-016, CR-018, CR-019 hver for seg hvis full sikkerhet ønskes: (a) sammenlign e-postforhåndsvisning mot faktisk mottatt e-post ord for ord, (b) svar på en godkjenningsforespørsel-e-post og verifiser at svaret går til caseeieren (reply-to), (c) les gjennom kvitteringssiden og personvernteksten på selve godkjenningssiden (ikke bare i e-post)
4. Opprett admin-bruker i produksjonsdatabasen (første login + manuell `isAdmin`-sett i Coolify sin database-ressurs) — ISSUE-006, fortsatt åpen
5. Ende-til-ende-test av gjenstående flyter: case-opprettelse, redigering av felt utenom bruksrettigheter (de er nå grundig testet)
6. Utføre resterende `docs/COOLIFY-DEPLOY.md`-steg (backup, Uptime Kuma) — ISSUE-007, delvis løst
7. Når Coolify-oppsettet er verifisert stabilt over noen dager: fjern Vercel-prosjektet og slett Neon-databasen (ingen data å ta vare på), marker CR-008 som Done
8. Vurder om `docs_extracted.txt` skal gitignores (sensitiv prod-dokumentasjon) — ISSUE-005, fortsatt åpen
9. Vurder om det skal legges til en enkel automatisert test/smoke-test-suite — hele denne økten er verifisert med `npm run build` + manuell produksjonstesting, ingen automatiserte tester finnes ennå i prosjektet
