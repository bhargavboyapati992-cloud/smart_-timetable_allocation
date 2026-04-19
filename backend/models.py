from sqlalchemy import Boolean, Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from database import Base

class Teacher(Base):
    __tablename__ = "teachers"

    id = Column(Integer, primary_key=True, index=True)
    department_id = Column(String, index=True)
    name = Column(String, index=True)
    is_active = Column(Boolean, default=True)

class Room(Base):
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True)
    department_id = Column(String, index=True)
    name = Column(String, index=True)
    room_type = Column(String)  # 'Classroom', 'Lab', etc.
    capacity = Column(Integer, default=60)

class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    department_id = Column(String, index=True)
    name = Column(String, index=True)
    type = Column(String) # 'Theory', 'Practical/Lab'
    hours_per_week = Column(Integer)
    semester = Column(String)
    
class ClassSection(Base):
    __tablename__ = "sections"

    id = Column(Integer, primary_key=True, index=True)
    department_id = Column(String, index=True)
    name = Column(String, index=True)
    semester = Column(String)
    student_count = Column(Integer, default=60)

class ConstraintsConfig(Base):
    """Stores high-level global configurations for the solver like max periods per day"""
    __tablename__ = "constraints_config"

    id = Column(Integer, primary_key=True, index=True)
    department_id = Column(String, index=True)
    days_per_week = Column(Integer, default=6)
    periods_per_day = Column(Integer, default=7)
    max_consecutive_classes = Column(Integer, default=3)

class SectionSubjectMapping(Base):
    """Maps a specific Section to a Subject and the Teacher teaching it."""
    __tablename__ = "section_subject_mapping"

    id = Column(Integer, primary_key=True, index=True)
    department_id = Column(String, index=True)
    section_id = Column(Integer, ForeignKey("sections.id"))
    subject_id = Column(Integer, ForeignKey("subjects.id"))
    teacher_id = Column(Integer, ForeignKey("teachers.id"))
    
    # if it requires an alternative teacher (e.g. for labs where multiple teachers are present)
    secondary_teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=True)

class TeachingAssistant(Base):
    __tablename__ = "teaching_assistants"
    id = Column(Integer, primary_key=True, index=True)
    department_id = Column(String, index=True)
    name = Column(String, index=True)
