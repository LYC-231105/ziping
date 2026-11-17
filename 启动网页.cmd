@echo off
chcp 65001 >nul
setlocal
set "ZIPING_NODE="
for /f "delims=" %%N in ('where node 2^>nul') do if not defined ZIPING_NODE set "ZIPING_NODE=%%N"
if not defined ZIPING_NODE set "ZIPING_NODE=C:\Program Files\WindowsApps\OpenAI.CodexPrimaryRuntime.v26-1112-737-0_26.1112.737.0_x64__3k8sg7r9htsxt\dependencies\node\bin\node.exe"
if not exist "%ZIPING_NODE%" (
  echo 未找到Node.js。你可以直接打开同目录的index.html使用排盘、详批、教学和完整古籍阅读检索。
  pause
  exit /b 1
)
"%ZIPING_NODE%" "%~dp0server.cjs" --open
if errorlevel 1 pause
endlocal
