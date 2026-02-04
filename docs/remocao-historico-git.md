# Procedimento de Remoção de Arquivo do Histórico Git

Este documento descreve os passos técnicos executados para remover permanentemente o arquivo `2026-02-03-veja-as-docs-monte-um-plano-e-crie-um-projeto-com.txt` de todo o histórico de commits do repositório.

Como o arquivo havia sido comitado anteriormente e o projeto avançou, apenas deletar o arquivo e fazer um novo commit não seria suficiente (o arquivo ainda existiria no histórico antigo). Foi necessário reescrever a história do Git.

## Passos Executados

### 1. Backup de Segurança
Antes de iniciar a operação destrutiva, criamos um branch de backup apontando para o estado atual.
```bash
git branch backup-before-cleanup
```

### 2. Reescrever o Histórico (Filter-Branch)
Utilizamos o comando `git filter-branch` para passar por cada commit e executar um comando de remoção.

```bash
git filter-branch --force --index-filter "git rm --cached --ignore-unmatch 2026-02-03-veja-as-docs-monte-um-plano-e-crie-um-projeto-com.txt" --prune-empty --tag-name-filter cat -- --all
```

**Explicação dos parâmetros:**
*   `--index-filter`: Permite reescrever o índice (staging area) sem precisar fazer checkout de cada commit (muito mais rápido).
*   `git rm --cached --ignore-unmatch <arquivo>`: O comando executado em cada commit. 
    *   `--cached`: Remove do índice git, mas não apagaria do disco se estivéssemos fazendo checkout (neste contexto, garante a remoção do registro do git).
    *   `--ignore-unmatch`: Impede que o comando falhe se o arquivo não existir naquele commit específico (essencial, pois o arquivo não existia nos primeiros commits).
*   `--prune-empty`: Remove commits que ficarem vazios após a remoção do arquivo.
*   `--all`: Aplica a mudança em todos os branches e tags.

### 3. Limpeza de Referências Locais
O `filter-branch` cria backups automáticos em `refs/original/`. Removemos essas referências para limpar o repositório local.

```powershell
git for-each-ref --format="%(refname)" refs/original/ | % { git update-ref -d $_ }
```

### 4. Atualização do Repositório Remoto (Force Push)
Como o histórico local divergiu do remoto (os hashes dos commits mudaram), foi necessário forçar a atualização.

```bash
git push origin --force --all
```

## Resultado
O arquivo foi removido desde o primeiro commit onde apareceu, sem deixar rastros no histórico, garantindo que não possa ser recuperado através de logs antigos.
