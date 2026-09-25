CREATE TABLE day_planner_lines (
    plan_date TEXT NOT NULL CHECK (
        plan_date BETWEEN '2026-09-01' AND '2027-12-31'
        AND plan_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
        AND date(plan_date, '+0 days') IS NOT NULL
        AND date(plan_date, '+0 days') = plan_date
    ),
    section TEXT NOT NULL CHECK(section IN ('slot', 'todo', 'note')),
    position INTEGER NOT NULL CHECK (
        position >= 0 AND (
            (section = 'slot' AND position < 24) OR
            (section = 'todo' AND position < 14) OR
            (section = 'note' AND position < 8)
        )
    ),
    text TEXT NOT NULL DEFAULT '' CHECK(length(text) <= 20),
    checked INTEGER NOT NULL DEFAULT 0 CHECK(checked IN (0, 1) AND (section = 'todo' OR checked = 0)),
    PRIMARY KEY(plan_date, section, position)
);
