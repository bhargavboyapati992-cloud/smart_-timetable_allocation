@echo off
echo Starting Timetable Application...

echo [1/2] Booting FastAPI Backend...
start cmd /k "cd backend && ..\venv\Scripts\activate && uvicorn main:app --reload"

echo [2/2] Booting React Frontend Dashboard...
start cmd /k "cd frontend && npm run dev"

echo Both services launched in separate windows!
exit
