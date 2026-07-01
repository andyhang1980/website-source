#!/bin/bash
# ============================================================
# Android APK Build Script
# Build the exam app APK on the server
# ============================================================
set -e

DEPLOY_DIR="/opt/exam_system"
BUILD_DIR="/tmp/exam_app_build"
APK_DEST="$DEPLOY_DIR/exam_system/static/apk"

echo "=== Android APK Build ==="

# 1. Install JDK 17
echo "[1/5] Installing JDK 17..."
apt-get update -qq
apt-get install -y -qq openjdk-17-jdk-headless unzip wget 2>/dev/null
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH=$JAVA_HOME/bin:$PATH
echo "Java version: $(java -version 2>&1 | head -1)"

# 2. Copy exam_app to build directory
echo "[2/5] Preparing build directory..."
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"
cp -r "$DEPLOY_DIR/exam_app/"* "$BUILD_DIR/"
cd "$BUILD_DIR"

# 3. Download Gradle if not present
echo "[3/5] Setting up Gradle..."
GRADLE_VERSION="8.2"
GRADLE_DIST="gradle-${GRADLE_VERSION}-bin"
if [ ! -f "gradlew" ]; then
    # Create gradle wrapper
    if [ ! -d "/opt/gradle-${GRADLE_VERSION}" ]; then
        echo "Downloading Gradle ${GRADLE_VERSION}..."
        wget -q "https://mirrors.huaweicloud.com/gradle/${GRADLE_DIST}.zip" -O "/tmp/${GRADLE_DIST}.zip" 2>/dev/null || \
        wget -q "https://services.gradle.org/distributions/${GRADLE_DIST}.zip" -O "/tmp/${GRADLE_DIST}.zip"
        unzip -q "/tmp/${GRADLE_DIST}.zip" -d /opt/
        rm -f "/tmp/${GRADLE_DIST}.zip"
    fi
    export PATH="/opt/gradle-${GRADLE_VERSION}/bin:$PATH"
    gradle wrapper --gradle-version ${GRADLE_VERSION}
fi

# Make gradlew executable
chmod +x gradlew

# 4. Build APK
echo "[4/5] Building APK (this may take a few minutes)..."
./gradlew assembleDebug --no-daemon --stacktrace 2>&1 | tail -20

# 5. Copy APK to web directory
echo "[5/5] Deploying APK..."
mkdir -p "$APK_DEST"
APK_FILE=$(find "$BUILD_DIR/app/build/outputs/apk/debug/" -name "*.apk" | head -1)
if [ -n "$APK_FILE" ]; then
    cp "$APK_FILE" "$APK_DEST/exam-app.apk"
    echo ""
    echo "=== APK Build Success ==="
    echo "APK location: $APK_DEST/exam-app.apk"
    echo "Download URL: http://47.82.98.61/pc/apk/exam-app.apk"
    echo ""
    ls -lh "$APK_DEST/exam-app.apk"
else
    echo "ERROR: APK file not found after build!"
    exit 1
fi
