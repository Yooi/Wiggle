@echo off
REM Wiggle Windows Deployment Script
REM Usage: deploy.bat [platform]

setlocal EnableDelayedExpansion

set PLATFORM=%1
if "%PLATFORM%"=="" set PLATFORM=help

echo.
echo 🚀 Wiggle Deployment Tool (Windows)
echo ==================================

if "%PLATFORM%"=="vercel" goto deploy_vercel
if "%PLATFORM%"=="github" goto deploy_github  
if "%PLATFORM%"=="netlify" goto deploy_netlify
if "%PLATFORM%"=="zeabur" goto deploy_zeabur
if "%PLATFORM%"=="railway" goto deploy_railway
if "%PLATFORM%"=="all" goto show_all
goto show_help

:check_deps
echo [STEP] Checking project dependencies...
if not exist "package.json" (
    echo [ERROR] package.json file not found
    exit /b 1
)
if not exist "node_modules" (
    echo [WARNING] node_modules not found, installing dependencies...
    npm install
)
echo [INFO] Dependencies check completed
goto :eof

:build_project
echo [STEP] Building project...
npm run build
if errorlevel 1 (
    echo [ERROR] Build failed
    exit /b 1
)
echo [INFO] Project build completed
goto :eof

:deploy_vercel
call :check_deps
echo [STEP] Deploying to Vercel...
where vercel >nul 2>nul
if errorlevel 1 (
    echo [WARNING] Vercel CLI not installed, installing...
    npm install -g vercel
)
vercel --prod
if errorlevel 1 (
    echo [ERROR] Vercel deployment failed
    goto end
)
echo [INFO] ✅ Vercel deployment completed!
goto end

:deploy_github
call :check_deps
echo [STEP] Deploying to GitHub Pages...
where gh-pages >nul 2>nul
if errorlevel 1 (
    echo [WARNING] gh-pages not installed, installing...
    npm install -g gh-pages
)
call :build_project
if errorlevel 1 goto end
gh-pages -d dist
if errorlevel 1 (
    echo [ERROR] GitHub Pages deployment failed
    goto end
)
echo [INFO] ✅ GitHub Pages deployment completed!
goto end

:deploy_netlify
call :check_deps
echo [STEP] Deploying to Netlify...
where netlify >nul 2>nul
if errorlevel 1 (
    echo [WARNING] Netlify CLI not installed, installing...
    npm install -g netlify-cli
)
call :build_project
if errorlevel 1 goto end
netlify deploy --prod --dir=dist
if errorlevel 1 (
    echo [ERROR] Netlify deployment failed
    goto end
)
echo [INFO] ✅ Netlify deployment completed!
goto end

:deploy_railway
call :check_deps
echo [STEP] Deploying to Railway...
where railway >nul 2>nul
if errorlevel 1 (
    echo [WARNING] Railway CLI not installed, installing...
    npm install -g @railway/cli
)
call :build_project
if errorlevel 1 goto end
railway up
if errorlevel 1 (
    echo [ERROR] Railway deployment failed
    goto end
)
echo [INFO] ✅ Railway deployment completed!
goto end

:deploy_zeabur
echo [STEP] Zeabur deployment instructions...
echo [INFO] Zeabur supports automatic deployment from Git repositories
echo [INFO] Please visit: https://zeabur.com
echo [INFO] 1. Connect your GitHub account
echo [INFO] 2. Select this repository
echo [INFO] 3. System will automatically recognize zbpack.json configuration
echo [INFO] 4. Click deploy to start
echo.
echo [INFO] For more details, visit: https://zeabur.com/docs
goto end

:show_all
echo === Wiggle Deployment Options ===
echo.
echo 1. One-Click Deploy Buttons:
echo    - Vercel: https://vercel.com/new/clone?repository-url=YOUR_REPO
echo    - Netlify: https://app.netlify.com/start/deploy?repository=YOUR_REPO
echo    - Zeabur: https://zeabur.com/templates/TEMPLATE_ID
echo    - Railway: https://railway.app/new/template?template=YOUR_TEMPLATE
echo.
echo 2. Command Line Deployment:
echo    - deploy.bat vercel
echo    - deploy.bat github
echo    - deploy.bat netlify
echo    - deploy.bat railway
echo.
echo 3. Online Development:
echo    - Gitpod: https://gitpod.io/#YOUR_REPO
echo    - CodeSandbox: https://codesandbox.io/s/github/YOUR_REPO
echo    - StackBlitz: https://stackblitz.com/github/YOUR_REPO
echo.
echo 4. Manual Deployment:
echo    - Build: npm run build
echo    - Deploy dist folder to any static hosting
goto end

:show_help
echo Wiggle One-Click Deployment Script (Windows)
echo.
echo Usage:
echo   deploy.bat [platform]
echo.
echo Supported platforms:
echo   vercel     - Deploy to Vercel
echo   github     - Deploy to GitHub Pages
echo   netlify    - Deploy to Netlify
echo   railway    - Deploy to Railway
echo   zeabur     - Show Zeabur deployment instructions
echo   all        - Show all deployment options
echo.
echo Examples:
echo   deploy.bat vercel
echo   deploy.bat github
echo   deploy.bat netlify
echo.
echo For more information, see: DEPLOY.md
echo.
echo Requirements:
echo   - Node.js 18 or higher
echo   - npm or yarn package manager
echo   - Git repository setup

:end
echo.
echo Deployment script completed.
echo.
pause
