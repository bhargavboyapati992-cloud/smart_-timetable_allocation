import sys
from pathlib import Path

# Add the backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(backend_dir))

from database import SessionLocal
import models
import solver_ortools

def test_solver():
    db = SessionLocal()
    dept_id = 'acse'
    
    try:
        config = db.query(models.ConstraintsConfig).filter(models.ConstraintsConfig.department_id == dept_id).first()
        db_rooms = db.query(models.Room).filter(models.Room.department_id == dept_id).all()
        rooms_data = [{"id": r.id, "room_type": r.room_type, "name": r.name} for r in db_rooms]
        
        db_sections = db.query(models.ClassSection).filter(models.ClassSection.department_id == dept_id).all()
        db_subjects = db.query(models.Subject).filter(models.Subject.department_id == dept_id).all()
        db_teachers = db.query(models.Teacher).filter(models.Teacher.department_id == dept_id).all()
        
        subjects_info = {sub.id: {"hours": sub.hours_per_week, "type": sub.type, "name": sub.name} for sub in db_subjects}
        
        mappings_data = []
        import itertools
        teacher_cycle = itertools.cycle(db_teachers)
        
        for sec in db_sections:
            for sub in db_subjects:
                t = next(teacher_cycle)
                mappings_data.append({
                    "m_id": len(mappings_data) + 1,
                    "section_id": sec.id,
                    "subject_id": sub.id,
                    "teacher_ids": [t.id]
                })
        
        print(f"Solving for {len(db_sections)} sections, {len(db_subjects)} subjects, {len(rooms_data)} rooms")
        res = solver_ortools.generate_timetable(
            days=config.days_per_week,
            periods=config.periods_per_day,
            rooms=rooms_data,
            mappings=mappings_data,
            subjects_info=subjects_info,
            max_consec=config.max_consecutive_classes
        )
        print(f"Result Status: {res.get('status')}")
        if res.get('status') == 'failed':
            print(f"Solver Status Name: {res.get('solver_status')}")
            
    finally:
        db.close()

if __name__ == "__main__":
    test_solver()
