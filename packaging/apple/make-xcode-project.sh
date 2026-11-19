#!/bin/sh
# Generate (or regenerate) the Safari Web Extension Xcode project for macOS and iOS.
#   node packaging/build.mjs safari && sh packaging/apple/make-xcode-project.sh
# Then: sh packaging/apple/finish-xcode-project.sh (icons, Privacy Manifest).
# Change BUNDLE_ID to one registered under your Apple Developer team before submitting.
set -e
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BUNDLE_ID="${BUNDLE_ID:-io.github.loremypsum-cmd.auscultrix}"
xcrun safari-web-extension-converter "$ROOT/packaging/dist-safari" \
  --project-location "$ROOT/apple" \
  --app-name Auscultrix \
  --bundle-identifier "$BUNDLE_ID" \
  --swift --copy-resources --no-open --no-prompt --force
