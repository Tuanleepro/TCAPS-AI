@echo off
REM ─────────────────────────────────────────────────────────────────────────
REM TCAPS — Pancake → app daily sync (Windows Task Scheduler entry point).
REM
REM Steps:
REM   1. cd to project root
REM   2. SYNC_ONLY=1 node scripts\pancake-scrape.mjs    (refresh stock + imgs)
REM   3. If constants/products.ts changed → git add + commit + push
REM   4. Vercel auto-deploys on push
REM
REM Output goes to logs\sync-YYYY-MM-DD.log (one log per day, appended to).
REM Exit code 0 = clean run (with or without changes), non-zero = failure.
REM ─────────────────────────────────────────────────────────────────────────

setlocal enabledelayedexpansion

set "PROJECT_DIR=c:\APP AI\tcaps-app"
cd /d "%PROJECT_DIR%" || (echo Cannot cd into %PROJECT_DIR% & exit /b 1)

REM ── Build date string YYYY-MM-DD for the log filename ───────────────────
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value 2^>nul') do set "DT=%%I"
set "TODAY=!DT:~0,4!-!DT:~4,2!-!DT:~6,2!"
set "RUN_AT=!DT:~0,4!-!DT:~4,2!-!DT:~6,2! !DT:~8,2!:!DT:~10,2!:!DT:~12,2!"

if not exist logs mkdir logs
set "LOG=logs\sync-!TODAY!.log"

echo. >> "%LOG%"
echo ────────────────────────────────────────── >> "%LOG%"
echo [!RUN_AT!] Pancake -^> app sync starting >> "%LOG%"

REM ── 1. Sync (SYNC_ONLY mode) ────────────────────────────────────────────
set "SYNC_ONLY=1"
call node scripts\pancake-scrape.mjs >> "%LOG%" 2>&1
set "SYNC_EXIT=!ERRORLEVEL!"

if !SYNC_EXIT! NEQ 0 (
  echo [!RUN_AT!] X Sync failed with exit code !SYNC_EXIT! >> "%LOG%"
  endlocal
  exit /b !SYNC_EXIT!
)

REM ── 2. Skip commit if nothing changed (exit 0 from git diff = no diff) ──
git diff --quiet constants/products.ts
if !ERRORLEVEL! EQU 0 (
  echo [!RUN_AT!] OK No changes to commit. >> "%LOG%"
  endlocal
  exit /b 0
)

REM ── 3. Commit + push ────────────────────────────────────────────────────
echo [!RUN_AT!] Changes detected, committing... >> "%LOG%"

git add constants/products.ts >> "%LOG%" 2>&1
git commit -m "sync: auto refresh stock + images from Pancake (!TODAY!)" >> "%LOG%" 2>&1
git push >> "%LOG%" 2>&1
set "PUSH_EXIT=!ERRORLEVEL!"

if !PUSH_EXIT! EQU 0 (
  echo [!RUN_AT!] OK Pushed to GitHub. Vercel will redeploy in ~2 minutes. >> "%LOG%"
) else (
  echo [!RUN_AT!] X Push failed with exit code !PUSH_EXIT! >> "%LOG%"
)

endlocal
exit /b !PUSH_EXIT!
