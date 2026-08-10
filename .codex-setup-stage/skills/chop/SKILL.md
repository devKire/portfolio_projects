---
name: chop
description: Use esta skill para comprimir logs grandes de terminal, build, lint, test, npm, pnpm, Docker, Git, kubectl ou Terraform. Não use quando a saída completa for exigida ou o erro puder ser ocultado.
---

# Chop

## Fonte original

Repositório: https://github.com/AgusRdz/chop

## Quando usar

- Saída longa e repetitiva de CLI.
- Build, lint ou testes com muito ruído.
- Inspeção inicial antes de pedir log bruto.

## Quando não usar

- Logs de segurança, auditoria ou debugging que exigem fidelidade integral.
- Quando `chop` não reconhecer o comando ou remover a causa.

## Instruções e segurança

- Use explicitamente: `chop <comando>`; não instale hook global automaticamente.
- Preserve erro principal, stack relevante, arquivo, linha, coluna, comando e versões.
- Se a compressão perder detalhe, repita o comando sem Chop com filtro focado.
- Não combine com Squeez sem teste por projeto.

## Economia de contexto

Carregue apenas arquivos necessários e resuma repetições sem apagar a causa.
