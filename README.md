# KRMF

Mac-first lifestyle app with Calendar, Planner, To-do, and Habit Tracker modules.
Tauri 2 provides the desktop shell, Svelte 5 + TypeScript + Vite the UI,
and Rust + the official Tauri SQL plugin a local SQLite database.
Calendar events belong to KRMF. There are no external calendar integrations.

## Development

Requires Node.js 24 LTS, stable Rust/Cargo, and Apple Command Line Tools
(`xcode-select --install`). Complete Apple's installer before building the app.

A project-local Node installation, if present, can be enabled in your terminal:

```sh
export PATH="$PWD/.tools/node-v24.21.0-darwin-arm64/bin:$HOME/.cargo/bin:$PATH"
npm install
npm run tauri dev
```

```sh
npm run dev          # Browser UI preview; SQLite requires the desktop app
npm run check        # Svelte + TypeScript validation
npm run build        # Validate and build the frontend
npm run tauri build  # Build macOS app and DMG (unsigned development build)
```

## Structure

- `src/modules/`: Calendar views, Planner and To-do foundations, and a working Habit Tracker.
- `src/lib/database.ts`: Shared SQLite connection, opened only in Tauri.
- `src-tauri/src/lib.rs`: Rust entry point and versioned database migrations.
- `src-tauri/migrations/`: Schema for KRMF events, tasks, and planner entries.
- `src-tauri/capabilities/`: Desktop SQL read/write permissions for habit tracking.

The database is `krmf.db` in Tauri's app configuration directory for
`com.krmf.app`. Migrations are applied by the SQL plugin on desktop startup.
The opening screen is a school-themed 3×3 menu with four large, shaded pixel-art
objects and five invisible empty positions. Icons float directly over a softly
blurred, generated classroom background with a green chalkboard. The image is
`public/art/classroom-indie.png`; its generation prompt is saved alongside it. Icons animate on hover and keyboard focus,
and respect reduced-motion preferences. Habit Tracker supports adding habits
and toggling check-ins for the last seven local calendar days. Habits and
check-ins persist in SQLite through migration 002. Planner and To-do remain starter views. No sample personal records are inserted.

Timed event timestamps must be normalized to UTC ISO 8601; all-day dates use
YYYY-MM-DD and an exclusive end date. Date validation belongs in the future
module write APIs. The application identifier is a development default and
should be finalized before distribution.

## Calendar

The calendar covers September 2026 through December 2027, with Monday-first
weekday columns. Monthly view lists saved events on each date; clicking a date
opens its day page. Yearly view displays the four supported months of 2026 or all
twelve months of 2027. Hovering or keyboard-focusing a date shows its important
events in the right panel. Bottom arrows navigate within the supported range.

The bottom-left plus opens a date/name/color form. Important events are all-day,
saved in SQLite, and visible in all three views. The five allowed colors are red,
purple, green, blue, and yellow; multiple colors share a segmented ring. Existing
calendar events are read as well, including multi-day events. Regular-event
creation, editing, and deletion are not part of this increment.

The translucent calendar uses a bundled Pixelify Sans font; its SIL Open Font
License is in `public/fonts/OFL-PixelifySans.txt`. No font network request is needed.
Run `npm test` for date/grid/event tests and `python3 tests/calendar_schema.py`
for SQLite migration and persistence tests.

### Inline day planner

Each day has 24 half-hour slots (8 AM–7:30 PM), 14 to-do rows, and 8 note
lines. All text fields accept up to 20 characters directly in the page.
To-do checkboxes work independently of their names, including empty names.
Edits autosave through a serialized SQLite write queue; the page shows saving
status and an inline retry if saving fails. Entries are isolated by date.
Schedule lines also appear in the monthly calendar. Existing important events
remain visible above the planner.

Run `python3 tests/day_planner_schema.py` to check blank-item toggles, renaming,
clearing, per-day isolation, persisted values, and input limits.

### Weekly timetable

The Weekly tab shows seven Monday-first days, a scrollable 24-hour timeline,
and the existing handwritten daily slots alongside timed events. Click a date
header or event block to open that day's planner. Click an empty time or Add
event to enter a name (20 characters), date, start/end time, and color. Optional
weekly repetition runs on the first date's weekday through an inclusive end date.
Time windows are within one day; the end must follow the start.

Series are stored once in SQLite and expanded at the Mac's local wall-clock time,
so a 10 AM class stays at 10 AM across daylight-saving changes. Month view and
all matching half-hour day slots display the occurrences too. Handwritten slot
text remains independently editable. Day pages extend their visible hours when
needed for early/late events. Existing 8 AM-based slot indices are preserved.

Run `npm test` and `python3 tests/weekly_schema.py` for recurrence, overlap,
slot integration, migration, and persistence tests.


Weekly activity blocks now open the timed-event form for editing; day headers
still open the day planner. Editing a recurring activity updates the whole
series, as indicated in the form. Editing a handwritten daily block converts it
to a timed event and removes only its original matching slots in the same SQLite
statement. Unrelated slots remain intact. Windows may end at midnight. Monthly
view shows important/all-day events only, without timed activities or slot text.

## Main-menu Planner

Planner is a separate Monday–Sunday weekly sheet covering the same supported
calendar dates. Its bottom pixel arrows switch weeks. Day headings open that
calendar day, with a return button that restores the planner week.

Each day has an unlined, resizable multiline text box. Calendar to-do names are
copied into it once per calendar row; edits and deletions in the copy never change
the calendar. Newly populated calendar rows are appended on the next visit,
without restoring previously removed text. There is no short character limit.

The sidebar gathers that week's calendar to-dos. Their checkbox state syncs with
the daily calendar. Additional weekly tasks are stored independently and never
assigned to a day. Notes are freeform and saved separately per week. There is no
goals section. Changes autosave locally with an inline retry for write failures.

Validation: `npm test` and `python3 tests/planner_schema.py`.


## Module organization

The main menu now has three modules: Calendar, Planner, and Habit Tracker.
Planner contains both Weekly planner and Daily planner tabs. Calendar date
clicks open that date directly in Planner. Daily schedules, notes, checkboxes,
weekly copies, and event integration use the existing database records; this
move does not reset or migrate personal data. The separate To-do menu entry
has been removed; daily and weekly to-do lists remain inside Planner.


# KRMF — Codex Instructions Related to Widget Work

## IMPORTANT: READ BEFORE MODIFYING ANYTHING

KRMF is a Tauri macOS application with a native WidgetKit extension.

The widget infrastructure is already working.

The user may ask for VISUAL or FUNCTIONAL changes to the widgets. When that happens, your job is not merely to edit Swift code. You must make the requested change, build the actual widget extension, embed it into KRMF, install the updated application, ensure macOS is using the installed extension, and verify the result as far as possible.

DO NOT redesign, replace, simplify, "clean up", or recreate the widget infrastructure unless the user explicitly asks for infrastructure work.

The current architecture took significant debugging to establish and is known to work.


# 1. CANONICAL INSTALLED APPLICATION

The canonical user-facing application is:

    /Applications/KRMF.app

This is the application the user should normally launch.

There may also be KRMF copies under:

    ~/Desktop/KRMF/src-tauri/target/
    ~/Desktop/KRMFProvisioning/
    ~/Library/Developer/Xcode/DerivedData/
    /tmp/KRMFWidgetBuild/

These are BUILD/DEVELOPMENT copies.

DO NOT tell the user to use those copies as their normal KRMF application.

DO NOT assume that successfully building a copy under `target/` means the installed `/Applications/KRMF.app` has been updated.

After a successful production widget build, the new app must be installed into `/Applications/KRMF.app` before considering the task complete.


# 2. PROJECT LOCATIONS

Main Tauri project:

    ~/Desktop/KRMF

Xcode provisioning/widget project:

    ~/Desktop/KRMFProvisioning/KRMFProvisioning.xcodeproj

The production widget extension is built by the Xcode project.

The currently compiled real widget implementation is:

    ~/Desktop/KRMFProvisioning/widgets/Widgets 2.swift

Related widget source includes:

    ~/Desktop/KRMFProvisioning/widgets/Shared.swift
    ~/Desktop/KRMFProvisioning/widgets/widgetsBundle.swift

The widget target is:

    widgetsExtension

The bundle contains:

    OverviewWidget()
    ScheduleWidget()

The old lowercase `widgets.swift` Hello World implementation is NOT the production widget implementation and should not be enabled or substituted.


# 3. IDENTIFIERS — DO NOT CHANGE

Main application bundle identifier:

    com.krmf.app

Widget extension bundle identifier:

    com.krmf.app.widgets

Apple Development Team:

    56PQ4C62FB

App Group:

    group.56PQ4C62FB.com.krmf.widgets

Signing identity:

    Apple Development: efecanshenturk@icloud.com (9STUX3Y94Y)

Do not change any of these while implementing ordinary widget visual or functional changes.


# 4. WORKING WIDGET ARCHITECTURE — DO NOT REPLACE

The working architecture is:

KRMF/Tauri
    ↓
Rust command publish_widgets
    ↓
main signed KRMF process obtains App Group container
    ↓
snapshot.json
    ↓
WidgetKit extension reads snapshot
    ↓
WidgetCenter.shared.reloadAllTimelines()
    ↓
widget updates

The main application writes:

    snapshot.json

into:

    group.56PQ4C62FB.com.krmf.widgets

The host application's native bridge obtains the App Group location.

Relevant files include:

    src-tauri/src/widgets.rs
    src-tauri/src/widget_bridge.m
    src-tauri/src/widget_reload.swift
    src-tauri/build.rs
    src-tauri/Entitlements.plist

The application explicitly calls:

    WidgetCenter.shared.reloadAllTimelines()

after writing a changed snapshot.

THIS WORKS.

Do not replace this mechanism when asked for widget UI or ordinary widget functionality changes.


# 5. NEVER REINTRODUCE THE OLD BROKEN ARCHITECTURE

DO NOT:

- manually construct a `.appex`
- compile the widget extension using standalone `swiftc`
- use the old loose `KRMFWidgetBridge` executable
- restore `scripts/build-widgets.sh.backup`
- launch the `.appex` executable directly
- use direct `.appex` execution as a widget test
- replace the Xcode-built extension with a hand-built extension
- remove WidgetCenter reload calls
- move snapshot writing back into an external helper
- change App Group identifiers
- add `com.apple.security.app-sandbox = true` to the KRMF host app
- use ad-hoc signing for the final installed application
- transplant a Cargo executable manually into another app bundle
- modify provisioning/signing because a UI change does not appear
- recreate the widget target because macOS is caching an old widget
- assume Xcode's Run/Debug behavior is a valid test of WidgetKit registration

An earlier manually assembled widget extension failed with XPC/descriptor errors.

An earlier loose bridge executable failed provisioning/taskgated checks.

Those approaches are obsolete.


# 6. HOST ENTITLEMENTS

The host application entitlement is intentionally minimal.

The important entitlement is:

    com.apple.security.application-groups
        group.56PQ4C62FB.com.krmf.widgets

Do NOT enable App Sandbox on the host as part of ordinary widget work.

The widget extension itself is provisioned/signed through Xcode.


# 7. WIDGET SOURCE OF TRUTH

IMPORTANT:

The extension built by `scripts/build-widgets.sh` comes from the Xcode project:

    ~/Desktop/KRMFProvisioning

In particular, current production widget UI code is compiled from:

    ~/Desktop/KRMFProvisioning/widgets/Widgets 2.swift

Do not edit only another copy of `Widgets.swift` and assume it will reach the production widget.

Before building, verify that the requested change actually exists in the source compiled by the `widgetsExtension` target.

The build log should show compilation of files similar to:

    /Users/efecan/Desktop/KRMFProvisioning/widgets/Shared.swift
    /Users/efecan/Desktop/KRMFProvisioning/widgets/Widgets 2.swift
    /Users/efecan/Desktop/KRMFProvisioning/widgets/widgetsBundle.swift


# 8. CURRENT WIDGETS

Current widgets:

## Overview

Display name:

    KRMF · Today & this week

Widget kind:

    KRMFOverview

Supported families:

    .systemLarge
    .systemExtraLarge

It contains:

    TODAY · TO DO
    TODAY · EVENTS
    WEEK · TO DO
    WEEK · EVENTS

Current intended item limits:

    Extra Large: 10 per section
    Large: 6 per section

Extra Large uses a somewhat more compact row presentation so that more items fit.

Do not accidentally restore the previous limits:

    Extra Large: 5
    Large: 4


## Schedule

Display name:

    KRMF · Today's schedule

Widget kind:

    KRMFSchedule

Supported families:

    .systemLarge
    .systemExtraLarge

The schedule is timeline-based.

It does NOT use the Overview widget's item-count limit.

Do not confuse Overview event lists with Schedule activities.


# 9. HOW TO HANDLE A VISUAL WIDGET REQUEST

Examples:

- change font size
- change spacing
- change colors
- display more tasks
- rearrange sections
- change headings
- modify event blocks
- change borders/backgrounds
- improve Extra Large layout

For these requests:

1. Locate the SwiftUI view responsible for the requested appearance.
2. Make the smallest reasonable SwiftUI change.
3. Do NOT modify the snapshot bridge, App Group, entitlements, bundle identifiers, signing, or provisioning.
4. Ensure the edit is made in the source compiled by `widgetsExtension`.
5. Build the widget.
6. Embed it.
7. Install the resulting app into `/Applications/KRMF.app`.
8. Ensure macOS is registered to the installed extension rather than stale development copies.
9. Launch `/Applications/KRMF.app`.
10. Verify the result.

Do not stop after step 2.


# 10. HOW TO HANDLE A FUNCTIONAL WIDGET REQUEST

Examples:

- display another field from KRMF
- change task sorting
- filter completed tasks
- display different dates
- add another section
- change which events appear
- expose new planner information in a widget

First determine whether the information already exists in `snapshot.json`.

If it already exists:

    modify only the WidgetKit data interpretation/UI as necessary.

If it does NOT exist:

    extend the existing snapshot data model/publishing path minimally.

Do not create a second communication system.

The existing architecture remains:

    KRMF → snapshot.json → WidgetKit

Preserve compatibility with existing snapshot data when reasonably possible.


# 11. NORMAL PRODUCTION BUILD

From:

    ~/Desktop/KRMF

Use the project's local Node:

    export PATH="$HOME/Desktop/KRMF/.tools/node-v24.21.0-darwin-arm64/bin:$PATH"

Set signing:

    export APPLE_SIGNING_IDENTITY="Apple Development: efecanshenturk@icloud.com (9STUX3Y94Y)"

For a full application build:

    npm run tauri build

Then build/embed the production WidgetKit extension:

    ./scripts/build-widgets.sh

The widget script uses Xcode to build `widgetsExtension`, embeds:

    widgetsExtension.appex

into:

    KRMF.app/Contents/PlugIns/

and re-signs the outer application afterward.

A successful widget build should include:

    ** BUILD SUCCEEDED **
    Widget embedded successfully.
    KRMF widget build complete.

Do not treat the build as installed yet.


# 12. VERIFY THE BUILT APPLICATION BEFORE INSTALLATION

Expected built application:

    ~/Desktop/KRMF/src-tauri/target/release/bundle/macos/KRMF.app

Verify that the widget exists:

    ls -l "$HOME/Desktop/KRMF/src-tauri/target/release/bundle/macos/KRMF.app/Contents/PlugIns/widgetsExtension.appex/Contents/MacOS/widgetsExtension"

Verify the bundle signature:

    codesign --verify --deep --strict --verbose=2 \
      "$HOME/Desktop/KRMF/src-tauri/target/release/bundle/macos/KRMF.app"

Do not install a failed/unsigned build over the known-good application.


# 13. INSTALL THE NEW BUILD

After successful verification:

    pkill -x krmf 2>/dev/null || true

    rm -rf /Applications/KRMF.app

    cp -R \
      "$HOME/Desktop/KRMF/src-tauri/target/release/bundle/macos/KRMF.app" \
      /Applications/KRMF.app

Then verify that the INSTALLED application contains the widget:

    ls -l \
      /Applications/KRMF.app/Contents/PlugIns/widgetsExtension.appex/Contents/MacOS/widgetsExtension

This check is important.

There was previously a situation where the build contained the new widget but `/Applications/KRMF.app` did not.

Do not assume installation succeeded merely because the build succeeded.


# 14. DUPLICATE WIDGET REGISTRATIONS — IMPORTANT

macOS PluginKit may register multiple copies of:

    com.krmf.app.widgets

This has already happened.

Copies were registered from:

    /Applications/KRMF.app/...
    /private/tmp/KRMFWidgetBuild/...
    ~/Desktop/KRMF/src-tauri/target/...
    ~/Library/Developer/Xcode/DerivedData/...

This caused an OLD widget UI to remain active even while live data from the NEW KRMF application was updating.

SYMPTOM:

- KRMF writes fresh snapshot data
- widget content changes live
- but visual/layout code remains old

For example, the new Overview source specified 10 items but the desktop widget continued displaying exactly 5.

Do NOT respond to this symptom by changing SwiftUI code, App Groups, signing, or the snapshot architecture.

First inspect PluginKit registrations:

    pluginkit -m -A -D -v | grep "com.krmf.app.widgets"

For normal use, the desired registration is:

    /Applications/KRMF.app/Contents/PlugIns/widgetsExtension.appex

If stale duplicate development/build registrations are present, unregister the specific stale paths.

Typical stale paths may include:

    /private/tmp/KRMFWidgetBuild/Build/Products/Release/KRMFProvisioning.app/Contents/PlugIns/widgetsExtension.appex

    $HOME/Desktop/KRMF/src-tauri/target/release/bundle/macos/KRMF.app/Contents/PlugIns/widgetsExtension.appex

    $HOME/Library/Developer/Xcode/DerivedData/KRMFProvisioning-*/Build/Products/Debug/KRMFProvisioning.app/Contents/PlugIns/widgetsExtension.appex

Do not delete project files merely to unregister them.

Use `pluginkit -r` on the specific extension path.

If necessary, unregister the installed extension too and then register only the installed copy:

    pluginkit -a "/Applications/KRMF.app/Contents/PlugIns/widgetsExtension.appex"

Then verify again:

    pluginkit -m -A -D -v | grep "com.krmf.app.widgets"

The target clean state is ONE relevant KRMF widget registration pointing to:

    /Applications/KRMF.app/Contents/PlugIns/widgetsExtension.appex

Do not blindly unregister unrelated extensions.


# 15. REFRESHING WIDGETKIT AFTER INSTALLATION

After installing/registering a new widget extension, macOS may retain an old widget process.

If the source is correct, the build is correct, the installed `.appex` is correct, and PluginKit registration is correct, then it is reasonable to restart WidgetKit-related processes:

    killall WidgetExtension 2>/dev/null || true
    killall chronod 2>/dev/null || true

Then launch the canonical application:

    /Applications/KRMF.app/Contents/MacOS/krmf

If necessary, remove the old KRMF widget from the desktop and add it again through Edit Widgets.

Do this only AFTER confirming build/install/registration state.

Do not use caching as an excuse to rebuild infrastructure.


# 16. LIVE WIDGET UPDATE DIAGNOSTICS

For debugging, launch the canonical installed application directly:

    /Applications/KRMF.app/Contents/MacOS/krmf

This allows KRMF's widget publishing messages to remain visible in Terminal.

Expected messages include:

    KRMF_WIDGET: wrote snapshot to .../snapshot.json
    KRMF_WIDGET: requested WidgetKit reload

or:

    KRMF_WIDGET: snapshot unchanged

If these messages appear and widget DATA updates, the bridge is working.

If widget data updates but a new VISUAL change does not appear, suspect:

1. wrong Swift source edited
2. old app installed
3. old `.appex` embedded
4. duplicate PluginKit registrations
5. stale WidgetKit process

Do NOT immediately suspect the App Group or snapshot bridge.


# 17. XCODE DEBUGGING WARNING

Do not use Xcode Run behavior as the definitive widget test.

The extension has previously stopped under Xcode around ExtensionFoundation with:

    brk #0x1

while the normally installed WidgetKit extension worked correctly.

The real test is:

    properly built extension
    + properly embedded extension
    + signed host
    + installed /Applications/KRMF.app
    + correct PluginKit registration
    + widget added through macOS


# 18. SIGNING RULES

The final KRMF application must use the Apple Development identity:

    Apple Development: efecanshenturk@icloud.com (9STUX3Y94Y)

Team:

    56PQ4C62FB

After embedding the `.appex`, the outer KRMF application must be re-signed.

`scripts/build-widgets.sh` currently performs this.

Do not remove that step.

Embedding a new `.appex` AFTER signing the host without re-signing the host invalidates the outer bundle seal.


# 19. DMG WARNING

The Tauri DMG may be generated BEFORE the post-build widget embedding step.

Therefore, do NOT assume:

    src-tauri/target/release/bundle/dmg/KRMF_0.1.0_aarch64.dmg

contains the newly embedded widget simply because the `.app` does.

For local development/testing, use the verified `.app` build and install it into `/Applications`.

Do not modify the DMG workflow unless the user specifically asks to produce a distributable installer.


# 20. RESOURCES

Widget resources may include:

    PixelifySans.ttf
    krmf-logo
    classroom-indie

Do not remove resources or change resource membership unless required by the requested design.


# 21. CHANGE SCOPE RULE

When the user asks:

    "make the widget show 10 tasks"

that means:

    change the relevant task-display logic and presentation,
    build it,
    install it,
    verify macOS is using it.

It does NOT mean:

    rewrite the bridge,
    recreate the extension,
    change signing,
    change App Groups,
    change bundle identifiers,
    refactor unrelated Rust,
    replace WidgetKit architecture.

When the user asks:

    "make the text smaller"

change the text/layout and deploy it.

Do not use a visual request as an opportunity for architectural refactoring.


# 22. VERIFY REQUESTED BEHAVIOR, NOT JUST BUILD SUCCESS

A successful compiler exit is not sufficient.

For each widget request, determine an observable expected result.

Example:

Requested:
    Show up to 10 weekly tasks.

Expected:
    Extra Large WEEK · TO DO can render more than 5 items and up to 10.

If the source says `10` but the desktop still shows exactly 5, the task is NOT complete.

Investigate deployment/registration/cache state rather than repeatedly editing the correct source.


# 23. DO NOT LEAVE THE USER WITH HALF A DEPLOYMENT

For widget visual/functional work, do not finish with:

    "I changed the Swift file."

Do not finish with:

    "Build succeeded."

Do not finish with:

    "You can install it now."

When operating in an environment where you can execute the required steps, carry the change through the complete workflow:

    understand request
        ↓
    identify correct production source
        ↓
    make minimal edit
        ↓
    build
        ↓
    embed widget
        ↓
    re-sign
        ↓
    verify bundle
        ↓
    install /Applications/KRMF.app
        ↓
    verify installed .appex
        ↓
    inspect/fix duplicate PluginKit registration if needed
        ↓
    launch canonical app
        ↓
    verify requested behavior

Only stop early when:

- user input is genuinely required
- macOS requires a manual UI action
- a build/error requires clarification
- the requested change itself is ambiguous enough that guessing would be dangerous

If a manual action is required, tell the user exactly what to click and then continue from there.


# 24. SAFETY PRINCIPLE FOR THIS PROJECT

KRMF's widget infrastructure is considered STABLE.

Prefer:

    smallest possible change
    + known build pipeline
    + explicit deployment verification

over:

    refactoring
    experimentation
    infrastructure replacement

If something unexpectedly stops working after a UI change, first assume a build/install/registration mismatch.

Do not "fix" working infrastructure without evidence that the infrastructure itself is broken.

## Verified App Group publishing repair (2026-09-20)

This supersedes the earlier minimal-host-entitlement guidance above. A full
Tauri rebuild omitted the Xcode host provisioning profile. macOS then rejected
snapshot writes with `Operation not permitted` and containermanagerd reported
that the signature did not authorize the protected group container. Signature
verification alone did not detect this runtime failure.

Keep the existing `group.56PQ4C62FB.com.krmf.widgets` identifier and native bridge.
The host now also carries its matching `com.apple.application-identifier`
(`56PQ4C62FB.com.krmf.app`) and `com.apple.developer.team-identifier`
(`56PQ4C62FB`) entitlements, without App Sandbox. `scripts/build-widgets.sh`
copies the Xcode-built host's `embedded.provisionprofile` before signing the
outer app. Do not omit that profile in future installations. The current
personal-team profile expires 2026-09-27; Xcode must renew it when needed.

Frontend sync failures are forwarded to `report_widget_sync_error` so the
installed app's stderr reports the actual error instead of silently retrying.
Verified: installed app wrote snapshot, requested WidgetKit reload, and the
snapshot exactly matched the current SQLite-derived data.
