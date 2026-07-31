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
Status: Open
Priority: High
Area: Coolify / Hetzner
Description: CR-008 (port til Hetzner/Coolify/PostgreSQL 18) er ferdig på repo-siden, men det faktiske Coolify-oppsettet (database-ressurs, app-ressurs, domene, env-vars, backup, Uptime Kuma) må utføres manuelt av produkteier — kan ikke gjøres fra en Claude Code-økt uten tilgang til Coolify-instansen. Se docs/COOLIFY-DEPLOY.md.
Blocker for: Faktisk publisering på effektbibliotek.basbeta.no
Opened: 2026-07-31
