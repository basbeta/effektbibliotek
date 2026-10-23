# CR-039: Sikkerhetsgjennomgang av avhengigheter og repo (oktober 2026)

**Status:** In Progress (bestilt av produkteier 2026-10-23: «gjør en npm audit og annet du trenger for å sikre denne appen», etter at OS, Docker og PHP er patchet)
**Created:** 2026-10-23

---

## Business Goal
Holde appen og repoet sikkert i lys av siste ukers sikkerhetsnyheter (npm-ormen «Shai-Hulud/ChainDrop», ny Sentry-advisory).

## Problem Statement
- `npm audit`: **1 critical i produksjon** (`@sentry/nextjs` <10.75.2, GHSA-mchm-gjx6-7h55 / CVE-2026-114139, CVSS 4.0 9.1) + 5 high i dev-only lint-kjede (ISSUE-015).
- Mange avhengigheter hadde patch/minor-oppdateringer innenfor eksisterende versjonsområder.
- Repoet er **offentlig** på GitHub, og `.claude/settings.local.json` er sporet i git. Filen (og commit `e46f8d3`, 2026-05-21, på `origin/master` og tre andre grener) inneholder en **innloggingsstreng til den gamle Neon-databasen i klartekst**.

## Funn (kontroller gjort 2026-10-23)
- **Sentry-advisoryen er ikke utnyttbar her:** gjelder bare når `tunnelRoute` er satt (ikke satt i `next.config.ts`), kun webpack-bygg (Next 16 bygger med Turbopack), og når middleware er eneste autorisasjon. Oppdateres likevel (forsvar i dybden, og for å få audit grønn).
- **npm-ormen (ChainDrop/keyv, august 2026) rammer ikke oss:** `keyv` 4.5.4, `flat-cache` 4.0.1 og `file-entry-cache` 8.0.0 (kun via eslint, dev) er ikke de kompromitterte versjonene (keyv 6.0.0, flat-cache 6.1.24, file-entry-cache 11.1.6, osv.). Ingen `setup.mjs` eller matchende `preinstall` i `node_modules`. Ingen commits av `claude@users.noreply.github.com`, ingen «chore: update config», ingen sporet `.claude/settings.json` eller `.vscode/tasks.json`. Fem pakker har install-skript, alle kjente og uendret: `@prisma/engines`, `prisma`, `@sentry/cli`, `fsevents`, `unrs-resolver`.
- **Hemmelighet i offentlig historikk** (se over): kan ikke «rulleres» av Claude; krever at produkteier sletter databasen i Neon eller bytter passord.
- `.env.example` har kun plassholder (`user:***@host`).

## Proposed Solution
1. `@sentry/nextjs` ^10.69.0 → **^10.76.2** (alle `@sentry/*` følger med).
2. Oppdater innenfor eksisterende områder (ingen major, ingen endring av `next`/`prisma`/`react`): AWS SDK, nodemailer 10.2.1, pg 8.23.1, jszip 3.10.2, tailwind 4.3.3, `@types/*`, eslint 9.39.5, samt transitive. Alt med `--ignore-scripts`; lockfile-diff gjennomgått (se Validation Notes).
3. Slutt å spore `.claude/settings.local.json` (`git rm --cached`; filen blir liggende lokalt, og den er allerede i brukerens globale gitignore).

**Utenfor scope (bevisst):** major-oppgraderinger (react 19.3, typescript 7, dotenv 18, iron-session 9, `@sentry/nextjs` 11, prisma 8-rc, `@types/node` 26); ISSUE-015 (dev-only `braces`-kjede, `--force` er en nedgradering); omskriving av git-historikk (krever force-push og er meningsløst før hemmeligheten er rotert); endring av Claude-tillatelser; endring av Dockerfile.

## Impact Analysis

### Affected Specs
- [ ] Ingen spec-endring (ren avhengighets-/hygieneendring). `specs/nfr.md` påvirkes ikke.

### Affected Components
- `package.json`, `package-lock.json`
- `.claude/settings.local.json` (fjernes fra sporing)

### Database Impact
Ingen.

### API Impact
Ingen.

### UX Impact
Ingen.

### Security Impact
Fjerner den kritiske produksjons-advisoryen. Hemmeligheten i historikken er IKKE løst før den er rotert/slettet av produkteier.

### Performance Impact
Ubetydelig.

---

## Acceptance Criteria
- [ ] `npm audit --omit=dev` viser 0 sårbarheter
- [ ] `npm audit` viser kun de fem kjente dev-only high (ISSUE-015)
- [ ] `npm test`, `npx tsc --noEmit`, `npm run build` grønt
- [ ] Lockfile-diff gjennomgått: ingen nye install-skript, ingen uventede pakker
- [ ] Coolify-bygget går rent, og appen fungerer i produksjon (innlogging, case, fil-opplasting, e-post, feilsporing)
- [ ] `.claude/settings.local.json` ikke lenger sporet
- [ ] Neon-databasen slettet eller passordet rotert (produkteier)

## Required Tests
- [ ] Unit: eksisterende 207 tester
- [ ] E2E: Chrome mot produksjon etter deploy (rask røyktest; test-case slettes etterpå)

## Rollback Strategy
`git revert` + «Redeploy» (ingen schema- eller dataendring).

## Migration Strategy
Ingen.

## Risks
- Oppdatering av `@aws-sdk/*`, `pg` og `nodemailer` kan endre atferd subtilt (patch/minor, men mange versjoner); dekkes av røyktest av fil-opplasting/nedlasting og e-post.
- Sentry-oppdateringen berører feilsporing (Bugsink); sjekk at en feil fortsatt rapporteres.
- Hemmeligheten forblir i git-historikken til offentlig repo uansett; derfor kreves rotasjon.

## Dependencies
Bygger på CR-031.

## Validation Notes

**Lokalt 2026-10-23 (ikke pushet):** `npm update` (valgte pakker) + `@sentry/nextjs@^10.76.2`, alt med `--ignore-scripts`. Lockfile: 82 pakker endret, 1 nestet lagt til (`es-module-lexer`), 12 fjernet (Sentry sin gamle bundler-plugin-kjede, `@apm-js-collab/*`, `meriyah`, `astring`, `neo-async`, m.fl.); ingen nye install-skript. `npm audit --omit=dev`: **0 sårbarheter** (var 1 critical); `npm audit`: 5 high (dev-only, ISSUE-015). `tsc` ✓, 207 tester ✓, `next build` ✓. Ikke verifisert i produksjon ennå.
