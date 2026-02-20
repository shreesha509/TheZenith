@echo off
echo Starting Antigravity CI/CD Healing Agent backend...
echo Ensuring Node.js is running from the absolute install path.

"C:\Program Files\nodejs\node.exe" src/server.js

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo --------------------------------------------------------------------
    echo THE SERVER CRASHED OR FAILED TO START. 
    echo Did you install Docker Desktop and start the Docker Engine yet?
    echo Did you fill out the .env file with your API keys?
    echo --------------------------------------------------------------------
)
pause
