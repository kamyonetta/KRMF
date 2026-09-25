from pathlib import Path
import sqlite3
import tempfile
root=Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory() as folder:
    path=Path(folder)/'planner.db'
    c=sqlite3.connect(path)
    for migration in sorted((root/'src-tauri/migrations').glob('*.sql')): c.executescript(migration.read_text())
    c.execute("INSERT INTO day_planner_lines VALUES ('2026-09-17','todo',0,'Read',0)")
    c.execute("INSERT INTO weekly_planner_days VALUES ('2026-09-17','Read','[0]')")
    c.execute("UPDATE weekly_planner_days SET body='' WHERE plan_date='2026-09-17'")
    assert c.execute("SELECT text FROM day_planner_lines WHERE section='todo'").fetchone()[0]=='Read'
    c.execute("INSERT INTO weekly_planner_tasks(id,week_start,title,checked) VALUES ('task','2026-09-14','Weekly only',1)")
    assert c.execute('SELECT count(*) FROM day_planner_lines').fetchone()[0]==1
    c.execute("INSERT INTO weekly_planner_notes VALUES ('2026-09-14','Remember this')")
    c.execute("INSERT INTO weekly_planner_notes VALUES ('2026-09-21','Different week')")
    c.commit();c.close()
    with sqlite3.connect(path) as c:
        assert c.execute('SELECT body,imported_positions FROM weekly_planner_days').fetchone()==('','[0]')
        assert c.execute('SELECT title,checked FROM weekly_planner_tasks').fetchone()==('Weekly only',1)
        assert c.execute("SELECT body FROM weekly_planner_notes WHERE week_start='2026-09-14'").fetchone()[0]=='Remember this'
print('Planner persistence, cleared-copy preservation, calendar isolation, and week separation passed.')
