# DECISIONS.md

> Append-only. Document every significant architectural or governance decision.

## Format
```
DATE: YYYY-MM-DD
DECISION: [short title]
CONTEXT: [why was this needed]
DECISION: [what was decided]
ALTERNATIVES CONSIDERED: [what else was evaluated]
RATIONALE: [why this option]
CONSEQUENCES: [what this enables or constrains]
DECIDED BY: human | Claude | both
```

## Decisions

DATE: 2026-05-21
DECISION: Adopt governed AI-native repository structure
CONTEXT: AI-assisted development across multiple sessions requires explicit session continuity, change traceability, and governance to prevent architectural drift.
DECISION: Implement full governance structure with CLAUDE.md, session orchestration, CR system, review system, and agent roles.
ALTERNATIVES CONSIDERED: Ad-hoc prompting; rules-only approach.
RATIONALE: Ad-hoc prompting loses context between sessions. Explicit structure makes AI behavior deterministic and auditable.
CONSEQUENCES: All changes require a CR. Sessions start and end with orchestration file updates.
DECIDED BY: human

---

DATE: 2026-05-21
DECISION: Tech stack for Effektbibliotek v1
CONTEXT: Prosjektet skal utvikles i fase 1 med gratisverktøy, og stacken må være enkel å migrere når produktet går i drift.
DECISION: Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui + Prisma + Neon (PostgreSQL) + Custom OTP + iron-session + Resend + Vercel Hobby.
ALTERNATIVES CONSIDERED: SvelteKit (mindre community, færre shadcn-ressurser). Supabase auth / Clerk (vendor lock-in og kostnad ved skalering). Auth0 (kostnad). Remix (god DX men mer friksjon mot Vercel).
RATIONALE: Next.js gir fullstack i én kodebase. Prisma gjør database-bytte til én linjeskift. Custom OTP har ingen ekstern avhengighet. Resend og Neon er isolert bak adapter-lag. Vercel Hobby er gratis og deployer Next.js uten konfigurasjon.
CONSEQUENCES: Serverless 10s timeout (uproblematisk). E-post og auth er fullt kontrollerbare. Migrering til annen hosting krever ingen kodeendringer i forretningslogikk.
DECIDED BY: human

---

DATE: 2026-05-21
DECISION: Nodemailer + Gmail SMTP i stedet for Resend
CONTEXT: Resend free tier kan kun sende til verifiserte e-postadresser uten domene-verifisering, noe som blokkerer e-post til kunder i beta.
DECISION: Bruk Nodemailer med Gmail SMTP og App Password for e-postutsending.
ALTERNATIVES CONSIDERED: Resend (fungerer ikke uten verifisert domene på free tier). Mailgun (kostnad).
RATIONALE: Gmail SMTP er gratis, fungerer umiddelbart, og lar oss sende til vilkårlige adresser. App Password er sikker nok for beta.
CONSEQUENCES: Daglig sendegrense ~500 e-post. Bør byttes til dedikert e-posttjeneste ved skalering. Endringen isolert til lib/email.ts.
DECIDED BY: both

---

DATE: 2026-05-22
DECISION: Godkjenningslenke bruker request.url.origin, ikke NEXT_PUBLIC_APP_URL
CONTEXT: Under utvikling kjørte dev-serveren på port 3001 fordi 3000 var opptatt, men NEXT_PUBLIC_APP_URL pekte på localhost:3000, noe som ga ERR_CONNECTION_REFUSED på godkjenningslenken.
DECISION: Alltid bruke `new URL(request.url).origin` for å bygge godkjenningslenker i API-routes.
ALTERNATIVES CONSIDERED: Sette NEXT_PUBLIC_APP_URL riktig per miljø.
RATIONALE: request.url.origin er alltid korrekt — riktig i prod (Vercel-URL), riktig i dev uavhengig av port. Eliminerer kilde til port-mismatch-feil.
CONSEQUENCES: Godkjenningslenken fungerer automatisk i alle miljøer uten manuell env-konfigurasjon.
DECIDED BY: Claude

---

DATE: 2026-05-22
DECISION: prisma generate som del av build-script på Vercel
CONTEXT: Prisma 7 med custom output-path (`app/generated/prisma`) genererer ikke klienten automatisk under `npm install` på Vercel.
DECISION: Build-script er `prisma generate && next build`.
ALTERNATIVES CONSIDERED: postinstall script; Vercel build command override.
RATIONALE: Enklest å vedlikeholde, synlig i package.json, ingen ekstern Vercel-konfigurasjon nødvendig.
CONSEQUENCES: Byggetid øker med ~2 sekunder. Prisma-klienten er alltid oppdatert med skjema ved deploy.
DECIDED BY: Claude

---

DATE: 2026-07-31
DECISION: Full port fra Vercel/Neon til Hetzner/Coolify/PostgreSQL 18 (CR-008)
CONTEXT: Effektbiblioteket lå på Vercel/Neon (isolert fra Bas' egen infrastruktur). Bas har bygget basbeta.no — en dedikert, GDPR-compliant beta-plattform på Hetzner med Coolify — der hvert prosjekt skal driftes isolert med eget subdomene og database.
DECISION: Full migrering (ikke parallelldrift). Deploy: Vercel → Coolify (Dockerfile build pack, domene `effektbibliotek.basbeta.no`). Database: Neon → fersk PostgreSQL 18-instans i Coolify, ingen datamigrering. E-post: Gmail SMTP → Brevo SMTP med per-prosjekt-avsender.
ALTERNATIVES CONSIDERED: Parallelldrift (Vercel + Coolify samtidig) — avvist, unødvendig kompleksitet for et prosjekt uten viktige produksjonsdata. Datamigrering fra Neon — avvist, produkteier bekreftet at ingenting i eksisterende data er viktig.
RATIONALE: basbeta-infrastrukturen er allerede bygget og betalt for nettopp denne typen prosjekter (lav kostnad, europeisk, GDPR ut av boksen). Prisma sin driver-adapter gjør databasebytte til kun en ny connection string. Dockerfile er portabelt og fjerner Vercel-spesifikke antakelser fra koden.
CONSEQUENCES: Nytt produksjons-domene (`effektbibliotek.basbeta.no`). `prisma migrate deploy` kjører automatisk ved container-oppstart i stedet for i Vercel sitt build-steg. Manuelt Coolify-oppsett (database, app-ressurs, domene, env-vars, backup, overvåking) må utføres av produkteier — dokumentert i `docs/COOLIFY-DEPLOY.md`. Vercel/Neon beholdes urørt som fallback inntil Coolify er verifisert stabilt.
DECIDED BY: human

---

DATE: 2026-08-03
DECISION: Legg til SMTP-timeout på Brevo-transportøren (CR-009)
CONTEXT: Etter at CR-008 ble satt i produksjon på Coolify (effektbibliotek.basbeta.no), hang OTP-innlogging uten å sende e-post eller returnere feil. Transportøren i lib/email.ts hadde ingen connection/greeting/socket-timeout, så en SMTP-tilkoblingsfeil (feil/manglende credentials, blokkert utgående port) ble aldri overflatebehandlet — requesten ventet på ubestemt tid.
DECISION: Sett 10s `connectionTimeout`, `greetingTimeout` og `socketTimeout` på nodemailer-transportøren.
ALTERNATIVES CONSIDERED: La feilen forbli synlig kun via serverlogger uten timeout (avvist — brukeren ser fortsatt en hengende spinner). Lengre/kortere timeout-verdi — 10s valgt som balanse mellom å tåle normal SMTP-latens og å feile raskt nok til å ikke oppleves som henging.
RATIONALE: En rask, synlig feil er alltid bedre enn en uendelig hengende request — spesielt nå som appen ikke lenger kjører bak en plattform (Vercel) som håndhevet et function-timeout for oss.
CONSEQUENCES: Løser symptomet (hengende UI). Løser ikke nødvendigvis rotårsaken til hvorfor SMTP faktisk feiler i Coolify — det er en driftsoppgave (verifisere env-vars og brannmurregler), ikke en kodefeil, og er dokumentert som neste steg i CURRENT-STATE.md.
DECIDED BY: both

---

DATE: 2026-08-03
DECISION: Legg til connectionTimeoutMillis på Prisma/pg-adapteren (CR-010)
CONTEXT: Etter at CR-009 var deployet OG produkteier hadde bekreftet at BREVO_SMTP_LOGIN/BREVO_SMTP_KEY/FROM_EMAIL var korrekt satt som runtime-miljøvariabler i Coolify, hang OTP-innlogging fortsatt. Dette utelukket den opprinnelige SMTP-hypotesen. Videre undersøkelse viste at prisma.otpCode.create() — et databasekall — skjer FØR sendOtpEmail() i login-routen. lib/prisma.ts sin PrismaPg-adapter var kun konfigurert med connectionString; pg.Pool (som adapteren bruker under panseret) har connectionTimeoutMillis: 0 som standard, altså ingen timeout. En utilgjengelig eller feilkonfigurert database ville derfor henge for alltid, uavhengig av SMTP-fiksen.
DECISION: Sett connectionTimeoutMillis: 10_000 på PrismaPg-adapteren i lib/prisma.ts.
ALTERNATIVES CONSIDERED: Anta at problemet fortsatt var SMTP-relatert og fortsette å feilsøke Brevo/nettverk uten å se på databaselaget (avvist etter å ha lest kildekoden til request-code-routen og bekreftet rekkefølgen på operasjonene).
RATIONALE: Samme prinsipp som CR-009 — enhver ekstern I/O-operasjon uten eksplisitt timeout er en potensiell uendelig hang når appen ikke lenger kjører bak en plattform (Vercel) som håndhever et function-timeout for oss. Database-kallet skjer tidligere i requesten enn e-postkallet, så det måtte fikses uavhengig.
CONSEQUENCES: Hvis hengingen fortsetter etter denne fiksen, vil Coolify sin app-logg nå vise en konkret feil (trolig en pg/Prisma-tilkoblingsfeil) innen 10s, som gir et konkret neste sted å lete (DATABASE_URL, nettverksisolasjon mellom app- og database-ressurs i Coolify) — i stedet for å gjette blindt. IKKE bekreftet at dette faktisk løser produksjonsproblemet; krever redeploy og ny test.
DECIDED BY: both

---

DATE: 2026-08-03
DECISION: Bytt Dockerfile fra `prisma migrate deploy` til `prisma db push`, og legg til garantert JSON-feilrespons i request-code-routen (CR-011)
CONTEXT: Etter CR-009 og CR-010 (begge reelle, verifiserte forbedringer) hang OTP-innlogging fortsatt. Coolify sine runtime-logger viste den faktiske årsaken direkte: `Error [PrismaClientKnownRequestError]... The table 'public.OtpCode' does not exist`, kode P2021. `prisma/migrations` har aldri eksistert i dette repoet — prosjektet har alltid brukt `db push` for skjemastyring. `prisma migrate deploy` i Dockerfile sin CMD fant derfor ingen migreringer å anvende og gjorde ingenting, og den ferske Coolify-databasen fra CR-008 sto uten tabeller. I tillegg hadde `request-code/route.ts` ingen try/catch, og `login/page.tsx` sin `res.json()`-kall håndterte ikke en eventuell parse-feil — dette lot UI-et henge på "Sender…" for alltid selv når serveren egentlig svarte momentant med en feil.
DECISION: Endre Dockerfile CMD til `npx prisma db push --skip-generate && npm run start`. Legg til try/catch i request-code-routen som garanterer et gyldig JSON-feilsvar ved enhver uventet feil.
ALTERNATIVES CONSIDERED: Generere formelle `prisma migrate`-migreringsfiler i stedet for å bytte til `db push` — foretrukket på sikt (se Risks i CR-011), men krevde Prisma CLI + direkte databasetilgang som ikke var tilgjengelig i denne økten. `db push` ble valgt som en riktig, lavrisiko løsning som matcher hvordan prosjektet faktisk har vært driftet fra dag én.
RATIONALE: `db push` er korrekt gitt at ingen migreringshistorikk noensinne har eksistert — å late som migrate deploy ville fungere er det som faktisk forårsaket bugen. Try/catch-fiksen er en generell robusthetsforbedring: enhver uhåndtert feil i denne routen ville gitt samme "evig hengende UI"-symptom, uavhengig av årsak.
CONSEQUENCES: Neste deploy oppretter alle tabeller i den ferske databasen. `db push` gir ingen reviewbar skjemahistorikk — anbefalt å vurdere formelle migreringer før prosjektet har ekte data av verdi. Alle fremtidige feil i request-code-routen vil nå vises til brukeren i stedet for å henge UI-et.
DECIDED BY: both

---

DATE: 2026-08-03
DECISION: CR-011 løsning bekreftet — dokumentere lærdom om to feilslåtte mellomsteg som tok ned produksjon
CONTEXT: Det første CR-011-forsøket (`prisma db push --skip-generate`) crash-loopet containeren 10 ganger og tok ned hele appen — verre enn utgangspunktet (hvor i det minste innloggingssiden lastet, selv om innlogging feilet). Andre forsøk gjettet feil årsak (antok interaktiv bekreftelsesprompt uten TTY, la til `--accept-data-loss`) og crashet likt. Kun ved å faktisk lese container-loggene (ikke Coolify sin orkestrerings-/deployment-log, som viser build/rollout men ikke stdout fra selve containeren) ble den ekte feilen funnet: `--skip-generate` er ikke et gyldig flagg for `db push` i denne Prisma-versjonen.
DECISION: Endelig CMD (`npx prisma db push --accept-data-loss && npm run start`) er deployet og bekreftet — produkteier logget inn, mottok og verifiserte OTP-kode på effektbibliotek.basbeta.no.
ALTERNATIVES CONSIDERED: —
RATIONALE: —
CONSEQUENCES: Lærdom for fremtidig feilsøking i dette prosjektet: (1) Coolify sin "Deployment"-log ≠ container sin runtime-log — sistnevnte krever at man velger riktig, aktiv container-instans under "Logs"-fanen, og forsvinner når containeren crash-looper til stopp. (2) Gjett aldri på årsaken til en containerkrasj når faktiske logger er hentbare — begge mellomforsøkene her var plausible, velbegrunnede hypoteser som viste seg feil, og kostet reell nedetid. (3) Verifiser CLI-flagg mot den faktiske installerte versjonen (Prisma 7.x her) fremfor generell kunnskap om eldre versjoner.
DECIDED BY: both

---

DATE: 2026-08-03
DECISION: Installer Node.js lokalt i AI-arbeidsmiljøet, og legg til Bugsink-basert feilsporing (CR-012)
CONTEXT: Feilsøkingen av CR-009–CR-011 måtte gjøres helt uten evne til å kjøre `npm`/`npx`/`tsc` i dette miljøet — hver kodeendring ble kun visuelt verifisert, aldri faktisk bygget, før den ble pushet til produksjon. To av deployene tok ned appen (crash-loop) delvis fordi feil (som et ugyldig CLI-flagg) ikke kunne fanges lokalt før push. Samtidig hadde produkteier allerede satt opp Bugsink (selvhostet, Sentry-SDK-kompatibel feilsporing) på `errors.basbeta.no`, uten at appen sendte noe dit ennå — hele CR-009–CR-011-hendelsen kunne vært diagnostisert på sekunder med automatisk feilsporing i stedet for manuell logg-graving i Coolify.
DECISION: (1) Installerte Node.js 22 lokalt via `winget install OpenJS.NodeJS.22` for å matche Dockerfile sin `node:22-alpine` og kunne kjøre ekte build/typecheck-verifisering fremover. (2) Implementerte CR-012: `@sentry/nextjs` installert via npm, `instrumentation.ts`/`instrumentation-client.ts` lagt til, `next.config.ts` wrappet med `withSentryConfig` (kildekart-opplasting deaktivert), DSN pekt mot `errors.basbeta.no` (ikke `localhost`, avklart med produkteier).
ALTERNATIVES CONSIDERED: Fortsette uten lokal Node og be produkteier kjøre alle npm-avhengige steg selv — forkastet, ineffektivt og øker risikoen for flere push-and-pray-hendelser som CR-011 sine to feilslåtte deploys.
RATIONALE: Et AI-arbeidsmiljø som ikke kan bygge koden det skriver, kan ikke verifisere det før produksjon ser det — nettopp det som gjorde CR-011 dyrere enn nødvendig. Bugsink var allerede klar infrastruktur; å ikke koble den til var den eneste reelle mangelen.
CONSEQUENCES: Fremtidige kodeendringer i denne økten kan (og bør) verifiseres med `npm run build`/`npx tsc --noEmit` før push. Node-installasjonen er maskinlokal, ikke en del av repoet. Gjenstår: sette SENTRY_DSN/NEXT_PUBLIC_SENTRY_DSN i Coolify og bekrefte faktisk event-levering.
DECIDED BY: both

---

DATE: 2026-08-03
DECISION: DSN for Bugsink må bruke https://, ikke http:// — bekreftet via produksjonslogg, ikke gjetning
CONTEXT: Etter at SENTRY_DSN/NEXT_PUBLIC_SENTRY_DSN var korrekt satt i Coolify (bekreftet i UI), nådde en bevisst testfeil likevel ikke Bugsink. Nettleserens konsoll hadde tidligere vist en Mixed-Content-blokkering for klientsiden (http-DSN fra en https-side), men server-siden skulle i teorien ikke ha samme begrensning. Ved å slå på `debug: true` på server-SDK-en og lese faktisk produksjonslogg (samme metode som løste CR-011), dukket den ekte årsaken opp: `Sentry responded with status code 307 to sent event` — `errors.basbeta.no` redirecter HTTP-forespørsler til HTTPS, og Sentry sin transport følger ikke redirects, så eventet ble stille droppet uten synlig feil.
DECISION: Bytt DSN-skjema fra `http://` til `https://` for både `SENTRY_DSN` og `NEXT_PUBLIC_SENTRY_DSN`.
ALTERNATIVES CONSIDERED: Anta at server-siden fungerte fordi Node ikke har mixed-content-begrensning, og lete etter andre årsaker (feil DSN-verdi, nettverksisolasjon) — forkastet etter at debug-logging ga et eksakt, ugjettbart svar.
RATIONALE: HTTPS var allerede tilgjengelig for `errors.basbeta.no` (Traefik/Coolify redirecter dit automatisk) — det manglet bare i DSN-en vi konfigurerte. Løser både klientsidens mixed-content-blokkering og serversidens stille 307-feil i én endring.
CONSEQUENCES: Feilsporing fungerer nå ende-til-ende, bekreftet med en reell testfeil i Bugsink. Lærdom: samme mønster som CR-011 — når noe "burde fungere" men ikke gjør det, slå på debug-logging og les faktisk logg, ikke gjett videre.
DECIDED BY: both

---

DATE: 2026-08-03
DECISION: Erstatt "kopier godkjenningstekst" med direkte e-postutsending for bruksgodkjenning (CR-013)
CONTEXT: Bruksgodkjenningsflyten krevde tidligere at Bas-representanten kopierte en ferdigskrevet tekst og limte den inn i sitt eget e-postprogram for å sende til kundens kontaktperson. Nå som e-postutsending er verifisert pålitelig i produksjon (CR-009–011) og feilsporing er på plass (CR-012), ba produkteier om å sende direkte fra appen i stedet.
DECISION: Case fikk to nye felt (approverName, approverEmail). ApprovalSection.tsx sitt inline-skjema samler disse og poster til en ny route (send-approval-request) som sender e-post direkte til godkjenneren med caseeier på kopi (cc), og lagrer navnet/e-posten på casen for gjenbruk ved eventuell ny utsending. Den gamle copy-approval-text-routen ble fjernet, ikke beholdt som fallback.
ALTERNATIVES CONSIDERED: Beholde kopier-tekst-knappen som fallback ved siden av — avvist av produkteier, direkte utsending skal være eneste vei siden e-post nå er pålitelig. Legge feltene på case-redigeringsskjemaet i stedet for inline i godkjenningswidgeten — avvist, dataene hører naturlig til selve godkjenningshandlingen, ikke case-metadata.
RATIONALE: Fjerner et manuelt, feilutsatt steg (kopier → bytt til e-postklient → lim inn → send) nå som forutsetningen (pålitelig e-post) er på plass.
CONSEQUENCES: `usageApprovalStatus` settes til "open" ved utsending, akkurat som før. Feil ved sending fanges av try/catch og rapporteres til Bugsink, i tråd med mønsteret fra CR-012. IKKE bekreftet fungerende i faktisk produksjon ennå — krever push, deploy og en reell test.
DECIDED BY: both

---

DATE: 2026-08-03
DECISION: Reverser request.url.origin → NEXT_PUBLIC_APP_URL for lenker i utgående e-post (supersedes 2026-05-22-avgjørelsen for dette formålet)
CONTEXT: 2026-05-22 ble `request.url.origin` valgt over `NEXT_PUBLIC_APP_URL` for å bygge godkjenningslenker, fordi env-variabelen pekte på feil port i lokal dev (3000 vs 3001) mens `request.url.origin` alltid var korrekt — den gang kjørte appen på Vercel. Etter CR-013 sin første reelle test i produksjon på Coolify/Traefik, viste det seg at `request.url.origin` i API-routes nå resolver til `localhost:3000` i stedet for `effektbibliotek.basbeta.no` — stikk motsatt problem av det som ble løst i mai. `proxy.ts`/middleware sin bruk av samme mønster er IKKE påvirket (bekreftet av at innloggingsredirect har fungert hele kvelden) — bugen er isolert til Route Handlers under app/api/**.
DECISION: Bygg app-URL-er i e-postinnhold med `process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin` — env-variabelen først, request-basert fallback kun for lokal dev der ingen slik variabel typisk er satt. `NEXT_PUBLIC_APP_URL=https://effektbibliotek.basbeta.no` må settes i Coolify.
ALTERNATIVES CONSIDERED: Finne og fikse hvorfor Traefik ikke videresender riktig Host-header til Next.js-containeren — forkastet for nå, krever dypere Traefik/Coolify-konfigurasjonsundersøkelse utenfor denne øktens tilgang, og en env-variabel er uansett mer robust uavhengig av proxy-oppsett.
RATIONALE: En eksplisitt, driftssatt env-variabel med en fast, kjent produksjons-URL er mer pålitelig enn å stole på at en reverse proxy videresender headere korrekt — spesielt når vi allerede har konkret bevis på at den ikke gjør det i denne konfigurasjonen.
CONSEQUENCES: Krever at `NEXT_PUBLIC_APP_URL` er satt i Coolify for at lenker i e-post skal bli riktige — uten den, samme bug som før. Samme latente feil eksisterte fra før i lib/email.ts sin "Se casen her"-lenke (CR-004), ikke bare i CR-013 sin nye kode — den er nå også dekket siden den allerede leste NEXT_PUBLIC_APP_URL. Fremtidig kode som bygger absolutte URL-er i API-routes bør følge samme mønster (env-var først), ikke stole blindt på request.url.origin.
DECIDED BY: both

---

DATE: 2026-08-03
DECISION: Bruk vanlig APP_URL i stedet for NEXT_PUBLIC_APP_URL for server-only lenkebygging
CONTEXT: Etter forrige fiks (bytte fra request.url.origin til NEXT_PUBLIC_APP_URL) var godkjenningslenken i e-post fortsatt uendret selv etter at variabelen var satt i Coolify og appen redeployet. Next.js bygger enhver `process.env.NEXT_PUBLIC_*`-referanse statisk inn i koden ved `next build` — uavhengig av om referansen faktisk havner i klient- eller serverkode. Hvis variabelen ikke var tilgjengelig i selve Docker build-steget (kun flagget "Runtime" i Coolify, ikke nødvendigvis "Buildtime", eller feil rekkefølge), blir den kompilert inn som `undefined` permanent — ingen senere runtime-endring i miljøet kan endre det, siden verdien aldri leses dynamisk.
DECISION: Fjern `NEXT_PUBLIC_`-prefikset for denne variabelen. Bruk en vanlig `APP_URL`, lest normalt via `process.env.APP_URL` ved runtime, siden verdien kun brukes i server-only kode (e-postmaler, API-routes) og aldri i klientbundelen.
ALTERNATIVES CONSIDERED: Sørge for at NEXT_PUBLIC_APP_URL er tilgjengelig ved buildtime i Coolify (huke av "Available at Buildtime") — ville sannsynligvis løst symptomet, men beholder en unødvendig NEXT_PUBLIC_-prefiks (og dermed unødvendig eksponering til klientbundelen) for en verdi som aldri trengs der.
RATIONALE: NEXT_PUBLIC_-prefikset finnes for å bevisst eksponere en variabel til nettleserkoden — det er ikke "en variabel som også virker på server". Å bruke prefikset for noe som kun trengs server-side er feil bruk av mekanismen og introduserer akkurat denne typen build-vs-runtime-forvirring. CR-012 sin Bugsink-DSN trenger fortsatt NEXT_PUBLIC_-varianten (client-side feilsporing), så det er ikke roten som er problemet — det er å bruke det prefikset der det ikke trengs.
CONSEQUENCES: Coolify-variabelen må hete `APP_URL`, ikke `NEXT_PUBLIC_APP_URL`. Fremtidig kode som trenger en server-only konfigurasjonsverdi bør aldri bruke NEXT_PUBLIC_-prefiks med mindre verdien faktisk skal være synlig i nettleserens JavaScript.
DECIDED BY: both

---

DATE: 2026-08-03
DECISION: Fjern avledet "bruksnivå"-enum, bruk 6 rene boolske bruksvalg direkte (CR-020)
CONTEXT: Case-detaljsiden viste både en avledet CaseUsageLevel-badge (not_cleared/internal_only/presentation_allowed, utledet fra rå checkbox-valg via computeUsageLevel()) OG separate boolske pills (ndaRestricted, anonymizedUseOnly, competitionUseAllowed) ved siden av — samme informasjon dobbelt opp, på to ulike måter. Produkteier ba om en forenkling til nøyaktig 6 tydelige, uavhengige valg: NDA, kun anonymisert, hjemmeside, presentasjoner, anbudsbesvarelser, konkurranse/award-show. "Kan presenteres internt i Bas" (internalUseAllowed) var ikke i den ønskede listen.
DECISION: Fjernet CaseUsageLevel-enum og computeUsageLevel() i sin helhet. Erstattet med sanitizeChoices(), som kun håndhever gjensidig utelukkelse (NDA eller "kun anonymisert" blokkerer alle andre valg — sistnevnte var tidligere kun en modifikator, ikke gjensidig utelukkende). Case og UsageApproval lagrer nå de 6 rene boolske flaggene direkte, ingen syntetisert "nivå". UsageBadge viser én liten badge per godkjent bruksområde (bekreftet med produkteier via spørsmål — alternativet var én oppsummerende tellerbadge).
ALTERNATIVES CONSIDERED: Beholde usageLevel som en visningsbekvemmelighet ved siden av de rå flaggene — avvist, det var nøyaktig denne dobbeltheten produkteier ba om å fjerne. Én oppsummerende "X bruksområder godkjent"-badge i stedet for én per bruksområde — avvist til fordel for mer informativ visning direkte i listevisninger.
RATIONALE: Rene, uavhengige boolske flagg er enklere å resonnere om enn et avledet nivå som må holdes synkronisert med de underliggende valgene. Fjerner en hel klasse med "hvorfor viser disse to badgene forskjellig informasjon"-forvirring.
CONSEQUENCES: Skjemaendring — Case.usageLevel og UsageApproval.internalUseAllowed droppes ved neste `prisma db push --accept-data-loss` (CR-011-mønsteret). Akseptert som lavrisiko gitt betastatus uten viktig produksjonsdata (samme vurdering som CR-008). 16 filer endret for å holde bibliotek-filter, listevisninger, redigeringsskjema og det offentlige godkjenningsskjemaet i samsvar med den nye modellen.
DECIDED BY: both

---

DATE: 2026-08-04
DECISION: Innfør formelle Prisma-migreringer, erstatt `db push` med `migrate deploy` (CR-024)
CONTEXT: `prisma db push --accept-data-loss` har nå forårsaket reelt (akseptert) datatap ved to anledninger (CR-011, CR-020), dokumentert som en økende risiko i ISSUE-009 jo lenger appen er i reell drift. `prisma/migrations/` har aldri eksistert i repoet, til tross for at `specs/nfr.md` og `docs/COOLIFY-DEPLOY.md` hele tiden har beskrevet `migrate deploy` som driftsmodellen (et gap CR-011 løste ved å endre koden til å matche virkeligheten, i stedet for omvendt).
DECISION: Generert en baseline-migrering (`prisma/migrations/20260804120000_init`) med `prisma migrate diff --from-empty --to-schema` som reflekterer dagens skjema nøyaktig. Rulles ut i to atskilte deploys i stedet for én: Deploy A legger kun til migreringsfilene (Dockerfile CMD uendret, fortsatt `db push`); et manuelt `prisma migrate resolve --applied 20260804120000_init`-steg kjøres via Coolify Terminal etter at Deploy A er live; Deploy B (egen, senere commit) bytter deretter Dockerfile CMD til `prisma migrate deploy`. Dokumentert i `docs/COOLIFY-DEPLOY.md` §4b.
ALTERNATIVES CONSIDERED: Fortsette med `db push` inntil appen har ekte kundedata — avvist, risikoen er allerede reell nok (to hendelser) til at forebygging nå er billigere enn opprydding senere. Kjøre `migrate resolve` automatisk som del av Dockerfile CMD (f.eks. betinget script som prøver `resolve` før `deploy` ved hver oppstart) — avvist etter nærmere vurdering: dette ville stille markere baseline-migreringen som "applied" uten å faktisk kjøre den, også ved en fremtidig FERSK/tom database (f.eks. disaster recovery) — noe som ville gi en helt tom database uten at noen merker det, samme bugklasse som CR-011. Ett enkelt runbook-steg "kjør resolve rett før deploy" — avvist etter at det ble klart at appen har autodeploy på push til `master`: push og deploy skjer i samme øyeblikk, så det finnes ingen tidsluke å utføre et manuelt steg i mellom. Løsningen ble derfor å splitte i to uavhengige commits/deploys med det manuelle steget imellom, ikke ett steg med en tidsavhengighet som ikke kan overholdes.
RATIONALE: En reviewbar migreringshistorikk er tryggere før effektbiblioteket har verdifull produksjonsdata, ikke etter. To-deploy-tilnærmingen fjerner enhver race condition mot autodeploy, uten å kreve at autodeploy skrus av eller at produkteier har spesiell Coolify-tilgang utover den vanlige Terminal-fanen.
CONSEQUENCES: Deploy B (CMD-bytte til `migrate deploy`) må IKKE pushes før det manuelle `migrate resolve`-steget er bekreftet utført mot prod-databasen — hvis rekkefølgen brytes, crash-looper containeren med samme feilmønster som CR-011 (men denne gangen en synlig "table already exists"-feil, ikke en stille no-op). Alle migreringer lagt til etter Deploy B anvendes normalt av `migrate deploy` uten manuelt inngrep. Kunne ikke testes fullt ut i denne økten — ingen lokal/dev Postgres-instans tilgjengelig for å faktisk kjøre migreringen mot en database.
BEKREFTET: 2026-08-04 — Deploy A (7c012ea) pushet og live, produkteier kjørte `migrate resolve --applied 20260804120000_init` via Coolify Terminal (bekreftet mot faktisk prod-database), Deploy B (4fad3b5) pushet deretter og deploy-loggen bekreftet ren. Appen kjører normalt på `migrate deploy`. ISSUE-009 lukket.
DECIDED BY: both

---

DATE: 2026-08-04
DECISION: Hard delete (ikke soft-delete) for case-sletting, med onDelete: Cascade og et obligatorisk advarsel/eksport-sikkerhetsnett (CR-025)
CONTEXT: Produkteier ba om at caseeieren selv skal kunne slette en case, noe som ikke fantes i det hele tatt (bekreftet ved kodesøk). Dette skapte en reell spenning mot et tidligere nedskrevet arkitekturprinsipp i ARCHITECTURE-STATE.md: "Bruksgodkjenning-historikk er append-only, aldri overskriv". En hard sletting av en Case ville cascade-slette dens UsageApproval-rader og dermed bryte akkurat det prinsippet. Databasen hadde uansett ingen onDelete-regler på UsageApproval/CaseLink → Case, så en sletting ville uansett feilet med et FK-brudd i dag.
DECISION: Produkteier valgte eksplisitt ekte (permanent) sletting fremfor soft-delete/arkivering, med et obligatorisk sikkerhetsnett i stedet for en angre-mulighet: en advarsel-dialog ("Farlig sone" i redigeringsskjemaet) som (1) viser fast advarselstekst om at slettingen er permanent, (2) lister alle tilknyttede lenker/materiale som forsvinner, (3) viser én linje per godkjenning i historikken ("Denne casen har følgende godkjenninger fra {kunde} lagt inn av {navn} den {dato}") hvis slik historikk finnes, og (4) tilbyr en eksporter-knapp (både i dialogen og på selve case-siden) som laster ned alt innhold som tekst før man bekrefter. `onDelete: Cascade` lagt til på UsageApproval.case og CaseLink.case i schema.prisma, med en ny migrering generert statisk (samme metode som CR-024s baseline — `prisma migrate diff --from-schema <gammel> --to-schema <ny>`, ingen live database nødvendig).
ALTERNATIVES CONSIDERED: Soft-delete/arkivering (skjul casen, behold alle rader) — ville bevart append-only-prinsippet uendret, men ble ikke det produkteier ba om; eksplisitt avvist til fordel for ekte sletting. Hard delete kun tillatt når usageApprovalStatus er not_requested (blokkert hvis godkjenningshistorikk finnes) — ikke valgt, produkteier ba om reell sletting uavhengig av godkjenningsstatus, med varsel/eksport som sikkerhetsnett i stedet for en hard blokkering.
RATIONALE: Append-only-prinsippet var ment å forhindre stille/utilsiktet tap av godkjenningshistorikk (f.eks. en feil i redigeringsskjemaet som overskriver et felt) — ikke å forby en eier fra bevisst å fjerne hele casen sin. En eksplisitt, informert bekreftelse (med full oversikt over hva som forsvinner, og mulighet til å eksportere først) ivaretar samme underliggende hensyn (ingen utilsiktet tap) uten å hindre den funksjonaliteten produkteier faktisk ba om.
CONSEQUENCES: `sessions/ARCHITECTURE-STATE.md` sitt append-only-prinsipp er oppdatert til å eksplisitt nevne dette som det ene, bevisste unntaket. `onDelete: Cascade` betyr at ENHVER fremtidig kode som sletter en Case — ikke bare denne nye DELETE-routen — vil cascade-slette godkjenningshistorikk uten videre varsel; viktig å huske ved fremtidig utvikling nær Case-modellen. Sletting er irreversibel i databasen — eksportfilen er brukerens eneste kopi etter sletting, ikke en innebygd papirkurv.
DECIDED BY: both

---

DATE: 2026-08-04
DECISION: Emergency revert to `db push` after a BOM in the CR-025 migration crash-looped production (ISSUE-011)
CONTEXT: CR-025's cascade-delete migration (`20260804130000_case_cascade_delete`) was generated the same way as CR-024's baseline: `prisma migrate diff ... | Out-File -Encoding utf8 <path>` in PowerShell. That flag writes a UTF-8 byte-order-mark (BOM) at the start of the file. CR-024's baseline migration has the identical BOM, but it never surfaced because it was only ever marked "applied" via `prisma migrate resolve --applied` — a command that writes metadata only and never executes the migration's SQL. CR-025's migration was the first one Prisma ever actually ran with `migrate deploy` in production, and Postgres rejected the entire script with a syntax error at position 0 (`ERROR: syntax error at or near "\u{feff}"`). The container crash-looped (autodeploy kept retrying the same broken CMD) until Coolify hit its restart limit (10/10) and stopped the container entirely — full outage, "No containers are running on server."
DECISION: Reverted Dockerfile CMD back to `prisma db push --accept-data-loss` (commit 197ab57) as an emergency fix. This was safe because the syntax error rejected the whole script before any statement executed — the DB schema was provably untouched, and `db push` doesn't consult `_prisma_migrations` at all, so it bypassed the stuck state entirely. Stripped the BOM from both migration files (`20260804120000_init` and `20260804130000_case_cascade_delete`) while fixing this. Since Coolify's restart-limit meant the container had fully exited (not just restarting), the fix required a manual "Redeploy" click in Coolify — pushing a new commit does not by itself resume a container that already hit its restart limit.
ALTERNATIVES CONSIDERED: Fix the BOM and immediately try `migrate deploy` again — rejected as the first move, because production's `_prisma_migrations` table now has a FAILED row for this migration; `migrate deploy` refuses to apply anything new until that's explicitly resolved (P3009), so simply fixing the file and redeploying with `migrate deploy` still in the CMD would have failed again immediately. Reverting to `db push` first (which ignores that table) was the fastest way to restore service; the migration-table cleanup is a separate, non-urgent follow-up (ISSUE-011).
RATIONALE: Restoring service takes priority over a "clean" migration history. `db push` still applies the same `onDelete: Cascade` change (confirmed in the deploy log: "Your database is now in sync with your Prisma schema"), so the actual CR-025 feature works correctly even while running on `db push`.
CONSEQUENCES: The app is back on `db push` (not `migrate deploy`) until ISSUE-011's cleanup is done: `migrate resolve --rolled-back 20260804130000_case_cascade_delete` via Coolify Terminal, then a separate commit switching Dockerfile CMD back to `migrate deploy`. Lesson for this project: any file generated via PowerShell `Out-File -Encoding utf8` and destined to be executed as SQL (not just diffed/read) needs its BOM stripped before commit, or should be generated with `-Encoding utf8NoBOM` / raw byte writes instead.
DECIDED BY: both

---

DATE: 2026-08-04
DECISION: Replace EditCaseForm's manual usage-rights checkboxes with the shared ApprovalSection widget (CR-026)
CONTEXT: The redigeringsskjema had its own bespoke "Bruksrettigheter" UI (editable checkboxes pre-lock, flat ✓/— list post-lock, plus a duplicated "Lås opp godkjenning" flow first added in CR-022) — entirely separate from the `ApprovalSection` ("Bruksgodkjenning") widget already used on the case detail page for the exact same underlying data. Produkteier pointed out that the empty/unchecked state on the edit page looked confusing before any approval had been requested, and asked that the edit page just reuse the same widget shown on the case page instead of maintaining a second, divergent UI.
DECISION: Removed the entire checkbox-based Bruksrettigheter UI (both editable and locked-view branches) and the duplicated unlock logic from `EditCaseForm.tsx`. It now renders `ApprovalSection` directly, the same component and same props shape used on `app/(app)/case/[id]/page.tsx`. `rediger/page.tsx` now fetches `owner.name` and passes `approverName`, `approverEmail`, `ownerName`, `token`, `appUrl` down to `EditCaseForm`, alongside the full `usageApprovals` history already fetched for CR-025's delete-warning dialog.
ALTERNATIVES CONSIDERED: Keep the checkbox editor for manual pre-fill and add `ApprovalSection` alongside it — explicitly rejected by produkteier in favor of the single-widget option, since it would keep two divergent UIs for the same data rather than resolving the duplication.
RATIONALE: One canonical widget for usage-rights status/management, rather than two implementations of unlock/status/lock logic that could drift out of sync with each other. Removes real code duplication (the CR-022 unlock widget now has exactly one implementation, inside `ApprovalSection`, instead of two).
CONSEQUENCES: The case owner can no longer pre-set usage rights on a case without going through the send-approval-request flow first — usage rights are now exclusively set via customer approval (or admin/owner override through unlock). Considered an intentional simplification, not a regression, per produkteier. No schema or API change — pure UI consolidation.
DECIDED BY: both

---

DATE: 2026-08-04
DECISION: Filopplasting lagres i delt Hetzner Object Storage under en dedikert prefiks, ikke en ny bucket eller et Coolify-volum (CR-027)
CONTEXT: Produkteier ba om filopplasting (bilder, PDF, Word) til "Materiale"-seksjonen, med en 100MB total-grense per case. Docker-containeren i Coolify er ephemeral (autodeploy skjer ved hver push, se CR-025/ISSUE-011-historikken) — alt skrevet til lokal disk uten et persistent volum forsvinner ved neste deploy, så lokal disk var uaktuelt uten videre Coolify-konfigurasjon. Produkteier hadde allerede satt opp én Hetzner Object Storage-instans (S3-kompatibel) for hele Coolify-instansen, delt med database-backup-jobben (`basbeta-backup`-bucketen).
DECISION: Gjenbruk den eksisterende bucketen, men med alle case-fil-objekter under en dedikert nøkkelprefiks (`effektbibliotek/case-materiale/{caseId}/...`) for å unngå kollisjon med backup-jobben eller andre basbeta-prosjekter. Bekreftet med produkteier at bucket sin 7-dagers retention-policy er spesifikt scopet til backup-jobben (ikke bucket-bredt), så case-filer er ikke i fare for automatisk sletting. Alternativet med en helt ny, dedikert bucket ble vurdert og avvist som unødvendig — én bucket med prefiks-basert segregering per prosjekt/formål er normal S3-praksis, ikke noe som trenger en egen bucket per bruksområde.
ALTERNATIVES CONSIDERED: Persistent Coolify-volum montert på app-ressursen — avvist, krever manuelt volum-oppsett i Coolify og er mindre portabelt enn S3-kompatibel lagring. Ny, dedikert bucket for effektbibliotek — avvist som unødvendig kompleksitet gitt at prefiks-segregering løser kollisjonsproblemet uten en ny ressurs å administrere.
RATIONALE: Minimerer nye infrastrukturressurser å drifte, gjenbruker allerede fungerende og betalt-for infrastruktur, konsistent med resten av basbeta sin "selvhostet/europeisk"-tilnærming.
CONSEQUENCES: Krever `S3_ENDPOINT`/`S3_REGION`/`S3_BUCKET`/`S3_ACCESS_KEY_ID`/`S3_SECRET_ACCESS_KEY` satt i Coolify før funksjonen virker i produksjon. Sikkerhetsnotat: under avklaringen delte produkteier et skjermbilde av Coolify sin S3-Storage-konfigurasjon med synlige (test-)access/secret-nøkler i klartekst i denne chatten — produkteier bekreftet disse allerede er revokert, ingen handling nødvendig, men verdt å huske: creds limt inn i en chat bør behandles som eksponert uavhengig av kanal.
DECIDED BY: both

---

DATE: 2026-08-04
DECISION: `migrate resolve --rolled-back` er utilstrekkelig når `db push` allerede har anvendt migreringens endring — bruk `--applied` per migrering basert på faktisk DB-tilstand, ikke et blanket mønster (ISSUE-011, andre nedetid)
CONTEXT: Etter at CR-027 ble bekreftet fungerende i produksjon, startet oppryddingen av ISSUE-011 (bytte fra `db push` tilbake til `migrate deploy`). Produkteier kjørte `migrate resolve --rolled-back 20260804130000_case_cascade_delete` (riktig — denne migreringens SQL ble aldri faktisk kjørt, kun avvist av en BOM-syntaksfeil). Dockerfile CMD ble byttet til `migrate deploy` og pushet. Deploy-loggen viste at cascade-delete-migreringen nå ble anvendt korrekt, men den ANDRE ventende migreringen, `20260804140000_case_file` (CR-027, generert BOM-fritt og aldri tidligere forsøkt av `migrate deploy`), feilet med `Error: P3009` — fordi `CaseFile`-tabellen allerede fantes i databasen. Årsak: Dockerfile kjørte fortsatt `db push --accept-data-loss` gjennom hele CR-027-utviklingen, så `db push` hadde allerede skapt `CaseFile`-tabellen i produksjon lenge før denne oppryddingen startet — migreringsfilens `CREATE TABLE` var dermed alltid dømt til å kollidere, uavhengig av cascade-delete-migreringens tilstand. Containeren crash-loopet til restart-grensen (10/10) igjen — andre reelle nedetid med samme grunnmønster som det opprinnelige ISSUE-011-hendelsen (2026-08-04, BOM-feilen).
DECISION: Emergency-fix: Dockerfile CMD revertert til `db push --accept-data-loss` (commit a4490c7), manuell "Redeploy" i Coolify, bekreftet stabil. Korrekt fremgangsmåte for å faktisk fullføre opprydding: kjør `migrate resolve --applied 20260804140000_case_file` (ikke `--rolled-back`) via Coolify Terminal, siden denne migreringens tilsiktede endring allerede er reflektert i databasen — den mangler bare riktig bokføring i `_prisma_migrations`. Deretter kan Dockerfile CMD byttes til `migrate deploy` på nytt.
ALTERNATIVES CONSIDERED: Anta at begge ventende migreringer kunne resolves med samme kommando (`--rolled-back` for begge) — dette var den implisitte antakelsen i forrige økts ISSUE-011-plan, og var feil for `20260804140000_case_file` fordi den (i motsetning til cascade-delete-migreringen) faktisk HAR blitt anvendt i databasen, bare via `db push` i stedet for via denne migreringsfilen.
RATIONALE: `migrate resolve` sine to flagg betyr strukturelt forskjellige ting — `--rolled-back` sier "denne migreringen ble aldri anvendt, fjern den fra historikken slik at den kan kjøres på nytt"; `--applied` sier "denne migreringens endring finnes allerede i databasen, marker den som gjort uten å kjøre den". Å velge feil flagg for en migrering hvis SQL faktisk ville kollidere med eksisterende skjema er nøyaktig den feilen som skjedde her. Riktig fremgangsmåte er å vurdere HVER ventende migrering individuelt mot faktisk DB-tilstand, ikke anta at alle ventende migreringer er i samme tilstand.
CONSEQUENCES: Generell lærdom for dette prosjektet: så lenge Dockerfile kjører `db push` som fallback, vil ENHVER statisk generert migreringsfil for en skjemaendring som allerede er live (via `db push`) trenge `--applied`, ikke `--rolled-back`, når `migrate deploy` til slutt skal tas i bruk. Kun migreringer hvis SQL aldri faktisk kjørte (som BOM-avviste `case_cascade_delete`) skal resolves med `--rolled-back`. Denne asymmetrien bør sjekkes eksplisitt for HVER migreringsfil før neste `migrate deploy`-forsøk, ikke anta ensartet tilstand.
DECIDED BY: both
