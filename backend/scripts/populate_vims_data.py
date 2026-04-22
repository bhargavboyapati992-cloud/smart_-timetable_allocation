import sys
from pathlib import Path

# Add the backend directory to sys.path so we can import modules
backend_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(backend_dir))

from database import SessionLocal, engine
import models

def populate_data():
    models.Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    dept_id = "cse"  # Default department ID for this population
    
    try:
        # 1. Add Classrooms
        rooms = [
            # 6th Floor
            {"name": "607", "type": "Classroom", "capacity": 70},
            {"name": "614 A", "type": "Classroom", "capacity": 70},
            {"name": "614 B", "type": "Classroom", "capacity": 70},
            {"name": "614", "type": "Classroom", "capacity": 70},
            {"name": "618", "type": "Classroom", "capacity": 70},
            {"name": "619", "type": "Classroom", "capacity": 70},
            {"name": "601 A", "type": "Classroom", "capacity": 70},
            # 5th Floor
            {"name": "514", "type": "Classroom", "capacity": 70},
            {"name": "514 A", "type": "Classroom", "capacity": 70},
            {"name": "514 B", "type": "Classroom", "capacity": 70},
            {"name": "501 A", "type": "Classroom", "capacity": 70},
        ]
        
        # 2. Add Labs
        labs = [
            "501 B", "502", "602", "604", "605", "606", "608", 
            "611", "612", "613", "615", "616", "617"
        ]
        
        for r in rooms:
            db_room = models.Room(
                department_id=dept_id,
                name=r["name"],
                room_type=r["type"],
                capacity=r["capacity"]
            )
            db.add(db_room)
            
        for l_name in labs:
            db_lab = models.Room(
                department_id=dept_id,
                name=l_name,
                room_type="Lab",
                capacity=30
            )
            db.add(db_lab)

        # 3. Add Sections
        sections = [
            {"name": "3rd Year (AIML) - Sec A", "count": 70, "sem": "6"},
            {"name": "3rd Year (AIML) - Sec B", "count": 70, "sem": "6"},
            {"name": "3rd Year (AIML) - Sec C", "count": 70, "sem": "6"},
            {"name": "2nd Year (AIML)", "count": 70, "sem": "4"},
            {"name": "2nd Year (Cyber Sec)", "count": 70, "sem": "4"},
            {"name": "2nd Year (DS) - Sec A", "count": 50, "sem": "4"},
            {"name": "2nd Year (DS) - Sec B", "count": 50, "sem": "4"},
            {"name": "2nd Year (IOT)", "count": 36, "sem": "4"},
            {"name": "3rd Year (CS)", "count": 70, "sem": "6"},
            {"name": "3rd Year (DS)", "count": 90, "sem": "6"},
            {"name": "3rd Year (CSBS)", "count": 30, "sem": "6"},
            {"name": "2nd Year (CSBS)", "count": 22, "sem": "4"},
        ]
        
        for s in sections:
            db_section = models.ClassSection(
                department_id=dept_id,
                name=s["name"],
                student_count=s["count"],
                semester=s["sem"]
            )
            db.add(db_section)

        # 4. Add Standard Subjects
        subjects = [
            {"name": "Python Programming", "type": "Theory", "hours": 4},
            {"name": "Data Structures", "type": "Theory", "hours": 4},
            {"name": "Database Systems", "type": "Theory", "hours": 3},
            {"name": "Operating Systems", "type": "Theory", "hours": 3},
            {"name": "Computer Networks", "type": "Theory", "hours": 4},
            {"name": "Machine Learning", "type": "Theory", "hours": 4},
            {"name": "Cyber Security", "type": "Theory", "hours": 3},
            {"name": "Web Development", "type": "Theory", "hours": 3},
            {"name": "Soft Skills", "type": "Theory", "hours": 2},
            {"name": "Library", "type": "Theory", "hours": 2},
        ]
        for s in subjects:
            exists = db.query(models.Subject).filter(models.Subject.name == s["name"]).first()
            if not exists:
                db_sub = models.Subject(
                    department_id=dept_id,
                    name=s["name"],
                    type=s["type"],
                    hours_per_week=s["hours"],
                    semester="ANY"
                )
                db.add(db_sub)

        # 5. Add Placeholder Teachers (needed for AI solver)
        existing_teachers = db.query(models.Teacher).filter(models.Teacher.department_id == dept_id).count()
        if existing_teachers == 0:
            for i in range(1, 21):
                t = models.Teacher(
                    department_id=dept_id,
                    name=f"Teacher {i}"
                )
                db.add(t)
            print("Added 20 placeholder teachers.")

        db.commit()
        print(f"Successfully populated {len(rooms) + len(labs)} rooms and {len(sections)} sections.")
        
    except Exception as e:
        db.rollback()
        print(f"Error populating data: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    populate_data()
