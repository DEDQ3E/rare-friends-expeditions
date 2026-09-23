@echo off
title Rare Friends: Expeditions
cd /d "%~dp0"
if not exist "launcher\serve.ps1" (
  echo Cannot find launcher\serve.ps1 next to this file.
  pause
  exit /b 1
)
if not exist "docs\index.html" (
  echo Cannot find the game build in docs\
  pause
  exit /b 1
)
echo Starting the game server. Keep this window open while you play.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0launcher\serve.ps1"
if errorlevel 1 pause
