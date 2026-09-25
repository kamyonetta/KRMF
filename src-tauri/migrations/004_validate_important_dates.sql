-- SQLite CHECK treats NULL as passing; explicitly reject dates it cannot parse.
CREATE TRIGGER important_events_valid_date_insert
BEFORE INSERT ON important_events
WHEN date(NEW.event_date, '+0 days') IS NULL
BEGIN
    SELECT RAISE(ABORT, 'Invalid important event date');
END;
CREATE TRIGGER important_events_valid_date_update
BEFORE UPDATE OF event_date ON important_events
WHEN date(NEW.event_date, '+0 days') IS NULL
BEGIN
    SELECT RAISE(ABORT, 'Invalid important event date');
END;
