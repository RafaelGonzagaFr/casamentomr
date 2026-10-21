# Banco de dados

Supabase PostgreSQL. supabase/schema.sql destina-se exclusivamente a instalacoes vazias. Nao reaplique em banco existente. supabase/storage.sql configura o bucket de imagens de presentes.

## Evolucao

Em instalacao existente, executar supabase/migrations/20261019_photographs.sql no SQL Editor, antes de publicar o codigo novo. A transacao substitui wedding_mutate com a mesma assinatura e preserva grants. O ramo settings.update passa a aceitar cinco chaves photos_* usando upsert. Nao apaga dados, nao altera identificadores e nao cria tabelas. Pode ser reaplicada; nao reexecutar uma migration antiga depois de futuras alteracoes da mesma funcao.

wedding_settings e um mapa key/value. photos_visible guarda true/false como texto. photos_drive_url aceita somente HTTPS de drive.google.com no backend. photos_title, photos_description e photos_button sao textos escapados na interface. Desativar visibilidade conserva os valores no banco.

## Autorizacao e integridade

RLS habilitado nas tabelas; anon/authenticated sem acesso direto. service_role acessa somente pelo servidor. Administradores precisam constar ativos em admin_users, ligados a auth.users. Convidados atuais acessam por convite e cookie de sessao; isso ainda nao constitui conta individual Supabase Auth.

Convites agrupam guests. invitation_tokens guarda SHA-256 e revogacao. gift_reservations possui indices unicos parciais para uma reserva ativa por convite e por presente. wedding_mutate bloqueia registros para preservar regras e atomicidade de trocas. activity_logs registra operacoes selecionadas; auditoria completa ainda pendente.

Validacao local usa PGlite isolado e nao acessa Supabase remoto. A migration foi executada duas vezes no teste preservando configuracoes anteriores. Confira IMPLEMENTATION_STATUS.md para limitacoes e proximas entidades.

## Migration 20261021_wedding_configuration.sql

Aplicar depois de 20261019_photographs.sql. Amplia a lista permitida de chaves em wedding_mutate para os dados do casamento, usando o mesmo upsert e sem alterar tabelas/grants. Nao reaplicar migrations antigas depois desta. Novas instalacoes ja incluem os campos no schema.sql. wedding_at e derivado no backend de wedding_date, ceremony_time e timezone, sem depender do fuso do servidor; nao e armazenado separadamente.
