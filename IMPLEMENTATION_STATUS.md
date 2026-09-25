# KRMF implementation status

- macOS app: installed at `/Applications/KRMF.app`; existing SQLite and WidgetKit configuration preserved.
- Weekly planner day boxes now read and write the same `daily_notes` rows as each daily planner page. The separate weekly note remains unchanged. Day-note boxes scroll after six lines.
- Web companion: monthly calendar selection, important-event add/delete, separate weekly schedule, shared daily notes, unified schedule blocks, mobile navigation/layout, and requested copy changes are implemented.
- Deployment artifact: `krmf-companion-update.zip`; extract over `wp-content/plugins/krmf-companion` in cPanel.
- Validation: `npm run check` and all 40 Node tests pass; macOS app and widget extension build and sign successfully.
