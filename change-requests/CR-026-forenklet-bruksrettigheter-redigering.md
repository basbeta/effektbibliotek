# CR-026: Fjern manuell avkrysning av bruksrettigheter i redigeringsskjemaet, bruk Bruksgodkjenning-widgeten

**Status:** Done (bekreftet i produksjon av produkteier 2026-08-04)
**Created:** 2026-08-04

---

## Business Goal
Én kilde til sannhet for bruksrettigheter, uansett hvor man ser på casen.

## Problem Statement
Redigeringsskjemaet (`EditCaseForm.tsx`) hadde en egen "Bruksrettigheter"-seksjon med rå avkrysningsbokser (redigerbar før lås, flat ✓/— liste etter lås) — helt separat fra `ApprovalSection`-widgeten ("Bruksgodkjenning") som vises på selve case-siden. Dette var to ulike UI-er for samme underliggende data, med egen duplisert lås/opplås-logikk. Produkteier påpekte at når ingen godkjenning er sendt ennå, ser den tomme avkrysningslisten forvirrende/feil ut, og ba om at redigeringssiden i stedet skal bruke samme Bruksgodkjenning-widget som case-siden.

## Proposed Solution
- Fjernet hele avkrysningsboks-UI-en (redigerbar og låst variant) fra `EditCaseForm.tsx`, inkludert den dupliserte "Lås opp godkjenning"-logikken (CR-022) og `ndaRestricted`...`competitionUseAllowed` fra skjemaets lokale state
- `EditCaseForm.tsx` importerer og rendrer nå `ApprovalSection` direkte — samme komponent som på case-siden — med `canManage={isAdmin || isOwner}`
- `app/(app)/case/[id]/rediger/page.tsx` henter nå `owner.name` og sender `approverName`, `approverEmail`, `ownerName`, `token`, `appUrl` videre til `EditCaseForm`, i tillegg til full `usageApprovals`-historikk (allerede hentet i CR-025)
- Bruksrettigheter kan ikke lenger settes manuelt av eier før noe er sendt — alt går nå via send-godkjenning-flyten i `ApprovalSection` (bekreftet ønsket av produkteier)

---

## Impact Analysis

### Affected Components
- `components/cases/EditCaseForm.tsx` — Bruksrettigheter-seksjon erstattet, `CheckboxField`-hjelpefunksjon fjernet (ubrukt)
- `app/(app)/case/[id]/rediger/page.tsx` — henter `owner.name`, sender nye props

### Database Impact
Ingen.

### API Impact
Ingen nye endepunkter — gjenbruker eksisterende `/api/cases/[id]/send-approval-request` og `/api/cases/[id]/unlock-approval` via `ApprovalSection`.

### UX Impact
Redigeringssiden viser nå samme Bruksgodkjenning-widget (kollapset/utvidet trekkspill, statusmerke, send-skjema, lås opp) som case-siden, i stedet for en egen avkrysningsliste. Eier kan ikke lenger forhåndsutfylle bruksrettigheter uten å sende en formell godkjenningsforespørsel.

### Security Impact
Ingen.

---

## Acceptance Criteria
- [x] `EditCaseForm.tsx` bruker `ApprovalSection` i stedet for egne avkrysningsbokser
- [x] `npm run build` / TypeScript: ✓
- [ ] Manuell verifisering i produksjon: rediger en case uten godkjenning, bekreft Bruksgodkjenning-widgeten vises og fungerer identisk til case-siden

## Rollback Strategy
Ren kodeendring, ingen skjema/migrering involvert — kan reverteres uavhengig av CR-025.

## Risks
Ingen vei til å sette bruksrettigheter uten å gå via e-post-forespørsel-flyten lenger — vurdert som ønsket forenkling av produkteier, ikke en regresjon.

## Validation Notes
`npm run build` ✓ (inkl. TypeScript-sjekk). Ingen skjemaendring, ikke avhengig av migreringstilstand.
