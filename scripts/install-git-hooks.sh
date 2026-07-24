#!/bin/sh
# One-time setup: installs the hooks in scripts/ into .git/hooks/, since git
# doesn't version or auto-install hooks itself. Re-run this after cloning the
# repo fresh, or if .git/hooks/pre-commit ever gets wiped.
repo_root="$(git rev-parse --show-toplevel)"
cp "$repo_root/scripts/pre-commit" "$repo_root/.git/hooks/pre-commit"
chmod +x "$repo_root/.git/hooks/pre-commit"
echo "Installed pre-commit hook."
