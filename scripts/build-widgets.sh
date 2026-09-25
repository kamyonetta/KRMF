#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/.."

APP="${1:-src-tauri/target/release/bundle/macos/KRMF.app}"
XCODE_PROJECT="$HOME/Desktop/KRMFProvisioning/KRMFProvisioning.xcodeproj"
DERIVED_DATA="/tmp/KRMFWidgetBuild"
WIDGET="$DERIVED_DATA/Build/Products/Release/widgetsExtension.appex"

TEAM="56PQ4C62FB"

echo "Building KRMF widget extension with Xcode..."

rm -rf "$DERIVED_DATA"

xcodebuild \
  -project "$XCODE_PROJECT" \
  -scheme widgetsExtension \
  -configuration Release \
  -derivedDataPath "$DERIVED_DATA" \
  CODE_SIGN_STYLE=Automatic \
  DEVELOPMENT_TEAM="$TEAM" \
  build

if [ ! -d "$WIDGET" ]; then
  echo "ERROR: Xcode did not produce widgetsExtension.appex"
  exit 1
fi

echo "Embedding widget extension into KRMF..."

mkdir -p "$APP/Contents/PlugIns"

rm -rf "$APP/Contents/PlugIns/KRMFWidgets.appex"
rm -rf "$APP/Contents/PlugIns/widgetsExtension.appex"

cp -R "$WIDGET" "$APP/Contents/PlugIns/widgetsExtension.appex"

echo "Verifying widget signature..."
codesign --verify --strict --verbose=2 \
  "$APP/Contents/PlugIns/widgetsExtension.appex"

echo "Widget embedded successfully."

# The registered group.* App Group requires the host provisioning profile too.
# Without it Sequoia denies snapshot writes even though codesign verifies.
HOST_PROFILE="$DERIVED_DATA/Build/Products/Release/KRMFProvisioning.app/Contents/embedded.provisionprofile"
if [ ! -f "$HOST_PROFILE" ]; then
  echo "ERROR: Missing Xcode host App Group provisioning profile"
  exit 1
fi
cp "$HOST_PROFILE" "$APP/Contents/embedded.provisionprofile"
xattr -dr com.apple.FinderInfo "$APP"
xattr -dr com.apple.ResourceFork "$APP"

echo "Re-signing KRMF after embedding widget..."

IDENTITY="${APPLE_SIGNING_IDENTITY:-Apple Development: efecanshenturk@icloud.com (9STUX3Y94Y)}"

/usr/bin/codesign \
  --force \
  --options runtime \
  --entitlements src-tauri/Entitlements.plist \
  --sign "$IDENTITY" \
  "$APP"

echo "Verifying complete KRMF bundle..."
/usr/bin/codesign --verify --deep --strict --verbose=2 "$APP"

echo "KRMF widget build complete."
