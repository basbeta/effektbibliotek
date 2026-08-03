# CR-022: Tydeligere låst visning + lås opp fra redigeringssiden

**Status:** Done
**Created:** 2026-08-04

---

## Business Goal
Den låste Bruksrettigheter-visningen (CR-021) var ikke tydelig nok — tankestrek for ikke-valgte alternativer var lite lesbart, og godkjenningsinfoen sto under listen i stedet for over. I tillegg var "lås opp"-funksjonen kun tilgjengelig på case-siden, ikke der man faktisk redigerer casen.

## Proposed Solution
1. Erstattet "—" (tankestrek) for ikke-valgte alternativer med tomme avkrysningsbokser (☐); valgte vises som ☑
2. Valgte linjer er nå halvfet og full kontrastfarge; ikke-valgte er dempet (svakere farge + redusert opasitet)
3. "Godkjent hos kunde av..."-linjen flyttet til over listen i stedet for under
4. Lagt til samme "Lås opp godkjenning"-widget (med bekreftelsessteg) som allerede fantes i `ApprovalSection` på case-siden — nå tilgjengelig direkte fra redigeringsskjemaet også

## Impact Analysis

### Affected Components
- `components/cases/EditCaseForm.tsx` — visuell omskriving av låst visning, ny lokal state for godkjenningsstatus, `handleUnlock()`

### UX Impact
Tydeligere visuell forskjell mellom valgte/ikke-valgte bruksrettigheter. Kan låse opp godkjenningen uten å navigere til case-siden først.

### Security Impact
Ingen ny logikk — gjenbruker eksisterende `POST /api/cases/:id/unlock-approval`, som allerede har eier/admin-sjekk.

## Risks
Lav — kun UI-endringer og gjenbruk av et eksisterende, testet endepunkt.

## Dependencies
- CR-021 (Done) — den låste visningen denne bygger videre på
- CR-004 (Done) — `unlock-approval`-endepunktet denne gjenbruker

## Validation Notes
`npm run build` kjørt lokalt og bekreftet grønn. Ikke testet i faktisk produksjon i denne økten.
