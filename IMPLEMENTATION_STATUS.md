# Estado da implementacao - 19/10/2026

Auditoria estatica do repositorio e testes locais. Nenhum banco remoto foi consultado ou alterado. A pasta recebida nao tem .git nem AGENTS.md. Nao e possivel atestar configuracao ou dados em producao.

## Arquitetura encontrada

HTML/CSS/JavaScript sem compilacao; Express 5.1.0; Node >=22.9; Supabase JS 2.76.1; QRCode 1.5.4. PostgreSQL/Supabase com RPCs transacionais, RLS habilitado e acesso exclusivo service_role. Auth de administradores via Supabase; convidados usam sessoes por convite. Estado no frontend e API de mesma origem. Design em public/styles.css: Georgia, rosa, cartoes e formularios reutilizados. Nao ha React, Next.js, Tailwind, shadcn ou TypeScript. Preservar stack: migracao seria ampla e requer proposta/aprovacao.

## Matriz

| Modulo | Funcionalidade | Situacao | O que falta | Arquivos envolvidos | Prioridade |
|---|---|---|---|---|---|
| A | Configuracoes do casal | Parcialmente implementada | Nomes individuais, foto externa, hora, fuso, locais, historia e informacoes adicionais | public/app.js, server/validation.js, supabase/schema.sql | Alta |
| A | Contagem regressiva | Ausente | Data com hora/fuso, contador e mensagem apos evento | public/app.js | Alta |
| B | Personalizacao | Ausente | Geracao de paleta, contraste, editor e persistencia; reutilizar tokens --rose/--border/--muted | public/styles.css | Media |
| C | Convidados | Parcialmente implementada | Existem nomes por convite e exclusao logica; faltam contato, categorias, busca, filtros e CSV | public/app.js, server/app.js, supabase/schema.sql | Alta |
| D | RSVP | Parcialmente implementada | Individual por convite com prazo e persistencia; falta email/ativacao e edicao administrativa na interface | mesmos arquivos | Alta |
| E | Contas individuais | Ausente | Vinculo Auth por convidado, ativacao restrita, perfil, recuperacao e area pessoal | server/supabase.js, server/app.js, supabase/schema.sql | Alta |
| F | Convites e QR | Parcialmente implementada | Links aleatorios de 256 bits com hash, revogacao e PNG; faltam convite visual completo e WhatsApp. QR atual concede sessao por convite, nao satisfaz separacao futura entre entrada e autenticacao | server/app.js, public/app.js | Alta |
| F | Check-in | Ausente | Papel recepcionista, leitura, contagem e transacao contra duplicidade | schema/API/frontend | Alta |
| G | Presentes e reservas | Parcialmente implementada | Catalogo e reservas/trocas atomicas por unidade existentes; faltam quantidade, recebido, prioridade e requisito de Auth individual. Troca atual permite convidados que recusaram: preservar ate adaptar regra explicitamente | supabase/schema.sql, server/app.js, public/app.js | Alta |
| H | Google Drive | Depende de configuracao externa | Codigo integrado: URL/titulo/descricao/botao/visibilidade, validacao backend e secao publica/convite. Aplicar migration e configurar link/permissoes; teste visual pendente | server/validation.js, server/app.js, public/app.js, supabase/migrations/20261019_photographs.sql | Alta |
| I | Mural moderado | Ausente | Persistencia, envio, moderacao e exibicao aprovada | schema/API/frontend | Media |
| J | Cronograma | Ausente | CRUD, ordem e timeline publica | schema/API/frontend | Media |
| K | Financeiro | Ausente | Orcamento, categorias, despesas, pagamentos e relatorios privados | schema/API/frontend | Media |
| L | Fornecedores e tarefas | Ausente | CRUD, prazos, responsaveis e integracao | schema/API/frontend | Media |
| M | Dashboard | Parcialmente implementada | Existem totais de convidados, confirmacoes, presentes e reservas; faltam dias, check-in, recebido, financeiro e tarefas | public/app.js, supabase/schema.sql | Media |
| Seguranca | Sessoes e autorizacao | Parcialmente implementada | Cookies HttpOnly/CSRF/origem/CSP/RLS e rate limit por processo existentes; faltam papeis, Auth individual, logs mais abrangentes e limite distribuido | server/app.js, supabase/schema.sql | Alta |
| Infra | Supabase e deploy | Depende de configuracao externa | Auth, Storage de presentes e HTTPS reais nao verificados; vercel.json e index.js existem, deploy nao executado | server/index.js, server/supabase.js, vercel.json, index.js | Alta |

## Banco e integridade

Tabelas existentes: admin_users, invitations, invitation_tokens, guests, gift_categories, gifts, gift_reservations, wedding_settings, activity_logs, app_sessions. FKs e indices unicos parciais impedem reserva ativa duplicada. wedding_mutate aplica bloqueios e transacoes; views com security_invoker. RLS nega acesso direto anon/authenticated; backend concentra autorizacao. Modelo atual e de casamento unico: multi-casamento exige migracao planejada, nao duplicacao das entidades.

Nao ha galeria/fotos de convidados. wedding-gifts guarda imagens de presentes e foi preservado. Nao foram criadas tabelas de fotos nem uploads novos.

## Primeiro incremento

- Fotografias na tela existente de configuracoes, no site publico e no convite, com link em nova aba e aviso de servico externo.
- URL limitada a HTTPS em drive.google.com, sem credenciais nem porta alternativa; dados privados de configuracao nao foram adicionados a API publica.
- Migration incremental substitui somente wedding_mutate mantendo assinatura, autorizacao e regras anteriores; upsert permite novas chaves sem perder configuracoes.
- schema.sql atualizado somente para instalacoes novas. Em banco existente executar apenas a migration, nunca reaplicar schema.sql.
- Removidos exemplos de chaves reais do README. A chave secreta anteriormente exposta deve ser revogada/rotacionada no painel Supabase pelo responsavel.
- Criados .env.example e .gitignore, que eram mencionados na documentacao mas estavam ausentes.

## Proximos incrementos por dependencia

1. Completar A e contador com fuso; editor de cores nos tokens atuais.
2. Completar C e RSVP administrativo; planejar identidade individual preservando IDs e sessoes atuais.
3. Auth individual e recuperacao, depois reservas autenticadas e check-in com papeis.
4. Mural, cronograma e dashboard; financeiro, fornecedores e tarefas.

## Limites

Sem configuracao Supabase real, persistencia remota, email, permissoes de Drive e deploy permanecem nao validados. Nao existe comando de build, lint ou TypeScript nesta stack; npm run check valida sintaxe. Suite usa PGlite e adaptadores de Auth/Storage, nao integra servicos reais. Consulte VALIDACAO.md e registro do ciclo abaixo.

## Validacao deste ciclo

Node 24.21.0. npm ci --ignore-scripts concluido, auditoria npm: zero vulnerabilidades reportadas. node scripts/check.js aprovado. node --test tests/*.test.js: 24 testes aprovados, incluindo migration reaplicavel, preservacao de configuracoes, autorizacao da RPC, visibilidade publica e URLs do Drive. Suite existente de frontend, HTTP, banco e validacao aprovada. Nao houve teste visual em navegador, deploy nem aplicacao da migration em Supabase remoto.
