# KRMF desktop widgets

Two native SwiftUI/WidgetKit widgets embedded in KRMF.app: Today & this week,
and Today's schedule. Large and extra-large families are declared; macOS
controls the sizes offered in its widget gallery.

## Build

Requires full Xcode 26.3 (compatible with Sequoia 15.6.1), Rust/Node,
and the Apple Development identity for team 56PQ4C62FB.

1. `CARGO_NET_OFFLINE=true npm run tauri build -- --bundles app`
2. `bash scripts/build-widgets.sh`
3. Copy the resulting KRMF.app bundle to /Applications and launch it.
4. Right-click the desktop, Edit Widgets, search KRMF.

The second step is required for every app update. It compiles the native
extension and bridge, embeds the resources, and signs inside-out. Do not
replace its signatures with an ad-hoc deep signature. Override the signing
identity with KRMF_SIGN_IDENTITY; changing teams requires updating the group
identifier in Shared.swift and the build script.

## Data and privacy

SQLite remains the source of truth in KRMF's original app-support folder.
After a successful database write, the app exports a debounced read-only JSON
snapshot to its team-scoped app group through a signed native helper. The
helper writes atomically and requests WidgetKit timeline reloads only when
the snapshot changes. Errors retry and do not interrupt normal database saves.
No original user records are moved or modified by widget synchronization.

The snapshot includes all supported dates, expanded recurring schedules,
merged manual slots, daily tasks, weekly-only tasks, and important/all-day
events. Widget timelines cover midnight rollovers when KRMF is closed. macOS
controls refresh timing; it is not an instant-update guarantee. The snapshot
uses the timezone of the last running app; reopen KRMF after travelling.

Widgets are read-only; click to open KRMF. Overview lists prioritize unfinished
tasks, cap visible rows, and report overflow. The hourly view splits at 3 PM,
clips entries to the displayed hours, and assigns separate lanes to actual
overlaps. Theme follows the last selected KRMF theme; macOS may tint widgets
when they are inactive, according to the user's desktop widget settings.

Only the extension is sandboxed. Both the host and helper carry the same
team-scoped app-group entitlement. No networking or arbitrary filesystem
access is granted to the extension.
