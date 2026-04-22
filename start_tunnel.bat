@echo off
echo Restarting Cloudflare Tunnel...
echo ------------------------------------------------------------
echo PLEASE COPY THE '.trycloudflare.com' URL FROM THE NEW WINDOW
echo ------------------------------------------------------------
ngrok config add-authtoken 3ChDwgDCujVeO4JTkcaj9ntD24a_46QYQkz7yjP5RRJDC8xxv
ngrok.exe http --url=factor-driven-kooky.ngrok-free.dev 8000
pause
