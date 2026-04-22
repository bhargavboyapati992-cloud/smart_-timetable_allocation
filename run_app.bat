@echo off
echo Starting Timetable Application...

echo [1/3] Booting FastAPI Backend...
start "Backend" cmd /k "cd backend && ..\venv\Scripts\activate && uvicorn main:app --host 127.0.0.1 --port 8000 --reload"

echo [2/3] Starting Permanent Ngrok Tunnel...
echo ------------------------------------------------------------
echo URL: https://factor-driven-kooky.ngrok-free.dev
echo ------------------------------------------------------------
ngrok config add-authtoken 3ChDwgDCujVeO4JTkcaj9ntD24a_46QYQkz7yjP5RRJDC8xxv
start "Ngrok Tunnel" cmd /k "ngrok.exe http --domain=factor-driven-kooky.ngrok-free.dev 8000"

echo [3/3] Booting React Frontend Dashboard...
start "Frontend" cmd /k "cd frontend && npm run dev"

echo All services launched!
echo If the public URL says 'Server unreachable', copy the tunnel URL and update it in the portal.
exit
