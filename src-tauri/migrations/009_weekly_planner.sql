CREATE TABLE weekly_planner_days (
 plan_date TEXT PRIMARY KEY NOT NULL CHECK(plan_date BETWEEN '2026-09-01' AND '2027-12-31' AND date(plan_date,'+0 days') IS NOT NULL AND date(plan_date,'+0 days')=plan_date),
 body TEXT NOT NULL DEFAULT '',
 imported_positions TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(imported_positions))
);
CREATE TABLE weekly_planner_notes (
 week_start TEXT PRIMARY KEY NOT NULL CHECK(week_start BETWEEN '2026-08-31' AND '2027-12-27' AND strftime('%w',week_start)='1'),
 body TEXT NOT NULL DEFAULT ''
);
CREATE TABLE weekly_planner_tasks (
 id TEXT PRIMARY KEY NOT NULL,
 week_start TEXT NOT NULL CHECK(week_start BETWEEN '2026-08-31' AND '2027-12-27' AND strftime('%w',week_start)='1'),
 title TEXT NOT NULL DEFAULT '',
 checked INTEGER NOT NULL DEFAULT 0 CHECK(checked IN (0,1)),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX weekly_planner_tasks_week ON weekly_planner_tasks(week_start);
