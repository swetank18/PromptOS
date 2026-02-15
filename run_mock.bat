@echo off
echo 🚀 Setting up Mock Backend Environment...

REM Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python not found. Please install Python 3.10+
    exit /b 1
)

REM Create venv if not exists
if not exist .venv (
    echo 📦 Creating virtual environment...
    python -m venv .venv
)

REM Activate venv
echo 🔌 Activating virtual environment...
call .venv\Scripts\activate.bat

REM Install dependencies
echo ⬇️  Installing dependencies...
python -m pip install fastapi uvicorn

REM Run server
echo.
echo ✅ Starting Mock Server...
echo    API URL: http://localhost:8000
echo    Docs: http://localhost:8000/docs
echo ⚠️  Press Ctrl+C to stop
echo.

python mock_server.py
