# KRMF web companion — implementation status

Updated 2026-09-21. Preview/test data only; no production deployment or real-data migration authorized at this stage.

## Verified inspection
- Read the full README including the 2026-09-20 widget provisioning repair. Preserve installed `/Applications/KRMF.app`, local SQLite, native widget bridge, identifiers, signing and provisioning.
- Existing app: Svelte 5 / TypeScript / Vite / Tauri 2; 13 SQLite migrations. Daily schedule rows and daily tasks share `day_planner_lines`; daily notes, weekly notes/tasks/day copies, habits/check-ins are separate tables.
- Browser views currently depend on Tauri SQL and explicitly disable editing outside Tauri. Mobile companion therefore uses a separate entry point with shared pure model functions and artwork.
- Authenticated Safari access to WordPress and GreenGeeks exists. WordPress Site Health Info reports PHP 8.3.33, LiteSpeed, MariaDB 11.4.13, HTTPS home/site `https://www.sacmaca.com`, pretty permalinks, registrations disabled, one user, production environment.
- Site Health Status reported potentially public debug logging and an HTTPS warning; Info reports HTTPS enabled. Investigate these before private production use. No website settings changed.
- No Git repository exists here. No additional dependencies installed.

## Architecture
Separate `/krmf/` app route, leaving WordPress pages/theme/navigation intact; calendar accessible by direct companion link. Build static Svelte assets locally. Dedicated WordPress plugin serves app and authenticated REST endpoints, uses existing login cookies + REST nonce, dedicated per-user MariaDB storage. Never send database credentials or application passwords to browser code.

Offline-first browser storage, durable pending changes, version checks, retained tombstones, explicit conflict resolution. Mac retains SQLite; sync must be opt-in and apply remote changes atomically, preserving widget notification path. Initial testing uses isolated synthetic databases only.

## Stages
1. Inspection complete; authenticated hosting settings verified read-only.
2. Architecture selected as above, no paid/external service needed.
3. Mobile preview complete locally with isolated IndexedDB test data. It includes responsive daily planner, daily/weekly to-dos, habits, calendar link/view, light/dark themes, install manifest, static-only service-worker cache, offline shell, export, deletion restore, and sign-out cleanup.
4. Synchronization prototype complete and tested. WordPress plugin uses private authenticated REST, per-user storage, CAS versions, idempotent mutation receipts, tombstones, retained history, no-cache/private headers, and an explicit conflict screen. Opt-in Mac bridge backs up a test database, keeps SQLite authoritative locally, applies remote batches atomically, and does not alter widget infrastructure. It is deliberately not wired into the installed app yet.
5. Production: not deployed. Must review preview, verify auth/cache behavior on staging, back up real data, and explicitly approve production migration first.

## Rollback
- Deactivating the plugin immediately disables `/krmf/` and its sync endpoint while preserving its companion records.
- Uninstalling the plugin removes only `wp_krmf_notebooks` (using the site's actual prefix), the `krmf_owner` option, and the `krmf_companion` role. It does not touch posts, pages, users, existing WordPress tables, Mac SQLite, or widgets.
- Before production installation, create a cPanel full-account backup and retain a downloaded copy until production verification is complete.

## Verification performed
- `npm run check`: clean.
- Full existing `npm test`: 40/40 passing, including 10 new companion protocol/SQLite tests.
- PHP 8.3 syntax parse and pure protocol test: pass.
- End-to-end PHP protocol ↔ browser sync engine ↔ all-migrations SQLite: pass for Mac→web, web→Mac, concurrent offline edits, explicit resolution, lost response replay, delete, restore, and revision history.
- Local preview opened successfully and saved synthetic records only. No production WordPress files, settings, users, database rows, Mac data, application bundle, or widgets changed.

## Review artifacts
- `dist-companion/`: current production-candidate assets used inside the staging plugin.
- `artifacts/krmf-companion-preview.zip`: preview files for review only.
- `artifacts/krmf-companion-wordpress-staging.zip`: installable staging plugin candidate; do not activate on production before manual staging checks.
- `wordpress/krmf-companion/`: plugin source and built web assets.

## Required manual staging checks
1. Use a staging clone or protected staging site. Upload and activate the staging ZIP, then set the allowed owner under Settings → KRMF Companion.
2. Confirm logged-out `/krmf/` redirects to login, the allowed account opens it, and an unauthorized account gets 403.
3. On an iPhone, add `/krmf/` to the Home Screen; make a test edit online, then in Airplane Mode reload and make another edit. Reconnect and confirm Sync completes.
4. Use only a disposable copy of `krmf.db` for the first Mac bridge test. Review the generated backup and conflicts before authorizing installed-app integration or real-data migration.

## Sources
- https://www.greengeeks.com/support/article/supported-software/
- https://developer.wordpress.org/rest-api/using-the-rest-api/authentication/
- https://developer.wordpress.org/advanced-administration/security/application-passwords/
