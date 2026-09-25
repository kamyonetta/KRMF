CREATE TABLE daily_notes (
 plan_date TEXT PRIMARY KEY NOT NULL CHECK(plan_date BETWEEN '2026-09-01' AND '2027-12-31' AND date(plan_date,'+0 days') IS NOT NULL AND date(plan_date,'+0 days')=plan_date),
 body TEXT NOT NULL DEFAULT ''
);
INSERT INTO daily_notes(plan_date,body)
SELECT plan_date, group_concat(text,char(10)) FROM
 (SELECT plan_date,text FROM day_planner_lines WHERE section='note' AND text!='' ORDER BY plan_date,position)
GROUP BY plan_date;
