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
Status: Open
Priority: Low
Area: git / repo
Description: `docs_extracted.txt` er committed og inneholder råtekst fra produktdokumentasjonen. Kan inneholde intern forretningsinformasjon. Bør vurderes gitignored og slettet fra historikk.
Blocker for: Ingenting
Opened: 2026-05-22

ISSUE-006
Status: Open
Priority: Low
Area: Vercel / admin
Description: Ingen admin-bruker er satt opp i produksjonsdatabasen ennå. Første bruker som logger inn via /login på prod får ikke isAdmin=true automatisk. Må settes manuelt i Neon.
Blocker for: Admin-funksjonalitet i prod
Opened: 2026-05-22

ISSUE-007
Status: Partially Resolved
Priority: High
Area: Coolify / Hetzner
Description: CR-008 (port til Hetzner/Coolify/PostgreSQL 18) er ferdig på repo-siden, men det faktiske Coolify-oppsettet (database-ressurs, app-ressurs, domene, env-vars, backup, Uptime Kuma) må utføres manuelt av produkteier — kan ikke gjøres fra en Claude Code-økt uten tilgang til Coolify-instansen. Se docs/COOLIFY-DEPLOY.md.
Blocker for: Faktisk publisering på effektbibliotek.basbeta.no
Opened: 2026-07-31
Update: 2026-08-03 — effektbibliotek.basbeta.no er live, men OTP-innlogging hang uten å sende e-post. Se ISSUE-008.

ISSUE-008
Status: Open
Priority: High
Area: Dockerfile / app/api/auth/request-code
Description: OTP-innlogging på effektbibliotek.basbeta.no hang. CR-009 (SMTP-timeout) og CR-010 (DB connection-timeout) var begge reelle forbedringer, men ingen av dem var rotårsaken — bekreftet ved at hengingen fortsatte etter begge var deployet. Coolify sine runtime-logger avslørte faktisk årsak: databasen hadde ingen tabeller (prisma migrate deploy fant ingen migreringsfiler, siden prisma/migrations aldri har eksistert i repoet), og request-code-routen hadde ingen try/catch, så feilen ga et 500-svar som fikk frontend sin `res.json()` til å henge i stedet for å vise en feilmelding. Fikset i CR-011: Dockerfile bruker nå `prisma db push` i stedet for `migrate deploy`, og routen returnerer alltid gyldig JSON ved feil. IKKE bekreftet løst i faktisk prod ennå — krever redeploy og ny test.
Blocker for: Fungerende innlogging i produksjon
Opened: 2026-08-03

ISSUE-009
Status: Open
Priority: Medium
Area: prisma/ (skjemastyring)
Description: Prosjektet har aldri hatt en `prisma/migrations`-mappe — skjema er alltid provisjonert med `prisma db push` (deklarativt, ingen reviewbar migreringshistorikk). CR-011 gjorde dette eksplisitt i Dockerfile i stedet for å late som `migrate deploy` fungerer. Fint for et beta-prosjekt uten verdifull produksjonsdata, men bør erstattes med formelle `prisma migrate`-migreringer før effektbiblioteket har ekte data som må bevares trygt gjennom skjemaendringer.
Blocker for: Ingenting akkurat nå — bør løses før prosjektet forlater beta
Opened: 2026-08-03
