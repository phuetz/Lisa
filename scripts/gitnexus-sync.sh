#!/usr/bin/env bash
# gitnexus-sync.sh — Index Lisa into GitNexus and generate doc
set -e

GREEN='\033[0;32m' YELLOW='\033[1;33m' NC='\033[0m'
REPO="D:/CascadeProjects/Lisa"
GITNEXUS="${GITNEXUS_BIN:-gitnexus}"

echo -e "${YELLOW}▶ Indexing Lisa in GitNexus...${NC}"
"$GITNEXUS" index --path "$REPO"
echo -e "${GREEN}✓ Index complete${NC}"

echo -e "${YELLOW}▶ Generating HTML documentation...${NC}"
"$GITNEXUS" generate html --path "$REPO"
echo -e "${GREEN}✓ Doc generated: $REPO/.gitnexus/docs/index.html${NC}"

echo -e "\n${GREEN}✅ Lisa knowledge graph ready!${NC}"
