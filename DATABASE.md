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

## Limpar todos os convites (uso administrativo)

Em Convites, a secao Limpar todos os convites exige digitar EXCLUIR TODOS e confirmar a exclusao permanente. Apaga convites, convidados, respostas, tokens/links, reservas ativas e historicas e sessoes dos convidados. Mantem presentes, categorias, configuracoes, administradores, sessoes administrativas e registros de auditoria. Presentes antes reservados voltam a ficar disponiveis conforme sua situacao de cadastro. IDs nao sao reiniciados.

Antes de publicar, aplicar supabase/migrations/20261021_clear_invitations.sql em banco existente. Essa migration APENAS cria a funcao administrativa; nao apaga registros ao ser executada. A exclusao ocorre somente ao acionar e confirmar a opcao na interface. Novas instalacoes incluem a funcao no schema.sql. Nao reaplicar schema.sql em banco existente. A funcao e restrita a service_role, valida administrador ativo e confirmacao, bloqueia escritas concorrentes e executa em transacao; endpoint exige sessao administrativa, origem e CSRF. Operacao registrada em activity_logs. Banco remoto nao alterado pelo agente.

## Correcao de DELETE requires a WHERE clause (21000)

Aplicar 20261022_fix_clear_invitations_where.sql em banco existente. Substitui a funcao de limpeza por versao com predicados explicitos where id is not null nas exclusoes de tabelas cujas chaves primarias nunca sao nulas. Mantem confirmacao, autorizacao, transacao, locks e auditoria; nao desativa protecoes do banco. Executar a migration nao limpa dados: a limpeza segue sendo acionada na interface. Schema inicial e migration de criacao tambem atualizados.
