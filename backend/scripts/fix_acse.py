import sys
from pathlib import Path

# Add the backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(backend_dir))

from database import SessionLocal, engine
import models

def populate_acse():
    models.Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    dept_id = 'acse'
    
    try:
        # Clear existing data for acse to avoid duplicates
        db.query(models.Room).filter(models.Room.department_id == dept_id).delete()
        db.query(models.ClassSection).filter(models.ClassSection.department_id == dept_id).delete()
        db.query(models.Subject).filter(models.Subject.department_id == dept_id).delete()
        db.query(models.Teacher).filter(models.Teacher.department_id == dept_id).delete()
        db.query(models.ConstraintsConfig).filter(models.ConstraintsConfig.department_id == dept_id).delete()
        
        # 1. Config
        db.add(models.ConstraintsConfig(department_id=dept_id, days_per_week=6, periods_per_day=8, max_consecutive_classes=3))

        # 2. Rooms
        rooms = [
            {'name': '607', 'type': 'Classroom', 'capacity': 70},
            {'name': '614 A', 'type': 'Classroom', 'capacity': 70},
            {'name': '614 B', 'type': 'Classroom', 'capacity': 70},
            {'name': '614', 'type': 'Classroom', 'capacity': 70},
            {'name': '618', 'type': 'Classroom', 'capacity': 70},
            {'name': '619', 'type': 'Classroom', 'capacity': 70},
            {'name': '601 A', 'type': 'Classroom', 'capacity': 70}
        ]
        labs = ['501 B', '502', '602', '604', '605', '606', '608', '611', '612', '613', '615', '616', '617']
        
        for r in rooms:
            db.add(models.Room(department_id=dept_id, name=r['name'], room_type=r['type'], capacity=r['capacity']))
        for l in labs:
            db.add(models.Room(department_id=dept_id, name=l, room_type='Lab', capacity=30))

        # 3. Sections
        sections = [
            {'name': '3rd Year (AIML) - Sec A', 'count': 70, 'sem': '6'},
            {'name': '3rd Year (AIML) - Sec B', 'count': 70, 'sem': '6'},
            {'name': '3rd Year (AIML) - Sec C', 'count': 70, 'sem': '6'},
            {'name': '2nd Year (AIML)', 'count': 70, 'sem': '4'},
            {'name': '2nd Year (Cyber Sec)', 'count': 70, 'sem': '4'},
            {'name': '2nd Year (DS) - Sec A', 'count': 50, 'sem': '4'},
            {'name': '2nd Year (DS) - Sec B', 'count': 50, 'sem': '4'},
            {'name': '2nd Year (IOT)', 'count': 36, 'sem': '4'},
            {'name': '3rd Year (CS)', 'count': 70, 'sem': '6'},
            {'name': '3rd Year (DS)', 'count': 90, 'sem': '6'},
            {'name': '3rd Year (CSBS)', 'count': 30, 'sem': '6'},
            {'name': '2nd Year (CSBS)', 'count': 22, 'sem': '4'}
        ]
        for s in sections:
            db.add(models.ClassSection(department_id=dept_id, name=s['name'], student_count=s['count'], semester=s['sem']))

        # 4. Subjects
        subjects = [
            {'name': 'Python Programming', 'type': 'Theory', 'hours': 4},
            {'name': 'Data Structures', 'type': 'Theory', 'hours': 4},
            {'name': 'Database Systems', 'type': 'Theory', 'hours': 3},
            {'name': 'Operating Systems', 'type': 'Theory', 'hours': 3},
            {'name': 'Computer Networks', 'type': 'Theory', 'hours': 4},
            {'name': 'Machine Learning', 'type': 'Theory', 'hours': 4},
            {'name': 'Cyber Security', 'type': 'Theory', 'hours': 3},
            {'name': 'Web Development', 'type': 'Theory', 'hours': 3},
            {'name': 'Soft Skills', 'type': 'Theory', 'hours': 2},
            {'name': 'Library', 'type': 'Theory', 'hours': 2}
        ]
        for s in subjects:
            db.add(models.Subject(department_id=dept_id, name=s['name'], type=s['type'], hours_per_week=s['hours'], semester='ANY'))

        # 5. Teachers
        for i in range(1, 21):
            db.add(models.Teacher(department_id=dept_id, name=f'Teacher {i}'))
            
        db.commit()
        print("Successfully populated ACSE data")
        
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    populate_acse()
