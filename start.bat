@echo off
chcp 65001 >nul
cd /d "%~dp0"

REM Use Hermes venv Python
set "PYTHON_PATH=C:\Users\cweiy\AppData\Local\hermes\hermes-agent\venv\Scripts\python.exe"
%PYTHON_PATH% main.py

pause