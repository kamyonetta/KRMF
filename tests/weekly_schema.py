from pathlib import Path
import sqlite3
import tempfile
root = Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory() as folder:
    path = Path(folder) / 'week.db'
    db = sqlite3.connect(path)
    for migration in sorted((root/'src-tauri/migrations').glob('*.sql')):
        if migration.name.startswith('006'):
            db.execute("INSERT INTO day_planner_lines VALUES ('2026-09-17','slot',0,'Existing 8 AM',0)")
            db.execute("INSERT INTO day_planner_lines VALUES ('2026-09-17','todo',0,'',1)")
            db.commit()
        db.executescript(migration.read_text())
    assert db.execute("SELECT text FROM day_planner_lines WHERE section='slot' AND position=0").fetchone()[0]=='Existing 8 AM'
    assert db.execute("SELECT checked FROM day_planner_lines WHERE section='todo'").fetchone()[0]==1
    db.execute("INSERT INTO day_planner_lines VALUES ('2026-09-17','slot',-16,'Midnight',0)")
    db.execute("INSERT INTO day_planner_lines VALUES ('2026-09-17','slot',31,'Late night',0)")
    insert='INSERT INTO timed_event_series (id,title,first_date,start_minute,end_minute,repeat_until,color) VALUES (?,?,?,?,?,?,?)'
    valid=('class','Class','2026-09-15',600,680,'2027-12-31','blue')
    db.execute(insert,valid)
    for invalid in [('',600,680,'2027-12-31'),('Bad',680,600,'2027-12-31'),('Bad',600,680,'2026-09-14'),('Bad',600,680,'2028-01-01')]:
        title,start,end,until=invalid
        try: db.execute(insert,('bad',title,'2026-09-15',start,end,until,'blue'))
        except sqlite3.IntegrityError: continue
        raise AssertionError(invalid)
    db.commit();db.close()
    with sqlite3.connect(path) as db: assert db.execute('SELECT id,title,first_date,start_minute,end_minute,repeat_until,color FROM timed_event_series').fetchone()==valid
print('Weekly series persistence, validation, and existing planner preservation passed.')
