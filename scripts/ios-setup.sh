#!/usr/bin/env bash
# Run once on a Mac with Xcode installed:  bash scripts/ios-setup.sh
set -euo pipefail
cd "$(dirname "$0")/.."
npm install
[ -d ios ] || npx cap add ios
cp app-assets/icon-1024.png ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png
npx cap sync ios
npx cap open ios
