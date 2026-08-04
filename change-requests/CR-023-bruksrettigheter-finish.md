# CR-023: Permanent åpen ved lås, muted uvalgte i redigeringsskjema, flat stil på låst visning

**Status:** Done
**Created:** 2026-08-04

---

## Business Goal
Tre gjenstående finpuss-punkter på bruksgodkjenning-UI-et (CR-020–022), presisert av produkteier etter å ha sett live skjermbilder.

## Proposed Solution
1. **`ApprovalSection.tsx` (case-detaljsiden):** Når status er `submitted_locked`, er widgeten nå permanent utvidet — ingen trekkspill-toggle. Headeren mister pilen og klikk-håndtereren i denne tilstanden. For `not_requested`/`open` beholdes trekkspill-oppførselen fra CR-017 uendret.
2. **`EditCaseForm.tsx`, redigerbar (ulåst) tilstand:** `CheckboxField` sin label er nå halvfet + full kontrast når avkrysset, dempet + 70% opasitet når ikke avkrysset — samme visuelle språk som den låste visningen, slik at en helt tom (ikke-utfylt) liste er umiddelbart gjenkjennelig som "ingenting valgt ennå".
3. **`EditCaseForm.tsx`, låst tilstand:** Glyfene ☑/☐ (checkbox-look) byttet til ✓/— (flat, informativ liste) — samme visuelle "sjanger" som resten av appens skrivebeskyttede lister (bekreftet med produkteier via spørsmål med mockup). Bold/dempet fargebehandling og plassering av godkjenningslinjen (over listen) er uendret fra CR-022.

## Impact Analysis

### Affected Components
- `components/cases/ApprovalSection.tsx`
- `components/cases/EditCaseForm.tsx`

### UX Impact
- Låst bruksgodkjenning på case-siden er nå alltid synlig, ikke skjult bak et klikk
- Ulåst redigeringsskjema viser tydelig om noe er valgt eller ikke
- Låst redigeringsskjema har samme visuelle "sjanger" som resten av appens informasjonslister

## Risks
Lav — rene visuelle justeringer, ingen endring i datamodell eller API.

## Dependencies
- CR-017 (Done) — trekkspill-mønsteret denne delvis overstyrer for låst tilstand
- CR-020, CR-021, CR-022 (Done) — bruksrettighets-UI-et denne finpusser

## Validation Notes
`npm run build` kjørt lokalt og bekreftet grønn. Ikke testet i faktisk produksjon i denne økten.
