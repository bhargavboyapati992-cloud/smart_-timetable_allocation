from pydantic import BaseModel
from typing import List, Optional

class TeacherBase(BaseModel):
    name: str
    department_id: str

class TeacherCreate(TeacherBase):
    pass

class Teacher(TeacherBase):
    id: int
    is_active: bool
    class Config:
        from_attributes = True

class RoomBase(BaseModel):
    name: str
    room_type: str
    capacity: int = 60
    department_id: str

class RoomCreate(RoomBase):
    pass

class Room(RoomBase):
    id: int
    class Config:
        from_attributes = True

class SubjectBase(BaseModel):
    name: str
    type: str # 'Theory' or 'Lab'
    hours_per_week: int
    semester: str
    department_id: str

class SubjectCreate(SubjectBase):
    pass

class Subject(SubjectBase):
    id: int
    class Config:
        from_attributes = True
        
class ClassSectionBase(BaseModel):
    name: str
    semester: str
    student_count: int = 60
    department_id: str

class ClassSectionCreate(ClassSectionBase):
    pass

class ClassSection(ClassSectionBase):
    id: int
    class Config:
        from_attributes = True

class ConstraintsConfig(BaseModel):
    department_id: str
    days_per_week: int = 6
    periods_per_day: int = 7
    max_consecutive_classes: int = 3
    
    class Config:
        from_attributes = True

class TeachingAssistantBase(BaseModel):
    name: str
    department_id: str

class TeachingAssistantCreate(TeachingAssistantBase):
    pass

class TeachingAssistant(TeachingAssistantBase):
    id: int
    class Config:
        from_attributes = True

class SectionSubjectMappingBase(BaseModel):
    department_id: str
    section_id: int
    subject_id: int
    teacher_id: int
    secondary_teacher_id: Optional[int] = None

class SectionSubjectMappingCreate(SectionSubjectMappingBase):
    pass

class SectionSubjectMapping(SectionSubjectMappingBase):
    id: int
    class Config:
        from_attributes = True
