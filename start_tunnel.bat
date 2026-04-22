@echo off
echo Restarting Cloudflare Tunnel...
echo ------------------------------------------------------------
echo PLEASE COPY THE '.trycloudflare.com' URL FROM THE NEW WINDOW
echo ------------------------------------------------------------
cloudflared.exe tunnel --url http://127.0.0.1:8000
pause
