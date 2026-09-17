@echo off
echo ===================================================
echo        EVENT PASS - ANDROID APK BUILDER
echo ===================================================
echo.
echo Step 1: Building Web Assets and Syncing Capacitor Android...
call npm run build:android
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Web build failed!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo Step 2: Checking for Android Studio or Gradle...
if exist "android\gradlew.bat" (
    echo Gradle wrapper found in android\ folder.
    cd android
    echo Building Android APK (assembleRelease / assembleDebug)...
    call gradlew.bat assembleDebug
    if %ERRORLEVEL% EQU 0 (
        echo.
        echo [SUCCESS] APK Built successfully!
        echo APK File Location: android\app\build\outputs\apk\debug\app-debug.apk
        cd ..
        pause
        exit /b 0
    ) else (
        echo.
        echo [INFO] Direct command-line gradle build requires JDK.
        echo Opening project in Android Studio instead...
        cd ..
        call npx cap open android
    )
) else (
    echo Opening project in Android Studio...
    call npx cap open android
)

echo.
pause
