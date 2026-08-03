# CR-021: Lås bruksrettigheter i redigeringsskjemaet etter kundegodkjenning

**Status:** Done
**Created:** 2026-08-03

---

## Business Goal
Bruksrettighetene som vises i redigeringsskjemaet (CR-020) reflekterer et faktisk juridisk samtykke fra kunden. De skal ikke kunne overstyres i en tilfeldig avkrysningsboks etter at kunden har godkjent — det ville undergrave hele poenget med bruksgodkjenningsflyten. Man skal også se hvem hos kunden som faktisk godkjente, og når.

## Problem Statement
Etter CR-020 var "Bruksrettigheter" i redigeringsskjemaet alltid redigerbare avkrysningsbokser, uavhengig av om casen allerede hadde en innsendt, låst kundegodkjenning. Ingen informasjon om hvem som godkjente eller når var synlig i redigeringsvisningen.

## Proposed Solution
`EditCaseForm` mottar nå `usageApprovalStatus` og siste `UsageApproval` (navn, e-post, tidspunkt) fra `/case/[id]/rediger`-siden. Når status er `submitted_locked`, vises Bruksrettigheter som ren, skrivebeskyttet tekst (✓/— per valg) i stedet for avkrysningsbokser, med en linje: "Godkjent hos kunde av {navn} ({e-post}) den {dato}". Når godkjenningen ikke er låst (aldri sendt, eller låst opp for ny innsending), vises de vanlige redigerbare boksene som før.

## Impact Analysis

### Affected Components
- `app/(app)/case/[id]/rediger/page.tsx` — henter nå siste `UsageApproval`, sender `usageApprovalStatus`/`lastApproval` til skjemaet
- `components/cases/EditCaseForm.tsx` — betinget skrivebeskyttet visning av Bruksrettigheter-seksjonen
- `app/api/cases/[id]/route.ts` — `PATCH` ignorerer nå stille endringer av bruksrettighetsfeltene når casen har status `submitted_locked`, uavhengig av hva klienten sender

### Database Impact
Ingen.

### UX Impact
Bruksrettigheter kan kun endres manuelt før første godkjenning, eller etter at godkjenningen er låst opp igjen (via case-siden) — ikke ved å redigere en allerede godkjent case.

### Security Impact
Låsingen håndheves nå både i UI-et (skrivebeskyttet visning) og server-side (`PATCH /api/cases/:id` dropper stille bruksrettighetsfelt når casen er `submitted_locked`) — en direkte API-kall kan ikke omgå låsen.

## Risks
Lav — additiv endring i eksisterende, fungerende endepunkt.

## Validation Notes
`npm run build` kjørt lokalt og bekreftet grønn. Ikke testet i faktisk produksjon i denne økten.
