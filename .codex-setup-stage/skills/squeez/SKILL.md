---
name: squeez
description: Skill opcional para avaliar compressão agressiva e deduplicação de terminal em Codex e outros CLIs. Use somente quando o usuário pedir Squeez ou um teste por projeto; não ative globalmente por padrão.
---

# Squeez (opcional e desativado)

Fonte: https://github.com/claudioemmanuel/squeez

## Regras

- Antes de ativar, leia `install.sh` e os hooks Codex no repositório-fonte.
- Teste por projeto com logs conhecidos e compare saída original/comprimida.
- Não combine inicialmente com Chop nem outro compressor hook-based.
- Não permita que hooks reescrevam comandos sensíveis ou contornem approvals.
- Desative se perder erro, stack, arquivo, linha, coluna, comando ou versão.

Repositório local de referência: `~/.agents/_sources/squeez`.
