# =============================================================================
# Script de Reset da Demonstração ao Vivo — QAfé Academy (qafeally)
# Restaura a branch 'main' para o estado inicial com falhas de acessibilidade
# e recria as branches de Pull Request (aprovado e rejeitado) para nova palestra.
# =============================================================================

Write-Host "🔄 Restaurando o repositório 'qafeally' para o estado inicial da palestra..." -ForegroundColor Cyan

# 1. Busca todas as tags e branches do remoto
git fetch --all --tags

# 2. Restaura a branch main para a tag 'estado-inicial-palestra'
git checkout main
git reset --hard estado-inicial-palestra

# 3. Restaura as branches de PR a partir das tags de backup
git checkout -B ao-vivo/pr-aprovado tag-pr-aprovado
git checkout -B ao-vivo/pr-rejeitado tag-pr-rejeitado
git checkout main

# 4. Envia tudo para o GitHub (Nota: O Ruleset da main deve estar 'Disabled' no momento do force push)
Write-Host "🚀 Enviando branches restauradas para o GitHub..." -ForegroundColor Yellow
git push --force origin main
git push --force origin ao-vivo/pr-aprovado
git push --force origin ao-vivo/pr-rejeitado

Write-Host "✅ Pronto! A branch 'main' voltou para a versão com erros e as branches 'ao-vivo/*' estão prontas!" -ForegroundColor Green
Write-Host "👉 Lembre-se de voltar o Ruleset da 'main' para 'Active' em Settings > Rules > Rulesets no GitHub." -ForegroundColor Cyan
