@echo off

echo Stopping all Node processes...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM electron.exe 2>nul

echo Waiting...
timeout /t 3 /nobreak >nul

echo Removing old Prisma client...
if exist "node_modules\.prisma" (
    rmdir /S /Q "node_modules\.prisma"
)

echo Generating new Prisma client...
npx prisma generate

echo Done! Now run 'npm run dev'
pause
