#!/usr/bin/env bash
# Install opencode from local build
# Builds the binary and installs it to ~/.bun/bin/opencode

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

# Install to bun bin directory (replacing any existing symlink or binary)
BUN_BIN="${BUN_INSTALL:-$HOME/.bun}/bin"
INSTALL_PATH="$BUN_BIN/opencode"

echo "📋 Installing to $INSTALL_PATH..."
mkdir -p "$BUN_BIN"

# Remove existing symlink if present
if [ -L "$INSTALL_PATH" ]; then
    rm "$INSTALL_PATH"
fi

cp "$DIST_BINARY" "$INSTALL_PATH"
chmod +x "$INSTALL_PATH"

# Re-sign on macOS (cp invalidates adhoc linker signatures)
if [ "$OS" = "darwin" ]; then
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

# Check if bun bin is in PATH
if ! echo "$PATH" | grep -q "$BUN_BIN"; then
    echo "⚠️  Note: $BUN_BIN may not be in your PATH"
    echo "   Add this to your shell profile:"
    echo "   export PATH=\"$BUN_BIN:\$PATH\""
fi
