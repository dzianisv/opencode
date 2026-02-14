#!/usr/bin/env bash
set -e

REPO="https://github.com/dzianisv/opencode.git"
BRANCH="main"
BUILD_DIR="${TMPDIR:-/tmp}/opencode-build-$$"

cleanup() { rm -rf "$BUILD_DIR"; }
trap cleanup EXIT

if ! command -v bun &>/dev/null; then
  echo "Installing bun..."
  curl -fsSL https://bun.sh/install | bash
  export PATH="$HOME/.bun/bin:$PATH"
fi

echo "Cloning $REPO ($BRANCH)..."
git clone --depth 1 --branch "$BRANCH" "$REPO" "$BUILD_DIR"

echo "Installing dependencies..."
cd "$BUILD_DIR"
bun install

echo "Building..."
bun run --cwd packages/opencode build --single --skip-install

OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)
case "$ARCH" in
  x86_64) ARCH="x64" ;;
  aarch64|arm64) ARCH="arm64" ;;
esac

DIST_BINARY="$BUILD_DIR/packages/opencode/dist/opencode-${OS}-${ARCH}/bin/opencode"
if [ ! -f "$DIST_BINARY" ]; then
  echo "Build failed: binary not found"
  exit 1
fi

EXISTING=$(command -v opencode 2>/dev/null || true)
if [ -n "$EXISTING" ]; then
  INSTALL_PATH=$(realpath "$EXISTING" 2>/dev/null || readlink -f "$EXISTING" 2>/dev/null || echo "$EXISTING")
else
  INSTALL_PATH="$HOME/.opencode/bin/opencode"
fi
INSTALL_DIR=$(dirname "$INSTALL_PATH")

mkdir -p "$INSTALL_DIR"
[ -L "$INSTALL_PATH" ] && rm "$INSTALL_PATH"
cp "$DIST_BINARY" "$INSTALL_PATH"
chmod +x "$INSTALL_PATH"

if [ "$OS" = "darwin" ]; then
  codesign --force --sign - "$INSTALL_PATH" 2>/dev/null || true
fi

VERSION=$("$INSTALL_PATH" --version 2>/dev/null || echo "unknown")
echo ""
echo "opencode $VERSION installed to $INSTALL_PATH"

if ! echo "$PATH" | grep -q "$INSTALL_DIR"; then
  echo "Add to PATH: export PATH=\"$INSTALL_DIR:\$PATH\""
fi
