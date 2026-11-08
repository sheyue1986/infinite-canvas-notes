@echo off
cd /d "%~dp0"
if not exist "dist\index.html" (
  echo First run "npm ci" and "npm run build" in this folder.
  pause
  exit /b 1
)
call npm.cmd start -- --open
if errorlevel 1 pause
