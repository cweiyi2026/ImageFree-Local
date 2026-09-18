#!/usr/bin/env python3
"""
ImageFree Local - 启动脚本 (可双击运行)
使用项目虚拟环境的 Python 解释器
"""
import os
import sys
import subprocess
from pathlib import Path

# 项目根目录
ROOT = Path(__file__).parent

# 使用 Hermes 的虚拟环境 Python
VENV_PYTHON = Path(r"C:\Users\cweiy\AppData\Local\hermes\hermes-agent\venv\Scripts\python.exe")

def main():
    # 切换到项目目录
    os.chdir(ROOT)
    
    # 检查依赖
    if not VENV_PYTHON.exists():
        print(f"❌ 虚拟环境 Python 不存在: {VENV_PYTHON}")
        input("按回车退出...")
        return 1
    
    # 安装依赖（如果需要）
    req_file = ROOT / "requirements.txt"
    if req_file.exists():
        print("📦 检查依赖...")
        subprocess.run([str(VENV_PYTHON), "-m", "pip", "install", "-q", "-r", str(req_file)], check=False)
    
    # 杀掉占用 8090 端口的进程
    print("🔍 检查端口 8090...")
    subprocess.run(["taskkill", "/F", "/IM", "python.exe", "/FI", "WINDOWTITLE eq *8090*"], 
                   capture_output=True, shell=True)
    
    # 启动服务
    print("🚀 启动 ImageFree Local (http://localhost:8090)...")
    print("   按 Ctrl+C 停止\n")
    
    try:
        subprocess.run([str(VENV_PYTHON), "main.py"], check=True)
    except KeyboardInterrupt:
        print("\n👋 已停止")
    except subprocess.CalledProcessError as e:
        print(f"\n❌ 启动失败: {e}")
        input("按回车退出...")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())