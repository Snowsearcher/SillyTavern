@echo off
setlocal
pushd %~dp0

title SnowBunny
set NODE_ENV=production

echo.
echo ==============================================
echo               SnowBunny
echo ==============================================
echo Updating the SnowBunny branch...

git --version >nul 2>&1
if errorlevel 1 (
    echo Git is not installed or is not available in PATH.
    goto :end
)

if not exist .git (
    echo This launcher must stay inside the SnowBunny-ST folder.
    goto :end
)

git fetch origin snowbunny-mobile
if errorlevel 1 goto :update_failed

git checkout snowbunny-mobile >nul 2>&1
if errorlevel 1 goto :update_failed

git pull --ff-only origin snowbunny-mobile
if errorlevel 1 goto :update_failed

echo.
echo Checking app packages...
call npm install --no-save --no-audit --no-fund --loglevel=error --no-progress --omit=dev --ignore-scripts
if errorlevel 1 goto :install_failed

echo.
echo Starting SnowBunny...
echo Keep this window open while SnowBunny is running.
echo.
node server.js
goto :end

:update_failed
echo.
echo SnowBunny could not update automatically.
echo Your files were left in place. Show the message above when asking for help.
goto :end

:install_failed
echo.
echo SnowBunny could not finish checking its packages.
echo Show the message above when asking for help.

:end
echo.
pause
popd
endlocal
