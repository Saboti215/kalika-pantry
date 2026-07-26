# Kalika Pantry

Eine minimalistische, auf Geschwindigkeit optimierte Inventur-PWA für den
Haushaltsvorrat. Der Startbildschirm *ist* der Barcode-Scanner - scannen,
Bestand mit einem Tap anpassen, fertig.

## Tech-Stack

- Vue 3 (`<script setup>`) + Vite, Tailwind CSS
- `html5-qrcode` für kamerabasiertes Barcode-Scannen
- Supabase (Postgres, Auth, Row Level Security) als Backend
- Open Food Facts API als Fallback-Lookup für unbekannte EANs
- `vite-plugin-pwa` für die PWA-Manifest/Service-Worker-Erzeugung
- Gehostet auf GitHub Pages (kein eigener Server, Client spricht direkt mit Supabase)

## 1. Supabase-Projekt einrichten

1. Auf [supabase.com](https://supabase.com) einloggen und **New Project** anlegen
   (Name z. B. `kalika-pantry`, Region nah am eigenen Standort, ein DB-Passwort setzen).
2. Warten bis das Projekt bereit ist, dann im Dashboard zu **SQL Editor** gehen.
3. Den kompletten Inhalt von [`supabase/schema.sql`](./supabase/schema.sql) einfügen
   und ausführen (**Run**). Das legt alle Tabellen, RLS-Policies und RPC-Funktionen an.
   Das Skript ist idempotent - erneutes Ausführen bei Änderungen ist unproblematisch.
4. Unter **Authentication → Providers** sicherstellen, dass **Email** aktiviert ist.
   Für Magic-Link-Login reicht die Standardkonfiguration.
5. Unter **Authentication → URL Configuration**:
   - **Site URL**: die spätere GitHub-Pages-URL eintragen, z. B.
     `https://<dein-github-user>.github.io/kalika-pantry/`
   - **Redirect URLs**: dieselbe URL zusätzlich hinzufügen (und für lokale Entwicklung
     `http://localhost:5173/` ergänzen).
6. Unter **Settings → API Keys** die beiden benötigten Werte kopieren:
   - **Project URL**
   - **Publishable key** (`sb_publishable_...`) - NICHT den `secret`-Key (`sb_secret_...`) verwenden!

   Hinweis: Neuere Supabase-Projekte zeigen unter API Keys standardmäßig das
   neue Key-Format (`sb_publishable_...` / `sb_secret_...`). Falls dein Projekt
   noch die alten Legacy-Keys (`anon` / `service_role`, JWT-Format) anzeigt,
   kannst du im API-Keys-Tab auf die neuen Keys umstellen ("Create new API keys").

## 2. Lokale Umgebung konfigurieren

```bash
cp .env.example .env
```

Dann in `.env` die beiden Werte aus Schritt 1.6 eintragen:

```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

`.env` ist in `.gitignore` und wird nie committet. Der Publishable-Key ist
zwar öffentlich lesbar (er landet im Client-Bundle), das ist bei Supabase aber
so vorgesehen - der eigentliche Datenschutz läuft über die Row-Level-Security-
Policies aus `schema.sql`, nicht über die Geheimhaltung des Keys.

## 3. Entwickeln

```bash
npm install
npm run dev
```

Die Kamera benötigt einen "secure context" (HTTPS oder `localhost`) - lokal auf
`http://localhost:5173` funktioniert das ohne weiteres Zutun. Zum Testen auf
einem echten Handy im selben Netzwerk: `npm run dev -- --host` und per HTTPS-
Tunnel (z. B. `ngrok`) erreichbar machen, da mobile Browser die Kamera sonst
blockieren.

## 4. Deployment (GitHub Pages)

Der Workflow unter `.github/workflows/deploy.yml` baut das Projekt bei jedem
Push auf `main` und deployt es nach GitHub Pages. Dafür einmalig:

1. Im Repo unter **Settings → Pages**: Source auf **GitHub Actions** stellen.
2. Unter **Settings → Secrets and variables → Actions** zwei Repository-Secrets anlegen:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
3. Push nach `main` - der Workflow baut und deployt automatisch.

Die Basis-URL ist in `vite.config.js` fest auf `/kalika-pantry/` gesetzt
(GitHub-Pages-Projekt-Site). Bei einem anderen Repo-Namen dort anpassen und
zusätzlich die Supabase-Redirect-URLs aktualisieren.

## Datenmodell (Kurzüberblick)

| Tabelle             | Zweck                                                        |
|---------------------|---------------------------------------------------------------|
| `households`        | Ein Haushalt, geteilt zwischen mehreren Nutzern                |
| `household_members`  | Wer gehört zu welchem Haushalt (Rolle `owner`/`member`)        |
| `locations`          | Lagerorte eines Haushalts (Kühlschrank, Vorratsschrank, ...)   |
| `products`           | Bekannte Produkte je Haushalt (EAN, Name, Bild)                |
| `stock`              | Aktueller Bestand je Produkt + Lagerort (Zeile bleibt bei 0 erhalten) |

Details zu RLS-Policies und RPCs (`create_household`, `join_household_by_code`,
`increment_stock`) stehen kommentiert in `supabase/schema.sql`.
