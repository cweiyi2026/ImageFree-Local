@echo off
chcp 65001 >nul
cd /d "%~dp0"

REM 使用 Hermes 虚拟环境 Python 启动
set PYTHON_PATH="C:\Users\cweiy\AppData\Local\hermes\hermes-agent\venv\Scripts\python.exe"
%PYTHON_PATH% main.py

pause