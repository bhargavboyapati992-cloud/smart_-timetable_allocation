from sqlalchemy.orm import Session
import models
import schemas

def get_teacher(db: Session, teacher_id: int):
    return db.query(models.Teacher).filter(models.Teacher.id == teacher_id).first()

def get_teachers(db: Session, department_id: str, skip: int = 0, limit: int = 100):
    return db.query(models.Teacher).filter(models.Teacher.department_id == department_id).offset(skip).limit(limit).all()

def create_teacher(db: Session, teacher: schemas.TeacherCreate):
    db_teacher = models.Teacher(**teacher.model_dump())
    db.add(db_teacher)
    db.commit()
    db.refresh(db_teacher)
    return db_teacher

def get_rooms(db: Session, department_id: str, skip: int = 0, limit: int = 100):
    return db.query(models.Room).filter(models.Room.department_id == department_id).offset(skip).limit(limit).all()

def create_room(db: Session, room: schemas.RoomCreate):
    db_room = models.Room(**room.model_dump())
    db.add(db_room)
    db.commit()
    db.refresh(db_room)
    return db_room

def get_subjects(db: Session, department_id: str, skip: int = 0, limit: int = 100):
    return db.query(models.Subject).filter(models.Subject.department_id == department_id).offset(skip).limit(limit).all()

def create_subject(db: Session, subject: schemas.SubjectCreate):
    db_subject = models.Subject(**subject.model_dump())
    db.add(db_subject)
    db.commit()
    db.refresh(db_subject)
    return db_subject

def get_config(db: Session, department_id: str):
    config = db.query(models.ConstraintsConfig).filter(models.ConstraintsConfig.department_id == department_id).first()
    if not config:
        config = models.ConstraintsConfig(department_id=department_id)
        db.add(config)
        db.commit()
        db.refresh(config)
    return config

def update_config(db: Session, config_data: schemas.ConstraintsConfig, department_id: str):
    config = get_config(db, department_id)
    config.days_per_week = config_data.days_per_week
    config.periods_per_day = config_data.periods_per_day
    config.max_consecutive_classes = config_data.max_consecutive_classes
    db.commit()
    db.refresh(config)
    return config

def get_tas(db: Session, department_id: str, skip: int = 0, limit: int = 100):
    return db.query(models.TeachingAssistant).filter(models.TeachingAssistant.department_id == department_id).offset(skip).limit(limit).all()

def create_ta(db: Session, ta: schemas.TeachingAssistantCreate):
    db_ta = models.TeachingAssistant(**ta.model_dump())
    db.add(db_ta)
    db.commit()
    db.refresh(db_ta)
    return db_ta

def update_item(db: Session, model_class, item_id: int, item_data: dict, department_id: str):
    db_item = db.query(model_class).filter(model_class.id == item_id, model_class.department_id == department_id).first()
    if db_item:
        for key, value in item_data.items():
            setattr(db_item, key, value)
        db.commit()
        db.refresh(db_item)
    return db_item

def delete_item(db: Session, model_class, item_id: int, department_id: str):
    db_item = db.query(model_class).filter(model_class.id == item_id, model_class.department_id == department_id).first()
    if db_item:
        db.delete(db_item)
        db.commit()
        return True
    return False

def get_sections(db: Session, department_id: str, skip: int = 0, limit: int = 100):
    return db.query(models.ClassSection).filter(models.ClassSection.department_id == department_id).offset(skip).limit(limit).all()

def create_section(db: Session, section: schemas.ClassSectionCreate):
    db_section = models.ClassSection(**section.model_dump())
    db.add(db_section)
    db.commit()
    db.refresh(db_section)
    return db_section

def get_mappings(db: Session, department_id: str, skip: int = 0, limit: int = 100):
    return db.query(models.SectionSubjectMapping).filter(models.SectionSubjectMapping.department_id == department_id).offset(skip).limit(limit).all()

def create_mapping(db: Session, mapping: schemas.SectionSubjectMappingCreate):
    db_mapping = models.SectionSubjectMapping(**mapping.model_dump())
    db.add(db_mapping)
    db.commit()
    db.refresh(db_mapping)
    return db_mapping
