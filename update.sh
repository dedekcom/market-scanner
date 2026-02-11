#!/bin/bash
set -euo pipefail

# ======================================================
# KONFIGURACJA
# ======================================================
EXPECTED_REPO="market-scanner"
SOURCE_DIR="/c/projects/rust/boda/PortfolioGeneral2/market-lab/out/html/strategies"
USE_ORPHAN=false

# ======================================================
# FUNKCJE
# ======================================================
delete_page() {
    echo "Deleting old page files..."
    find . -maxdepth 1 -type f \( \
        -name "*.html" -o \
        -name "*.png"  -o \
        -name "*.js"   -o \
        -name "*.css" \
    \) -delete
}

# ======================================================
# PARSOWANIE ARGUMENTÓW
# ======================================================
for arg in "$@"; do
    case "$arg" in
        --orphan)
            USE_ORPHAN=true
            ;;
        *)
            echo "Unknown argument: $arg"
            exit 1
            ;;
    esac
done

# ======================================================
# BEZPIECZEŃSTWO: SPRAWDZENIE REPO
# ======================================================
REPO_ROOT=$(git rev-parse --show-toplevel)
REPO_NAME=$(basename "$REPO_ROOT")

if [ "$REPO_NAME" != "$EXPECTED_REPO" ]; then
    echo "ERROR: This script must be run inside repo '$EXPECTED_REPO'"
    echo "Detected repo: $REPO_NAME"
    exit 1
fi

cd "$REPO_ROOT"

# ======================================================
# WALIDACJA
# ======================================================
if [ ! -d "$SOURCE_DIR" ]; then
    echo "ERROR: SOURCE_DIR does not exist: $SOURCE_DIR"
    exit 1
fi

# ======================================================
# IDMPOTENTNY CHECK BRANCHU MAIN
# ======================================================
if ! git show-ref --quiet refs/heads/main; then
    echo "Branch 'main' does not exist locally. Creating from current HEAD."
    git branch -M main
fi

CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "Switching to branch 'main'"
    git checkout main
fi

# ======================================================
# TRYB ORPHAN (OPCJONALNY)
# ======================================================
if [ "$USE_ORPHAN" = true ]; then
    echo "Running in ORPHAN mode (history will be replaced)"
    git checkout --orphan tmp-orphan
    delete_page
fi

# ======================================================
# CZYSZCZENIE STARYCH PLIKÓW
# ======================================================
delete_page

# ======================================================
# KOPIOWANIE NOWEJ STRONY (tylko zawartość katalogu)
# ======================================================
echo "Copying new page files..."
cp -r "$SOURCE_DIR"/* .

# ======================================================
# COMMIT
# ======================================================
git add .
git commit -m "update $(date +%Y-%m-%d)" || echo "Nothing to commit"

# ======================================================
# FINALIZACJA ORPHAN
# ======================================================
if [ "$USE_ORPHAN" = true ]; then
    git branch -M main
    git push --force
else
    git push
fi

echo "Update completed successfully."

