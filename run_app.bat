@echo off
echo Starting Timetable Application...

echo [1/3] Booting FastAPI Backend...
start "Backend" cmd /k "cd backend && ..\venv\Scripts\activate && uvicorn main:app --host 127.0.0.1 --port 8000 --reload"

echo [2/3] Starting Cloudflare Tunnel (Public Access)...
echo ------------------------------------------------------------
echo PLEASE COPY THE '.trycloudflare.com' URL FROM THE NEW WINDOW
echo ------------------------------------------------------------
start "Cloudflare Tunnel" cmd /k "cloudflared.exe tunnel --url http://127.0.0.1:8000"

echo [3/3] Booting React Frontend Dashboard...
start "Frontend" cmd /k "cd frontend && npm run dev"

echo All services launched!
echo If the public URL says 'Server unreachable', copy the tunnel URL and update it in the portal.
exit
