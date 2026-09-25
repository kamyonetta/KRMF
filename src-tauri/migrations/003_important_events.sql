CREATE TABLE important_events (
    id TEXT PRIMARY KEY NOT NULL,
    event_date TEXT NOT NULL CHECK (
        event_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
        AND event_date BETWEEN '2026-09-01' AND '2027-12-31'
        AND date(event_date, '+0 days') = event_date
    ),
    title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 120),
    color TEXT NOT NULL CHECK (color IN ('red', 'purple', 'green', 'blue', 'yellow')),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX important_events_date ON important_events(event_date);
