@echo off
cd /d "%~dp0"
title LexCR
set ANTHROPIC_BASE_URL=
set ANTHROPIC_AUTH_TOKEN=
set ANTHROPIC_API_KEY=
echo == LexCR ==

where node >nul 2>nul
if errorlevel 1 (
  echo Falta Node.js. Instale la version LTS desde https://nodejs.org y vuelva a abrir este archivo.
  start "" "https://nodejs.org/es/download"
  pause
  exit /b 1
)

node scripts\preparar.mjs
if errorlevel 1 goto error

if not exist "node_modules" (
  echo Instalando dependencias, solo la primera vez. Tarda unos minutos...
  call npm install --no-audit --no-fund
  if errorlevel 1 goto error
)

echo Preparando la base de datos...
call npx prisma db push --skip-generate
if errorlevel 1 goto error
call npx prisma generate >nul 2>nul

if not exist ".next\BUILD_ID" (
  echo Compilando la aplicacion...
  call npm run build
  if errorlevel 1 goto error
)

echo.
echo LexCR esta en http://localhost:3000
echo La primera vez, entre a "Registre su despacho" para crear su cuenta.
echo Para detenerla, cierre esta ventana.
start "" /b node scripts\abrir-navegador.mjs http://localhost:3000/registro
call npx next start -p 3000
goto :eof

:error
echo.
echo Ocurrio un error. Envie una captura de esta ventana para revisarlo.
pause
exit /b 1
