import sys
from pathlib import Path

# Add the backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(backend_dir))

import solver_ortools

def test_logic():
    days = 5
    periods = 7
    rooms = [{"id": 1, "room_type": "Classroom", "name": "Room 1"}]
    subjects_info = {
        1: {"hours": 10, "type": "Theory", "name": "Math"},
        2: {"hours": 10, "type": "Theory", "name": "Physics"},
        100: {"hours": 2, "type": "Theory", "name": "Library"}
    }
    mappings = [
        {"m_id": 1, "section_id": 1, "subject_id": 1, "teacher_ids": [1]},
        {"m_id": 2, "section_id": 2, "subject_id": 2, "teacher_ids": [1]}, # Teacher 1 has 10+10 = 20 hours
        {"m_id": 100, "section_id": 1, "subject_id": 100, "teacher_ids": []}, # Library
    ]
    
    print("Running solver...")
    res = solver_ortools.generate_timetable(days, periods, rooms, mappings, subjects_info, max_consec=3)
    
    if res["status"] == "success":
        print("Success! Schedule generated.")
        lib_slots = [s for s in res["schedule"] if s["subject_name"] == "Library"]
        print(f"Library slots found: {len(lib_slots)}")
        
        t1_slots = [s for s in res["schedule"] if 1 in s["teacher_ids"]]
        print(f"Teacher 1 slots found: {len(t1_slots)}")
    else:
        print(f"Failed! Status: {res['status']}, Solver Status: {res.get('solver_status')}")

if __name__ == "__main__":
    test_logic()
