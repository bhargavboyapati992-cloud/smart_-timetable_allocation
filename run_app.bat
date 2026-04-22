@echo off
echo Cleaning up old processes...
taskkill /f /im ngrok.exe /t >nul 2>&1
taskkill /f /im python.exe /t >nul 2>&1
taskkill /f /im node.exe /t >nul 2>&1
wmic process where "commandline like '%%uvicorn%%'" delete >nul 2>&1
wmic process where "commandline like '%%ngrok%%'" delete >nul 2>&1
timeout /t 2 >nul

echo Starting Timetable Application...

echo [1/3] Booting FastAPI Backend...
echo ------------------------------------------------------------
echo NOTE: If the Backend window closes instantly, check for errors.
echo ------------------------------------------------------------
start "Backend" cmd /k "cd backend && ..\venv\Scripts\activate && uvicorn main:app --host localhost --port 8080 --reload"
timeout /t 10 >nul

echo [2/3] Starting Permanent Ngrok Tunnel...
echo ------------------------------------------------------------
echo URL: https://factor-driven-kooky.ngrok-free.dev
echo ------------------------------------------------------------
ngrok config add-authtoken rd_3ChDx5frMYXLT3LeRjvqOD6T37g
start "Ngrok Tunnel" cmd /k "ngrok http 8080 --url https://factor-driven-kooky.ngrok-free.dev"
timeout /t 5 >nul

echo [3/3] Booting React Frontend Dashboard...
start "Frontend" cmd /k "cd frontend && npm run dev"

echo All services launched!
echo The portal is now live at: https://beautiful-tarsier-7dd4ff.netlify.app/
exit


