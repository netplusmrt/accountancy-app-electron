@echo off

echo.
echo =====================================
echo Reading and Setting GitHub Token
echo =====================================

set /p GITHUB_TOKEN=<E:\Apps\AccountancyApp\github-token.txt
set GH_TOKEN=%GITHUB_TOKEN%

echo GH_TOKEN=%GH_TOKEN%
echo GITHUB_TOKEN=%GITHUB_TOKEN%

echo Token Loaded Successfully

echo.
echo =====================================
echo Building Angular Application
echo =====================================

cd /d E:\Apps\AccountancyApp\accountancy-app-ng16

call npm run build-base-href

if %ERRORLEVEL% neq 0 (
    echo Angular build failed.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo =====================================
echo Building Electron Application
echo =====================================

cd /d E:\Apps\AccountancyApp\accountancy-app-electron

call npm run build

if %ERRORLEVEL% neq 0 (
    echo Electron build failed.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo =====================================
echo Publishing GitHub Release
echo =====================================

call npx electron-builder --publish always

if %ERRORLEVEL% neq 0 (
    echo.
    echo =====================================
    echo GitHub Release Publish Failed
    echo =====================================
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo =====================================
echo Build and GitHub Release Completed Successfully
echo =====================================
echo.
echo Angular App  : Build Successful
echo Electron App : Build Successful
echo GitHub       : Release Published
echo.

pause
