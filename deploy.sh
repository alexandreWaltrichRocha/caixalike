#!/usr/bin/env bash
# =============================================================
# CaixaLike — Deploy (commit + push → GitHub Actions publica)
#
# Uso:
#   bash deploy.sh                      # usa o repositório padrão
#   bash deploy.sh USUARIO [repo]       # outro usuário/repositório
#   bash deploy.sh USUARIO repo "msg"   # com mensagem de commit
# =============================================================
set -euo pipefail

GITHUB_USER="${1:-alexandreWaltrichRocha}"
REPO_NAME="${2:-caixalike}"
COMMIT_MSG="${3:-chore: atualização do site}"
REPO_URL="https://github.com/${GITHUB_USER}/${REPO_NAME}.git"

cd "$(dirname "${BASH_SOURCE[0]}")"

command -v git >/dev/null || { echo "❌ git não instalado."; exit 1; }
[[ -f index.html && -f js/pagamentos.js ]] || { echo "❌ Execute dentro da pasta do projeto."; exit 1; }

if [[ ! -d .git ]]; then
  git init -q
  git branch -M main
  echo "✅ Repositório Git inicializado"
fi

if git remote get-url origin &>/dev/null; then
  git remote set-url origin "$REPO_URL"
else
  git remote add origin "$REPO_URL"
fi

git add -A
if git diff --cached --quiet; then
  echo "ℹ  Nada novo para commitar."
else
  git commit -q -m "$COMMIT_MSG"
  echo "✅ Commit criado: $COMMIT_MSG"
fi

echo "ℹ  Enviando para $REPO_URL …"
git push -u origin main

cat <<MSG

✅ Push concluído! O GitHub Actions publica o site automaticamente.

Primeira vez? Ative o Pages uma única vez:
  1. https://github.com/${GITHUB_USER}/${REPO_NAME}/settings/pages
  2. Em "Source" escolha: GitHub Actions

🌐 Site:    https://caixalike.com.br/
📊 Actions: https://github.com/${GITHUB_USER}/${REPO_NAME}/actions
MSG
