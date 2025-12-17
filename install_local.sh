#!/usr/bin/env bash
set -e

# 1. Build the local binary
echo "🔨 Building opencode from source..."
cd packages/opencode
export PATH="$HOME/.bun/bin:$PATH"
bun run build --single

# 2. Setup the bin directory
INSTALL_DIR="$HOME/.opencode/bin"
mkdir -p "$INSTALL_DIR"

# 3. Detect architecture and copy binary
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
if [[ "$OS" == "darwin" ]]; then
  PLATFORM="darwin"
elif [[ "$OS" == "linux" ]]; then
  PLATFORM="linux"
else
  PLATFORM=$OS
fi

ARCH=$(uname -m)
if [[ "$ARCH" == "x86_64" ]]; then
  ARCH="x64"
elif [[ "$ARCH" == "aarch64" ]]; then
  ARCH="arm64"
fi

BINARY_DIR="opencode-$PLATFORM-$ARCH"
echo "📦 Copying binary from dist/$BINARY_DIR..."
cp "dist/$BINARY_DIR/bin/opencode" "$INSTALL_DIR/opencode"
chmod +x "$INSTALL_DIR/opencode"

echo "✅ Installed to $INSTALL_DIR/opencode"

# 4. Check PATH
if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
    echo "⚠️  $INSTALL_DIR is not in your PATH."
    echo "Add this to your .zshrc or .bashrc:"
    echo "export PATH=\"\$HOME/.opencode/bin:\$PATH\""
else
    echo "🚀 You're all set! Run 'opencode' to start."
fi
