#!/bin/bash
bun run build --single && mkdir -p ~/.local/bin && cp dist/*/bin/opencode ~/.local/bin/opencode
