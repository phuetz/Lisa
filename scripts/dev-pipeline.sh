#!/usr/bin/env bash
# dev-pipeline.sh — Lisa development pipeline
set -e

GREEN='\033[0;32m' RED='\033[0;31m' YELLOW='\033[1;33m' NC='\033[0m'

step() { echo -e "\n${YELLOW}▶ $1${NC}"; }
ok()   { echo -e "${GREEN}✓ $1${NC}"; }
fail() { echo -e "${RED}✗ $1${NC}"; exit 1; }

step "Git pull"
git pull && ok "Up to date" || fail "Pull failed"

step "Dependencies"
if git diff HEAD~1 --name-only 2>/dev/null | grep -q "package.json\|pnpm-lock"; then
  pnpm install && ok "Dependencies updated" || fail "Install failed"
else
  ok "No changes in package.json, skipping install"
fi

step "TypeScript build"
pnpm run build && ok "Build successful" || fail "Build failed"

step "Tests"
pnpm run test --run && ok "All tests passed" || fail "Tests failed"

echo -e "\n${GREEN}✅ Pipeline complete!${NC}"
