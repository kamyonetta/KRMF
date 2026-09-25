mod widgets;
use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![Migration {
        version: 1,
        description: "initial_schema",
        sql: include_str!("../migrations/001_initial.sql"),
        kind: MigrationKind::Up,
    }, Migration {
        version: 2,
        description: "habits",
        sql: include_str!("../migrations/002_habits.sql"),
        kind: MigrationKind::Up,
    }, Migration {
        version: 3,
        description: "important_events",
        sql: include_str!("../migrations/003_important_events.sql"),
        kind: MigrationKind::Up,
    }, Migration {
        version: 4,
        description: "validate_important_dates",
        sql: include_str!("../migrations/004_validate_important_dates.sql"),
        kind: MigrationKind::Up,
    }, Migration {
        version: 5,
        description: "day_planner",
        sql: include_str!("../migrations/005_day_planner.sql"),
        kind: MigrationKind::Up,
    }, Migration {
        version: 6,
        description: "weekly_events",
        sql: include_str!("../migrations/006_weekly_events.sql"),
        kind: MigrationKind::Up,
    }, Migration {
        version: 7,
        description: "weekly_edit",
        sql: include_str!("../migrations/007_weekly_edit.sql"),
        kind: MigrationKind::Up,
    }, Migration {
        version: 8,
        description: "midnight_end",
        sql: include_str!("../migrations/008_midnight_end.sql"),
        kind: MigrationKind::Up,
    }, Migration {
        version: 9,
        description: "weekly_planner",
        sql: include_str!("../migrations/009_weekly_planner.sql"),
        kind: MigrationKind::Up,
    }, Migration {
        version: 10,
        description: "habit_schedule",
        sql: include_str!("../migrations/010_habit_schedule.sql"),
        kind: MigrationKind::Up,
    }, Migration {
        version: 11,
        description: "daily_notes",
        sql: include_str!("../migrations/011_daily_notes.sql"),
        kind: MigrationKind::Up,
    }, Migration {
        version: 12,
        description: "daily_todos",
        sql: include_str!("../migrations/012_daily_todos.sql"),
        kind: MigrationKind::Up,
    }, Migration {
        version: 13,
        description: "weekly_exclusions",
        sql: include_str!("../migrations/013_weekly_exclusions.sql"),
        kind: MigrationKind::Up,
    }];

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![widgets::publish_widgets, widgets::report_widget_sync_error])
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:krmf.db", migrations)
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running KRMF");
}
