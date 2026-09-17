# Criterios de aceitacao

- Autenticacao: sem sessao, usuario e direcionado para login; com token invalido, API retorna 401.
- Locais: criar retorna 201; editar preserva campos nao enviados; excluir marca local como inativo.
- Plantoes: criar com data valida gera plantao; conflito de horario retorna 409.
- Recorrencia: requer quantidade ou data final; gera multiplas ocorrencias.
- Recebiveis: marcar como pago define `status=received` e `received_date`.
- Relatorio: CSV deve ser baixado por usuario autenticado.
- Push: inscricao depende de permissao do navegador e VAPID configurado.
- Mobile: build mobile deve apontar para API HTTPS absoluta.
