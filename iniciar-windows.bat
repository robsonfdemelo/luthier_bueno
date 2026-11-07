@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nao encontrado. Instale Node.js 24 LTS pelo site https://nodejs.org/
  pause
  exit /b 1
)
echo.
echo Iniciando o Bueno Luthier em http://localhost:3000
npm start
pause
