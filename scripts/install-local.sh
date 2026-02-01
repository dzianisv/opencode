#!/usr/bin/env bash
# Install opencode from local build
# Finds the existing opencode install location and replaces it,
# or installs to ~/.opencode/bin/opencode by default.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
OPENCODE_PKG="$ROOT_DIR/packages/opencode"

echo "📦 Building opencode from local source..."
cd "$ROOT_DIR"

# Build the binary for current platform
bun run --cwd packages/opencode build --single --skip-install

# Determine platform-specific binary location
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)
case "$ARCH" in
    x86_64) ARCH="x64" ;;
    aarch64|arm64) ARCH="arm64" ;;
esac

PLATFORM_PKG="opencode-${OS}-${ARCH}"
DIST_BINARY="$OPENCODE_PKG/dist/$PLATFORM_PKG/bin/opencode"

if [ ! -f "$DIST_BINARY" ]; then
    echo "❌ Build failed: $DIST_BINARY not found"
    exit 1
fi

# Find existing opencode location or default to ~/.opencode/bin
EXISTING=$(command -v opencode 2>/dev/null || true)
if [ -n "$EXISTING" ]; then
    # Resolve symlinks to get the real path
    INSTALL_PATH=$(realpath "$EXISTING" 2>/dev/null || readlink -f "$EXISTING" 2>/dev/null || echo "$EXISTING")
    INSTALL_DIR=$(dirname "$INSTALL_PATH")
else
    INSTALL_DIR="$HOME/.opencode/bin"
    INSTALL_PATH="$INSTALL_DIR/opencode"
fi

echo "📋 Installing to $INSTALL_PATH..."
mkdir -p "$INSTALL_DIR"

# Remove existing symlink if present
if [ -L "$INSTALL_PATH" ]; then
    rm "$INSTALL_PATH"
fi

cp "$DIST_BINARY" "$INSTALL_PATH"
chmod +x "$INSTALL_PATH"

# Sign the binary on macOS to prevent Gatekeeper from killing it
if [ "$OS" = "darwin" ]; then
    echo "🔏 Signing binary for macOS..."
    codesign --force --sign - "$INSTALL_PATH" 2>/dev/null || true
fi
echo ""
echo "✅ opencode installed successfully!"
echo ""

# Verify installation
VERSION=$("$INSTALL_PATH" --version 2>/dev/null || echo "unknown")
echo "Version: $VERSION"
echo "Location: $INSTALL_PATH"
echo ""

# Check if install dir is in PATH
if ! echo "$PATH" | grep -q "$INSTALL_DIR"; then
    echo "⚠️  Note: $INSTALL_DIR may not be in your PATH"
    echo "   Add this to your shell profile:"
    echo "   export PATH=\"$INSTALL_DIR:\$PATH\""
fi
