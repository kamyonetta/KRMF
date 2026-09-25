from pathlib import Path
import sqlite3
c=sqlite3.connect(':memory:')
for path in sorted((Path(__file__).resolve().parents[1]/'src-tauri/migrations').glob('*.sql')): c.executescript(path.read_text())
for position in (4,5,6,8): c.execute("INSERT INTO day_planner_lines VALUES ('2026-09-17','slot',?,'Study',0)",(position,))
insert='INSERT INTO timed_event_series (id,title,first_date,start_minute,end_minute,repeat_until,color,source_date,source_first,source_last,source_text) VALUES (?,?,?,?,?,?,?,?,?,?,?)'
try: c.execute(insert,('bad','', '2026-09-17',600,690,None,'blue','2026-09-17',4,6,'Study'))
except sqlite3.IntegrityError: pass
assert c.execute('SELECT count(*) FROM day_planner_lines').fetchone()[0]==4
c.execute(insert,('edited','Revised','2026-09-18',600,690,'2026-10-02','red','2026-09-17',4,6,'Study'))
assert c.execute('SELECT position FROM day_planner_lines').fetchall()==[(8,)]
c.execute("UPDATE timed_event_series SET title='Again',end_minute=1440 WHERE id='edited'")
assert c.execute('SELECT count(*) FROM timed_event_series').fetchone()[0]==1
assert c.execute('SELECT title,end_minute FROM timed_event_series').fetchone()==('Again',1440)
print('Weekly edit replacement, rollback on invalid input, unrelated slot preservation, and midnight end passed.')
