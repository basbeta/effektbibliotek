# OPEN-ISSUES.md

> Updated at the end of every session.

## Format
```
ISSUE-XXX
Status: Open | In Progress | Resolved
Priority: High | Medium | Low
Area: [module or system]
Description: [what is the problem]
Blocker for: [what cannot proceed until resolved]
Opened: YYYY-MM-DD
```

## Open Issues

ISSUE-001
Status: Resolved
Priority: High
Area: specs/
Description: Product vision and requirements not yet defined.
Blocker for: All feature work
Opened: 2026-05-21
Resolved: 2026-05-21 — specs/vision.md and specs/requirements.md populated from 8 product documents.

ISSUE-002
Status: Resolved
Priority: High
Area: app/api/cases/[id]/copy-approval-text
Description: Godkjenningslenken i e-postteksten pekte på localhost:3000 selv om dev-serveren kjørte på port 3001. NEXT_PUBLIC_APP_URL overstyrte riktig origin.
Blocker for: CR-004 fungerer ikke end-to-end lokalt
Opened: 2026-05-21
Resolved: 2026-05-22 — Bruker nå alltid `new URL(request.url).origin` i stedet for env-variabelen.

ISSUE-003
Status: Resolved
Priority: Medium
Area: Vercel / e-post
Description: Gmail App Password er brukt som e-posttransport. Gmail har begrensninger på sending (daglig grense ~500 e-post). For produksjon bør dette vurderes opp mot et dedikert e-posttjeneste (Resend, Mailgun e.l.).
Blocker for: Skalering
Opened: 2026-05-22
Resolved: 2026-07-31 — CR-008: byttet til Brevo SMTP med per-prosjekt-avsender.

ISSUE-004
Status: Resolved
Priority: Medium
Area: Neon / database
Description: Neon free tier har cold start-latens på 1-2 sekunder etter idle. Første DB-kall etter inaktivitet oppleves tregt.
Blocker for: Brukeropplevelse på første request
Opened: 2026-05-22
Resolved: 2026-07-31 — CR-008: porter til selvhostet PostgreSQL 18 på Hetzner/Coolify, ingen serverless cold start.

ISSUE-005
Status: Resolved
Priority: Low
Area: git / repo
Description: `docs/extracted.txt` (feilaktig referert som `docs_extracted.txt` i tidligere versjoner av denne filen) var committed og inneholder råtekst fra de 8 interne produktdokumentasjons-.docx-filene. Kan inneholde intern forretningsinformasjon. Vurdert gitignored og fjernet fra fremtidig tracking.
Blocker for: Ingenting
Opened: 2026-05-22
Resolved: 2026-08-05 — Lagt til `/docs/extracted.txt` i `.gitignore`, fjernet fra tracking med `git rm --cached` (lokal kopi beholdt). Selve historikken (tidligere commits som inneholder filen) er IKKE renskjøvet — det ville krevd en history-rewrite (git filter-repo + force-push), en betydelig mer risikabel operasjon enn det som ble bedt om her. De 8 originale .docx-filene i `docs/` er fortsatt trackede og urørt — kun den utpakkede råteksten ble adressert.

ISSUE-006
Status: Open
Priority: Low
Area: Vercel / admin
Description: Ingen admin-bruker er satt opp i produksjonsdatabasen ennå. Første bruker som logger inn via /login på prod får ikke isAdmin=true automatisk. Må settes manuelt i Neon.
Blocker for: Admin-funksjonalitet i prod
Opened: 2026-05-22

ISSUE-007
Status: Resolved
Priority: High
Area: Coolify / Hetzner
Description: CR-008 (port til Hetzner/Coolify/PostgreSQL 18) er ferdig på repo-siden, men det faktiske Coolify-oppsettet (database-ressurs, app-ressurs, domene, env-vars, backup, Uptime Kuma) må utføres manuelt av produkteier — kan ikke gjøres fra en Claude Code-økt uten tilgang til Coolify-instansen. Se docs/COOLIFY-DEPLOY.md.
Blocker for: Faktisk publisering på effektbibliotek.basbeta.no
Opened: 2026-07-31
Update: 2026-08-03 — effektbibliotek.basbeta.no er live, men OTP-innlogging hang uten å sende e-post. Se ISSUE-008.
Resolved: 2026-08-05 — Produkteier bekreftet at daglig backup og Uptime Kuma-overvåking begge er satt opp. Alle CR-008 acceptance criteria oppfylt, CR-008 markert Done.

ISSUE-008
Status: Resolved
Priority: High
Area: Dockerfile / app/api/auth/request-code
Description: OTP-innlogging på effektbibliotek.basbeta.no hang. CR-009 (SMTP-timeout) og CR-010 (DB connection-timeout) var begge reelle forbedringer, men ingen av dem var rotårsaken. Coolify sine runtime-logger avslørte faktisk årsak: databasen hadde ingen tabeller (prisma migrate deploy fant ingen migreringsfiler, siden prisma/migrations aldri har eksistert i repoet), og request-code-routen hadde ingen try/catch, så feilen ga et 500-svar som fikk frontend sin `res.json()` til å henge i stedet for å vise en feilmelding. Fikset i CR-011: Dockerfile bruker nå `prisma db push --accept-data-loss` i stedet for `migrate deploy`, og routen returnerer alltid gyldig JSON ved feil.
Blocker for: Fungerende innlogging i produksjon
Opened: 2026-08-03
Resolved: 2026-08-03 — Bekreftet av produkteier: engangskode mottatt og innlogging fullført på effektbibliotek.basbeta.no.

ISSUE-009
Status: Resolved
Priority: Medium
Area: prisma/ (skjemastyring)
Description: Prosjektet har aldri hatt en `prisma/migrations`-mappe — skjema er alltid provisjonert med `prisma db push` (deklarativt, ingen reviewbar migreringshistorikk). CR-011 gjorde dette eksplisitt i Dockerfile i stedet for å late som `migrate deploy` fungerer. Fint for et beta-prosjekt uten verdifull produksjonsdata, men bør erstattes med formelle `prisma migrate`-migreringer før effektbiblioteket har ekte data som må bevares trygt gjennom skjemaendringer.
Blocker for: Ingenting akkurat nå — bør løses før prosjektet forlater beta
Opened: 2026-08-03
Update: 2026-08-04 — CR-020 droppet ytterligere to kolonner (Case.usageLevel, UsageApproval.internalUseAllowed) via samme db push-mekanisme, uten problemer. Andre gang dette mønsteret har medført reelt (akseptert) datatap ved deploy — styrker argumentet for formelle migreringer før prosjektet har ekte produksjonsdata.
Resolved: 2026-08-04 — CR-024: baseline-migrering (`20260804120000_init`) generert og rullet ut i to atskilte deploys pga. autodeploy på master (Deploy A: la til migreringsfiler, uendret CMD; manuelt `migrate resolve --applied` mot prod via Coolify Terminal; Deploy B: CMD byttet til `prisma migrate deploy`). Begge deploys bekreftet vellykket av produkteier, appen kjører normalt. Fremtidige skjemaendringer skal gjøres med `prisma migrate dev` lokalt, ikke `db push`.

ISSUE-010
Status: Open
Priority: Low
Area: components/cases/ApprovalSection.tsx, app/godkjenning/[caseId]/[token]/*
Description: CR-015 (e-postforhåndsvisning), CR-016 (kvitteringstekst/footer), CR-018 (reply-to), CR-019 (personvernteksten på selve godkjenningssiden, ikke bare i e-post) er alle deployet og ble funksjonelt utøvd gjennom senere testing (ekte godkjenningsdata synlig i skjermbilder), men er ikke bekreftet feature-for-feature enkeltvis. Spesielt reply-to-headeren (CR-018) er umulig å verifisere uten faktisk å sende et svar på en godkjenningsforespørsel-e-post.
Blocker for: Ingenting — lav risiko, kun ønskelig for full sikkerhet
Opened: 2026-08-04

ISSUE-011
Status: Resolved
Priority: Medium
Area: prisma/ (skjemastyring), Dockerfile
Description: CR-025 sin migrering (`20260804130000_case_cascade_delete`) hadde en UTF-8 BOM (byte-order-mark) i migration.sql, skrevet inn av PowerShell sin `Out-File -Encoding utf8`. Da `prisma migrate deploy` faktisk kjørte filen i produksjon (autodeploy), avviste Postgres hele scriptet med en syntax-feil ved posisjon 0 — containeren crash-loopet til Coolify nådde restart-grensen (10/10) og stoppet helt, som var en reell nedetid. Nødløsning: Dockerfile CMD revertert til `prisma db push --accept-data-loss` (commit 197ab57), som ikke leser `_prisma_migrations` og derfor omgikk problemet — bekreftet stabilt av produkteier. Samme BOM ble funnet og fjernet fra BEGGE migreringsfilene (også CR-024 sin baseline, som aldri hadde blitt oppdaget siden `migrate resolve --applied` aldri kjører filens SQL).
Blocker for: Å gå tilbake til `prisma migrate deploy` (appen kjører nå permanent på `db push` igjen inntil dette er ryddet opp)
Opened: 2026-08-04
Update: 2026-08-04 — For å faktisk gå tilbake til `migrate deploy`: (1) kjør `npx prisma migrate resolve --rolled-back 20260804130000_case_cascade_delete` mot produksjonsdatabasen via Coolify Terminal (trygt — migreringen ble aldri faktisk anvendt, kun avvist ved parse-tidspunktet), (2) bytt Dockerfile CMD tilbake til `prisma migrate deploy` i en egen commit, (3) deploy og bekreft ren logg. Ikke gjort ennå.
Update: 2026-08-04 — CR-027 la til enda en migrering (`20260804140000_case_file`, for `CaseFile`-modellen) som heller ikke er anvendt av `migrate deploy` ennå — den ble generert BOM-fritt fra start (lærdommen fra dette issuet ble anvendt umiddelbart), men er i samme "ikke ennå kjørt via migrate deploy"-tilstand som `20260804130000_case_cascade_delete`. Når opprydding skjer, vil `migrate deploy` trenge å anvende BÅDE denne og cascade-delete-migreringen (etter at cascade-delete er markert `--rolled-back` og deretter faktisk kjørt på nytt) — ingen grunn til å tro dette introduserer nye problemer siden begge filene nå er bekreftet BOM-frie, men verdt å sjekke deploy-loggen nøye ved neste `migrate deploy`-forsøk.
Update: 2026-08-04 — Første oppryddingsforsøk delvis lyktes, delvis forårsaket en NY nedetid. Produkteier kjørte `migrate resolve --rolled-back 20260804130000_case_cascade_delete` via Coolify Terminal (vellykket), Dockerfile CMD ble byttet til `migrate deploy` og pushet (commit 78c8dfc). Deploy-loggen viste at `20260804130000_case_cascade_delete` denne gangen ble anvendt korrekt, MEN `20260804140000_case_file` (CR-027) feilet med `Error: P3009` — fordi `CaseFile`-tabellen allerede fantes i produksjonsdatabasen (opprettet av `db push` under de tidligere CR-027-deployene, siden Dockerfile fortsatt kjørte `db push` helt til denne oppryddingen). Containeren crash-loopet til restart-grensen (10/10) igjen, samme mønster som det opprinnelige ISSUE-011-hendelsen. Emergency-fix (commit a4490c7): Dockerfile CMD revertert tilbake til `db push --accept-data-loss`, manuell "Redeploy" i Coolify (autodeploy alene gjenopprettet ikke en fullstendig exited container), bekreftet stabil av produkteier. Lærdom: enhver migrering generert etter at `db push` allerede har anvendt den samme skjemaendringen (som var tilfellet for HVER migrering i denne økten, siden `db push` kjørte kontinuerlig i bakgrunnen mens migreringsfiler ble generert statisk) må resolves `--applied`, ikke bare `--rolled-back`/la stå uanvendt — `--rolled-back` er kun korrekt for en migrering som aldri faktisk endret databasen.
Resolved: 2026-08-04 — Produkteier kjørte `npx prisma migrate resolve --applied 20260804140000_case_file` via Coolify Terminal (vellykket). Dockerfile CMD byttet til `migrate deploy` på nytt (commit a25de77), pushet, autodeployet, bekreftet av produkteier å kjøre normalt — ingen crash-loop denne gangen. Alle tre migreringer (`20260804120000_init`, `20260804130000_case_cascade_delete`, `20260804140000_case_file`) er nå korrekt bokført som `applied` i `_prisma_migrations`, og appen kjører permanent på `prisma migrate deploy` fra og med denne deployen.

ISSUE-012
Status: Resolved
Priority: Low
Area: package.json / package-lock.json (avhengigheter)
Description: `npm audit` viste 13 sårbarheter (8 high, 4 moderate, 1 low). `npm audit fix` (uten `--force`) løste 9 av disse, inkl. nodemailer sin CRLF header-injection og en OAuth2 TLS-cert-valideringsbypass (produksjonsrelevant — lib/email.ts sender all OTP/godkjenning-e-post via nodemailer), samt flere dev-tooling-transitiver (@babel/core, brace-expansion, js-yaml, fast-uri, hono/@hono/node-server/valibot-kjeden fra @prisma/dev). De resterende 4 (høy alvorlighetsgrad) krever `npm audit fix --force`, som ville byttet `next` til 16.3.0 — utenfor den versjonen som er stated/pinnet i package.json (16.2.6) — og dratt med seg `postcss`/`sharp`-fiksene. Next.js sine CVE-er inkluderer SSRF i Server Actions/rewrites, cache-forvirring og en Image Optimization DoS via SVG; det gjenstår også én nodemailer-CVE (raw-option kan omgå disableFileAccess/disableUrlAccess).
Blocker for: Ingenting akkurat nå — bevisst utsatt fordi en Next.js major-oppgradering er en større endring som bør testes/verifiseres separat, ikke gjøres som en bivirkning av en rutinemessig audit-fiks
Opened: 2026-08-05
Resolved: 2026-08-05 — CR-028: research bekreftet at Next.js 16.3 og nodemailer 9 sine offisielle breaking changes ikke berører denne kodebasen (se DECISIONS.md). `npm audit fix --force` kjørt, `next`/`eslint-config-next` re-pinnet eksakt til 16.3.0, `nodemailer` til ^9.0.4, `@types/nodemailer` til ^8.0.1. `npm audit` viser 0 sårbarheter, `npm run build`/`npx tsc --noEmit` grønne. Pushet, autodeployet, og bekreftet i produksjon av produkteier via en manuell OTP/bruksgodkjenning-smoke-test (avdekket samtidig ISSUE-013/CR-029, se under).

ISSUE-013
Status: Resolved
Priority: Low
Area: lib/email.ts, lib/format.ts
Description: Under produksjonssmoke-testen av CR-028 rapporterte produkteier at klokkeslettet i bruksgodkjenning-bekreftelsesposten var feil (viste UTC-tid, ikke norsk lokaltid). Rotårsak: Dockerfile setter ingen `TZ`, containeren kjører i UTC, og tre `toLocale*`-kall manglet en eksplisitt `timeZone`-option.
Blocker for: Ingenting — display-only bug, lagrede tidsstempler var alltid korrekte
Opened: 2026-08-05
Resolved: 2026-08-05 — CR-029: lagt til `timeZone: "Europe/Oslo"` i alle tre stedene (`lib/email.ts` x2, `lib/format.ts` sin `formatDate()`). Pushet og bekreftet av produkteier med en ny test-e-post — korrekt klokkeslett.
