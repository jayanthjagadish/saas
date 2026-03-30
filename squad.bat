@echo off
REM Squad Launcher — initializes test infrastructure and opens Copilot with Squad agent
REM Usage: squad.bat

echo ============================================
echo  Squad Launcher v0.9.1
echo ============================================
echo.

REM Step 1: Install dependencies if needed
if not exist "node_modules" (
    echo [1/4] Installing dependencies...
    call npm install
) else (
    echo [1/4] Dependencies OK
)

REM Step 2: Provision test worker databases
echo [2/4] Provisioning test databases...
node tests\helpers\setup-worker-dbs.cjs
if %ERRORLEVEL% neq 0 (
    echo ERROR: Failed to provision test databases. Check MySQL is running.
    exit /b 1
)

REM Step 3: Run DB migrations
echo [3/4] Running database migrations...
cd packages\api
call npm run db:migrate 2>nul
cd ..\..

REM Step 4: Launch Copilot with Squad agent
echo [4/4] Launching Squad...
echo.
gh copilot-chat --agent Squad
