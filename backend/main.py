from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.security import HTTPBearer
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional

import models
import schemas
import crud
import solver_ortools
import auth as auth_module
from fastapi.middleware.cors import CORSMiddleware
from database import SessionLocal, engine

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="VIMS Timetable Allocation API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],    # Restrict to portal domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["Content-Type", "Authorization", "X-Department-ID", "Bypass-Tunnel-Reminder", "ngrok-skip-browser-warning"],
)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "VIMS Timetable AI Engine is running",
        "portal_url": "https://beautiful-tarsier-7dd4ff.netlify.app/"
    }

# ── DB Dependency ──────────────────────────────────────────────────────────────
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ── Auth Routes ────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str
    password: str
    grid_value_1: str = ""
    grid_value_2: str = ""

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    department_id: str
    display_name: str
    role: str
    grid_challenge_1: str
    grid_challenge_2: str

@app.get("/auth/challenges")
def get_challenges():
    """Public endpoint — returns the grid challenge labels so the frontend can display them."""
    return {
        "grid_challenge_1": auth_module.GRID_CHALLENGE_1,
        "grid_challenge_2": auth_module.GRID_CHALLENGE_2,
        "grid_enabled":    bool(auth_module.GRID_VALUE_1 or auth_module.GRID_VALUE_2),
    }

@app.post("/auth/login", response_model=LoginResponse)
def login(body: LoginRequest):
    user = auth_module.authenticate_user(
        body.username, body.password, body.grid_value_1, body.grid_value_2
    )
    token = auth_module.create_access_token(user)
    return LoginResponse(
        access_token=token,
        department_id=user["department_id"],
        display_name=user.get("display_name", user["username"]),
        role=user["role"],
        grid_challenge_1=auth_module.GRID_CHALLENGE_1,
        grid_challenge_2=auth_module.GRID_CHALLENGE_2,
    )

@app.post("/auth/logout")
def logout():
    """Frontend should delete its token on logout. JWT is stateless."""
    return {"message": "Logged out successfully"}

class ForgotPasswordRequest(BaseModel):
    username: str
    new_password: str
    confirm_password: str

@app.post("/auth/forgot-password")
def forgot_password(body: ForgotPasswordRequest):
    if body.new_password != body.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    auth_module.change_password(body.username, body.new_password)
    return {"message": "Password updated successfully. Please log in with your new password."}

class ChangeUsernameRequest(BaseModel):
    current_username: str
    password: str
    new_username: str

@app.post("/auth/change-username")
def change_username_route(body: ChangeUsernameRequest):
    if len(body.new_username.strip()) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters")
    auth_module.change_username(body.current_username, body.password, body.new_username)
    return {"message": "Username updated successfully. Please log in with your new username."}

class SignupRequest(BaseModel):
    username: str
    password: str
    confirm_password: str
    department_id: str
    display_name: Optional[str] = ""

@app.post("/auth/signup", response_model=LoginResponse)
def signup(body: SignupRequest):
    if body.password != body.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    if len(body.username.strip()) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters")
    new_user = auth_module.register_user(
        body.username, body.password, body.department_id, body.display_name or ""
    )
    token = auth_module.create_access_token(new_user)
    return LoginResponse(
        access_token=token,
        department_id=new_user["department_id"],
        display_name=new_user.get("display_name", new_user["username"]),
        role=new_user["role"],
        grid_challenge_1=auth_module.GRID_CHALLENGE_1,
        grid_challenge_2=auth_module.GRID_CHALLENGE_2,
    )

class GoogleAuthRequest(BaseModel):
    credential: str   # Google ID token from GSI

@app.post("/auth/google", response_model=LoginResponse)
def google_auth(body: GoogleAuthRequest):
    user = auth_module.google_login(body.credential)
    token = auth_module.create_access_token(user)
    return LoginResponse(
        access_token=token,
        department_id=user["department_id"],
        display_name=user.get("display_name", user["username"]),
        role=user["role"],
        grid_challenge_1=auth_module.GRID_CHALLENGE_1,
        grid_challenge_2=auth_module.GRID_CHALLENGE_2,
    )

# ── Protected Data Routes ──────────────────────────────────────────────────────
# All routes below require a valid Bearer token.

@app.post("/teachers/", response_model=schemas.Teacher)
def create_teacher(teacher: schemas.TeacherCreate, db: Session = Depends(get_db), user=Depends(auth_module.require_auth)):
    return crud.create_teacher(db=db, teacher=teacher)

@app.get("/teachers/", response_model=List[schemas.Teacher])
def read_teachers(skip: int = 0, limit: int = 100, x_department_id: str = Header(...), db: Session = Depends(get_db), user=Depends(auth_module.require_auth)):
    return crud.get_teachers(db, department_id=x_department_id, skip=skip, limit=limit)

@app.put("/teachers/{item_id}", response_model=schemas.Teacher)
def update_teacher(item_id: int, teacher: schemas.TeacherCreate, x_department_id: str = Header(...), db: Session = Depends(get_db), user=Depends(auth_module.require_auth)):
    updated = crud.update_item(db, models.Teacher, item_id, teacher.model_dump(), x_department_id)
    if not updated: raise HTTPException(status_code=404, detail="Item not found")
    return updated

@app.delete("/teachers/{item_id}")
def delete_teacher(item_id: int, x_department_id: str = Header(...), db: Session = Depends(get_db), user=Depends(auth_module.require_auth)):
    if not crud.delete_item(db, models.Teacher, item_id, x_department_id):
        raise HTTPException(status_code=404, detail="Item not found")
    return {"status": "deleted"}

@app.post("/rooms/", response_model=schemas.Room)
def create_room(room: schemas.RoomCreate, db: Session = Depends(get_db), user=Depends(auth_module.require_auth)):
    return crud.create_room(db=db, room=room)

@app.get("/rooms/", response_model=List[schemas.Room])
def read_rooms(skip: int = 0, limit: int = 100, x_department_id: str = Header(...), db: Session = Depends(get_db), user=Depends(auth_module.require_auth)):
    return crud.get_rooms(db, department_id=x_department_id, skip=skip, limit=limit)

@app.put("/rooms/{item_id}", response_model=schemas.Room)
def update_room(item_id: int, room: schemas.RoomCreate, x_department_id: str = Header(...), db: Session = Depends(get_db), user=Depends(auth_module.require_auth)):
    updated = crud.update_item(db, models.Room, item_id, room.model_dump(), x_department_id)
    if not updated: raise HTTPException(status_code=404, detail="Item not found")
    return updated

@app.delete("/rooms/{item_id}")
def delete_room(item_id: int, x_department_id: str = Header(...), db: Session = Depends(get_db), user=Depends(auth_module.require_auth)):
    if not crud.delete_item(db, models.Room, item_id, x_department_id):
        raise HTTPException(status_code=404, detail="Item not found")
    return {"status": "deleted"}

@app.post("/subjects/", response_model=schemas.Subject)
def create_subject(subject: schemas.SubjectCreate, db: Session = Depends(get_db), user=Depends(auth_module.require_auth)):
    return crud.create_subject(db=db, subject=subject)

@app.get("/subjects/", response_model=List[schemas.Subject])
def read_subjects(skip: int = 0, limit: int = 100, x_department_id: str = Header(...), db: Session = Depends(get_db), user=Depends(auth_module.require_auth)):
    return crud.get_subjects(db, department_id=x_department_id, skip=skip, limit=limit)

@app.put("/subjects/{item_id}", response_model=schemas.Subject)
def update_subject(item_id: int, subject: schemas.SubjectCreate, x_department_id: str = Header(...), db: Session = Depends(get_db), user=Depends(auth_module.require_auth)):
    updated = crud.update_item(db, models.Subject, item_id, subject.model_dump(), x_department_id)
    if not updated: raise HTTPException(status_code=404, detail="Item not found")
    return updated

@app.delete("/subjects/{item_id}")
def delete_subject(item_id: int, x_department_id: str = Header(...), db: Session = Depends(get_db), user=Depends(auth_module.require_auth)):
    if not crud.delete_item(db, models.Subject, item_id, x_department_id):
        raise HTTPException(status_code=404, detail="Item not found")
    return {"status": "deleted"}

@app.post("/tas/", response_model=schemas.TeachingAssistant)
def create_ta(ta: schemas.TeachingAssistantCreate, db: Session = Depends(get_db), user=Depends(auth_module.require_auth)):
    return crud.create_ta(db=db, ta=ta)

@app.get("/tas/", response_model=List[schemas.TeachingAssistant])
def read_tas(skip: int = 0, limit: int = 100, x_department_id: str = Header(...), db: Session = Depends(get_db), user=Depends(auth_module.require_auth)):
    return crud.get_tas(db, department_id=x_department_id, skip=skip, limit=limit)

@app.put("/tas/{item_id}", response_model=schemas.TeachingAssistant)
def update_ta(item_id: int, ta: schemas.TeachingAssistantCreate, x_department_id: str = Header(...), db: Session = Depends(get_db), user=Depends(auth_module.require_auth)):
    updated = crud.update_item(db, models.TeachingAssistant, item_id, ta.model_dump(), x_department_id)
    if not updated: raise HTTPException(status_code=404, detail="Item not found")
    return updated

@app.delete("/tas/{item_id}")
def delete_ta(item_id: int, x_department_id: str = Header(...), db: Session = Depends(get_db), user=Depends(auth_module.require_auth)):
    if not crud.delete_item(db, models.TeachingAssistant, item_id, x_department_id):
        raise HTTPException(status_code=404, detail="Item not found")
    return {"status": "deleted"}

@app.get("/config/", response_model=schemas.ConstraintsConfig)
def read_config(x_department_id: str = Header(...), db: Session = Depends(get_db), user=Depends(auth_module.require_auth)):
    return crud.get_config(db, department_id=x_department_id)

@app.put("/config/", response_model=schemas.ConstraintsConfig)
def update_config(config: schemas.ConstraintsConfig, x_department_id: str = Header(...), db: Session = Depends(get_db), user=Depends(auth_module.require_auth)):
    return crud.update_config(db, config, department_id=x_department_id)

@app.post("/generate")
def generate_schedule(solverType: str = "ortools", x_department_id: str = Header(...), db: Session = Depends(get_db), user=Depends(auth_module.require_auth)):
    config = crud.get_config(db, x_department_id)
    
    db_rooms = db.query(models.Room).filter(models.Room.department_id == x_department_id).all()
    rooms_data = [{"id": r.id, "room_type": r.room_type, "name": r.name} for r in db_rooms]
    
    db_mappings = db.query(models.SectionSubjectMapping).filter(models.SectionSubjectMapping.department_id == x_department_id).all()
    mappings_data = []
    
    db_subjects = db.query(models.Subject).filter(models.Subject.department_id == x_department_id).all()
    subjects_info = {sub.id: {"hours": sub.hours_per_week, "type": sub.type, "name": sub.name} for sub in db_subjects}
    
    for m in db_mappings:
        t_ids = [m.teacher_id]
        if m.secondary_teacher_id:
            t_ids.append(m.secondary_teacher_id)
        mappings_data.append({
            "m_id": m.id,
            "section_id": m.section_id,
            "subject_id": m.subject_id,
            "teacher_ids": t_ids
        })
        
    if not mappings_data:
        db_teachers = db.query(models.Teacher).filter(models.Teacher.department_id == x_department_id).all()
        db_tas = db.query(models.TeachingAssistant).filter(models.TeachingAssistant.department_id == x_department_id).all()
        
        if db_subjects and db_teachers:
            import itertools, re
            ta_cycle = itertools.cycle(db_tas) if db_tas else None
            unassigned_subjects = list(db_subjects)
            
            for t in db_teachers:
                match = re.search(r'\((.*?)\)', t.name)
                assigned_subject_name = match.group(1).strip().lower() if match else None
                if assigned_subject_name:
                    for sub in list(unassigned_subjects):
                        if assigned_subject_name == sub.name.lower() or assigned_subject_name in sub.name.lower():
                            is_lab = sub.type.lower() in ["lab", "practical", "p"]
                            t_ids = [t.id]
                            if is_lab and ta_cycle:
                                t_ids.append(next(ta_cycle).id)
                            mappings_data.append({
                                "m_id": len(mappings_data) + 1,
                                "section_id": 1,
                                "subject_id": sub.id,
                                "teacher_ids": t_ids
                            })
                            unassigned_subjects.remove(sub)

            if unassigned_subjects:
                teacher_cycle = itertools.cycle(db_teachers)
                for sub in unassigned_subjects:
                    t = next(teacher_cycle)
                    is_lab = sub.type.lower() in ["lab", "practical", "p"]
                    t_ids = [t.id]
                    if is_lab and ta_cycle:
                        t_ids.append(next(ta_cycle).id)
                    mappings_data.append({
                        "m_id": len(mappings_data) + 1,
                        "section_id": 1,
                        "subject_id": sub.id,
                        "teacher_ids": t_ids
                    })
        
    if solverType == "ortools":
        res = solver_ortools.generate_timetable(
            days=config.days_per_week,
            periods=config.periods_per_day,
            rooms=rooms_data,
            mappings=mappings_data,
            subjects_info=subjects_info,
            max_consec=config.max_consecutive_classes
        )
        return res
    else:
        raise HTTPException(status_code=501, detail="FET solver integration pending")
