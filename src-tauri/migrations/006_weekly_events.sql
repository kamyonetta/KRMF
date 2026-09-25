-- Store a series once. Occurrences use local wall-clock times on each date.
CREATE TABLE timed_event_series (
 id TEXT PRIMARY KEY NOT NULL,
 title TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 20),
 first_date TEXT NOT NULL CHECK(first_date BETWEEN '2026-09-01' AND '2027-12-31' AND date(first_date,'+0 days') IS NOT NULL AND date(first_date,'+0 days')=first_date),
 start_minute INTEGER NOT NULL CHECK(start_minute BETWEEN 0 AND 1438),
 end_minute INTEGER NOT NULL CHECK(end_minute BETWEEN 1 AND 1439 AND end_minute > start_minute),
 repeat_until TEXT CHECK(repeat_until IS NULL OR (repeat_until >= first_date AND repeat_until <= '2027-12-31' AND date(repeat_until,'+0 days') IS NOT NULL AND date(repeat_until,'+0 days')=repeat_until)),
 color TEXT NOT NULL CHECK(color IN ('red','purple','green','blue','yellow'))
);
-- Preserve existing slot indices: index 0 is still 8 AM; earlier slots are negative.
ALTER TABLE day_planner_lines RENAME TO day_planner_lines_previous;
CREATE TABLE day_planner_lines (
 plan_date TEXT NOT NULL CHECK(plan_date BETWEEN '2026-09-01' AND '2027-12-31' AND date(plan_date,'+0 days') IS NOT NULL AND date(plan_date,'+0 days')=plan_date),
 section TEXT NOT NULL CHECK(section IN ('slot','todo','note')),
 position INTEGER NOT NULL CHECK((section='slot' AND position BETWEEN -16 AND 31) OR (section='todo' AND position BETWEEN 0 AND 13) OR (section='note' AND position BETWEEN 0 AND 7)),
 text TEXT NOT NULL DEFAULT '' CHECK(length(text)<=20),
 checked INTEGER NOT NULL DEFAULT 0 CHECK(checked IN (0,1) AND (section='todo' OR checked=0)),
 PRIMARY KEY(plan_date,section,position)
);
INSERT INTO day_planner_lines SELECT * FROM day_planner_lines_previous;
DROP TABLE day_planner_lines_previous;
