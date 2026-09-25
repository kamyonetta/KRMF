DROP TRIGGER timed_series_replace_source;
CREATE TABLE day_planner_lines_expanded (
 plan_date TEXT NOT NULL CHECK(plan_date BETWEEN '2026-09-01' AND '2027-12-31' AND date(plan_date,'+0 days') IS NOT NULL AND date(plan_date,'+0 days')=plan_date),
 section TEXT NOT NULL CHECK(section IN ('slot','todo','note')),
 position INTEGER NOT NULL CHECK((section='slot' AND position BETWEEN -16 AND 31) OR (section='todo' AND position >= 0) OR (section='note' AND position BETWEEN 0 AND 7)),
 text TEXT NOT NULL DEFAULT '' CHECK(length(text)<=20),
 checked INTEGER NOT NULL DEFAULT 0 CHECK(checked IN (0,1) AND (section='todo' OR checked=0)),
 PRIMARY KEY(plan_date,section,position)
);
INSERT INTO day_planner_lines_expanded SELECT * FROM day_planner_lines;
DROP TABLE day_planner_lines;
ALTER TABLE day_planner_lines_expanded RENAME TO day_planner_lines;
CREATE TRIGGER timed_series_replace_source AFTER INSERT ON timed_event_series
BEGIN
 DELETE FROM day_planner_lines WHERE section='slot' AND plan_date=NEW.source_date
   AND position BETWEEN NEW.source_first AND NEW.source_last AND trim(text)=NEW.source_text;
 DELETE FROM calendar_events WHERE id=NEW.source_event_id;
END;
