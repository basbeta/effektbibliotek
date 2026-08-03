# CR-017: Bruksgodkjenning-widget som trekkspill (collapsed by default)

**Status:** Done
**Created:** 2026-08-03

---

## Business Goal
`ApprovalSection` tok for mye plass i case-detaljbildet som default, spesielt etter at forhåndsvisning (CR-015) ble lagt til.

## Proposed Solution
Hele widgeten er nå et trekkspill: kun tittelen "Bruksgodkjenning" + statusmerket vises som default (kollapset), med en pil-indikator (▸/▾) som roterer ved åpning. Klikk på headeren åpner/lukker resten av innholdet (status-avhengig visning, skjema, forhåndsvisning, osv.).

## Impact Analysis

### Affected Components
- `components/cases/ApprovalSection.tsx`

### UX Impact
Mindre visuell støy på case-siden som default. Ingen funksjonalitet fjernet — alt tilgjengelig ved ett klikk.

### Risks
Ingen.

## Validation Notes
`npm run build` kjørt lokalt og bekreftet grønn. Ikke testet i faktisk produksjon i denne økten.
