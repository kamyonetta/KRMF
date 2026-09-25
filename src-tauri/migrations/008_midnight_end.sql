-- Permit a time window ending exactly at the end of the day.
CREATE TABLE timed_event_series_updated (
 id TEXT PRIMARY KEY NOT NULL,
 title TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 20),
 first_date TEXT NOT NULL CHECK(first_date BETWEEN '2026-09-01' AND '2027-12-31' AND date(first_date,'+0 days') IS NOT NULL AND date(first_date,'+0 days')=first_date),
 start_minute INTEGER NOT NULL CHECK(start_minute BETWEEN 0 AND 1438),
 end_minute INTEGER NOT NULL CHECK(end_minute BETWEEN 1 AND 1440 AND end_minute > start_minute),
 repeat_until TEXT CHECK(repeat_until IS NULL OR (repeat_until >= first_date AND repeat_until <= '2027-12-31' AND date(repeat_until,'+0 days') IS NOT NULL AND date(repeat_until,'+0 days')=repeat_until)),
 color TEXT NOT NULL CHECK(color IN ('red','purple','green','blue','yellow')),
 source_date TEXT, source_first INTEGER, source_last INTEGER, source_text TEXT, source_event_id TEXT
);

INSERT INTO timed_event_series_updated SELECT * FROM timed_event_series;
DROP TABLE timed_event_series;
ALTER TABLE timed_event_series_updated RENAME TO timed_event_series;
CREATE TRIGGER timed_series_replace_source AFTER INSERT ON timed_event_series
BEGIN
 DELETE FROM day_planner_lines WHERE section='slot' AND plan_date=NEW.source_date
   AND position BETWEEN NEW.source_first AND NEW.source_last AND trim(text)=NEW.source_text;
 DELETE FROM calendar_events WHERE id=NEW.source_event_id;
END;
