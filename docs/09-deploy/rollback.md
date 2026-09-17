# Rollback

Status: PARCIALMENTE IMPLEMENTADA

## Backend/frontend

Rollback deve ser feito retornando para uma versao anterior do deploy na plataforma usada.

## Banco

Nao foi identificado um conjunto de migrations reversas. Para producao, usar backup/snapshot antes de mudancas estruturais.

## Checklist

1. Identificar versao com problema.
2. Parar deploy automatico se necessario.
3. Restaurar backend/frontend anterior.
4. Avaliar impacto no banco.
5. Restaurar backup somente com autorizacao e plano de perda de dados.
6. Registrar incidente e correcao.
