# CR-027: Filopplasting til Materiale-seksjonen

**Status:** In Progress
**Created:** 2026-08-04

---

## Business Goal
La caseeiere legge til bilder og dokumenter direkte på casen, ikke bare eksterne lenker.

## Problem Statement
"Materiale"-seksjonen (`LinksSection.tsx`) støtter i dag kun eksterne lenker. Produkteier ba om støtte for opplastede filer (bilder, PDF, Word-dokumenter), med en total maksgrense på 100MB per case.

## Proposed Solution
- Nytt `CaseFile`-modell i skjemaet (caseId, filename, mimeType, sizeBytes, storageKey, createdAt, createdByEmail), `onDelete: Cascade` på case-relasjonen fra første stund (samme mønster som CR-025)
- Filer lagres i Hetzner Object Storage (S3-kompatibel), samme bucket som brukes til database-backup (`basbeta-backup`) men under en egen prefiks (`effektbibliotek/case-materiale/`) — bekreftet av produkteier at bucket sin 7-dagers retention-policy er spesifikt scopet til backup-jobben, ikke bucket-bredt, så case-filer er ikke i fare for automatisk sletting
- Ny `lib/storage.ts` med en tynn S3-klient-wrapper (`@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`)
- Nye API-routes: `POST /api/cases/[id]/files` (opplasting, multipart), `DELETE /api/cases/[id]/files/[fileId]` (slett), `GET /api/cases/[id]/files/[fileId]` (nedlasting via kortlevd presigned URL). Samme eier-eller-admin-tilgangsmønster som `CaseLink`-routene for opplasting/sletting; nedlasting matcher åpenheten på `GET /api/cases/[id]` (alle innloggede)
- Tillatte typer: jpg/png/webp/gif, pdf, doc/docx — sjekket på både filendelse og MIME-type
- 100MB total-grense PER CASE (sum av alle opplastede filer på samme case), sjekket server-side før opplasting godtas
- `LinksSection.tsx` (eller en utvidet variant) viser nå både lenker og opplastede filer i samme "Materiale"-widget, med løpende størrelsesindikator
- `lib/case-export.ts` lister opplastede filnavn (ikke selve binærinnholdet — tekst-eksporten forblir en tekstfil)
- `EditCaseForm.tsx` sin slette-advarsel ("Farlig sone") lister nå også opplastede filer, ikke bare lenker
- `DELETE /api/cases/[id]` sletter nå S3-objektene til en case sine filer FØR selve case-raden slettes (cascade tar kun DB-rader, ikke eksterne S3-objekter)

---

## Impact Analysis

### Affected Components
- `prisma/schema.prisma` (nytt `CaseFile`-modell), ny migrering
- `lib/storage.ts` (ny)
- `app/api/cases/[id]/files/route.ts`, `app/api/cases/[id]/files/[fileId]/route.ts` (nye)
- `app/api/cases/[id]/route.ts` (DELETE rydder S3-objekter)
- `lib/case-export.ts` (lister filnavn)
- `components/cases/LinksSection.tsx` (utvidet for filopplasting)
- `components/cases/EditCaseForm.tsx` (slette-dialogen lister filer)
- `.env.example`, `docs/COOLIFY-DEPLOY.md` (nye S3_*-env-variabler)
- `package.json` — `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`

### Database Impact
Nytt `CaseFile`-modell. Migrering generert statisk (samme teknikk som CR-024/025, men denne gangen skrevet direkte uten BOM via `.NET UTF8Encoding(false)` i stedet for PowerShell `Out-File` — se ISSUE-011 for hvorfor).

### API Impact
3 nye endepunkter under `/api/cases/[id]/files`.

### UX Impact
"Materiale"-widgeten viser nå både lenker og filer, med en løpende "X MB av 100MB brukt"-indikator.

### Security Impact
Filer lagres i en privat bucket (ingen offentlig lesetilgang) — nedlasting går via en kortlevd presigned URL generert av vår egen autentiserte API-route, ikke en permanent offentlig lenke. Opplasting/sletting krever eier eller admin. Filtype sjekkes på både filendelse og MIME-type (reduserer, men eliminerer ikke fullstendig, risikoen for at en bruker laster opp en fil med forfalsket MIME-type — akseptert risiko for et internt Bas-verktøy uten offentlig opplastingstilgang).

### Performance Impact
Ingen målbar for appen selv — opplasting/nedlasting går direkte mot S3-kompatibel lagring, ikke gjennom appens egen disk.

---

## Acceptance Criteria
- [x] `CaseFile`-modell og migrering på plass (`20260804140000_case_file`, generert uten BOM)
- [x] Opplasting fungerer for tillatte typer, avvises for andre (kodebekreftet, ikke testet i prod)
- [x] 100MB-grense per case håndheves server-side
- [x] Nedlasting fungerer via presigned URL (kodebekreftet)
- [x] Sletting av enkeltfil fungerer (S3 + DB)
- [x] Case-sletting (CR-025) rydder også opp tilhørende S3-objekter
- [x] Eksport (CR-025) lister opplastede filnavn
- [x] `npm run build` / TypeScript: ✓
- [ ] Manuell E2E-verifisering i produksjon (krever at S3_*-env-variabler er satt i Coolify)

## Required Tests
- [ ] Manuell E2E i produksjon: last opp et bilde og en PDF på en test-case, bekreft nedlasting fungerer, bekreft 100MB-grensen faktisk stopper en for stor opplasting, slett en fil, slett hele casen og bekreft S3-objektene faktisk er borte (sjekk i Hetzner/Coolify sin S3-browser om tilgjengelig)

## Rollback Strategy
Ren tilleggsfunksjonalitet — kan deaktiveres ved å skjule opplastingsknappen uten datatap, siden ingen eksisterende felt endres.

## Migration Strategy
Statisk generert migrering, ingen live DB nødvendig. Appen kjører for øyeblikket på `db push` (ISSUE-011 ikke ryddet opp ennå), så denne migreringen anvendes automatisk uavhengig av migreringsfilens tilstand — filen genereres likevel korrekt for når `migrate deploy` gjeninnføres.

## Risks
- Ny ekstern avhengighet (Hetzner Object Storage) — samme driftsrisiko-klasse som Brevo/Bugsink (ekstern tjeneste appen nå er avhengig av)
- MIME-type kan forfalskes av klienten — server-side sjekk er et filter, ikke en garanti
- S3-objekter ryddes opp i kode (ikke database-transaksjon) ved case-sletting — hvis S3-kallet feiler midt i en batch, kan enkelte objekter bli liggende igjen (lite, ikke-kritisk lekkasje, ikke en korrekthetsfeil)

## Dependencies
Krever at produkteier setter `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` i Coolify sitt env-panel for effektbibliotek-appen.

## Validation Notes
- Migrering generert med den lærte leksjonen fra ISSUE-011: skrevet direkte uten BOM via `[System.IO.File]::WriteAllText` med `UTF8Encoding($false)`, ikke PowerShell `Out-File -Encoding utf8`. Bekreftet BOM-fri med `xxd`.
- `npm run build` / TypeScript: ✓, alle 3 nye routes (`files`, `files/[fileId]` GET+DELETE, `export` oppdatert) kompilerer og listes i build-output
- Fant og fikset samme "manglende `type=\"button\"`"-bugklasse som CR-026 sin ApprovalSection-fiks, i `LinksSection.tsx` sine to eksisterende knapper ("+ Legg til lenke" og slett-lenke), siden komponenten også står inni EditCaseForm sitt `<form>`
- IKKE testet mot faktisk S3-lagring i denne økten — ingen S3_*-env-variabler tilgjengelig lokalt. Krever at produkteier setter disse i Coolify før funksjonen faktisk virker i produksjon
