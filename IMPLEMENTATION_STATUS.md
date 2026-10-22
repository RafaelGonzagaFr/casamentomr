# Estado da implementacao - 19/10/2026

Auditoria estatica do repositorio e testes locais. Nenhum banco remoto foi consultado ou alterado. Na auditoria inicial a pasta nao tinha .git nem AGENTS.md. Em 21/10/2026 Git esta disponivel e o estado inicial deste ciclo estava limpo. Nao e possivel atestar configuracao ou dados em producao.

## Arquitetura encontrada

HTML/CSS/JavaScript sem compilacao; Express 5.1.0; Node >=22.9; Supabase JS 2.76.1; QRCode 1.5.4. PostgreSQL/Supabase com RPCs transacionais, RLS habilitado e acesso exclusivo service_role. Auth de administradores via Supabase; convidados usam sessoes por convite. Estado no frontend e API de mesma origem. Design em public/styles.css: Georgia, rosa, cartoes e formularios reutilizados. Nao ha React, Next.js, Tailwind, shadcn ou TypeScript. Preservar stack: migracao seria ampla e requer proposta/aprovacao.

## Matriz

| Modulo | Funcionalidade | Situacao | O que falta | Arquivos envolvidos | Prioridade |
|---|---|---|---|---|---|
| A | Configuracoes do casal | Depende de configuracao externa | Campos, validacao, persistencia e exibicao implementados; aplicar migration 20261021 e validar Supabase real/visual | public/app.js, server/validation.js, supabase/schema.sql | Alta |
| A | Contagem regressiva | Depende de configuracao externa | Implementada e testada em DOM; configurar data/hora/fuso e validar visualmente | public/app.js | Alta |
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

## Incremento de 21/10/2026 - configuracoes e contador

Ampliada a tela existente com nomes individuais, foto externa HTTPS, hora, fuso IANA, locais/enderecos, mapa HTTPS, historia, informacoes adicionais e mensagem apos inicio. Restaurados campos de fotografias ausentes na tela recebida neste ciclo. A API publica seleciona campos explicitamente e calcula wedding_at no servidor. Contador na pagina inicial e no convite mostra dias/horas/minutos/segundos e encerra o timer ao mudar de pagina ou iniciar o casamento. Sem data e hora completas, nao presume meia-noite. Horarios ambiguos/inexistentes sao rejeitados. O prazo RSVP continua no horario da Bahia para preservar o comportamento atual.

Criados server/wedding-time.js, tests/wedding-time.test.js, tests/countdown.test.js e supabase/migrations/20261021_wedding_configuration.sql. Modificados public/app.js, public/styles.css, server/app.js, server/validation.js, supabase/schema.sql, tests/photographs.test.js e documentacao. Sem novas dependencias, tabelas ou exclusao de dados. Migration substitui a RPC existente mantendo assinatura e autorizacao. Aplicar migrations em ordem cronologica antes de publicar o backend novo.

Validacao: node scripts/check.js aprovado; node --test tests/*.test.js com 27 testes aprovados. Inclui migration aplicada duas vezes, preservacao de configuracoes, persistencia/publicacao dos novos campos, fusos com offsets fracionarios, horario de verao, validacao de URLs e transicao do contador com escape da mensagem final. Suite anterior de RSVP/reservas/autorizacao/frontend segue aprovada. Sem build/lint/TypeScript configurados. Supabase real, deploy e inspecao visual em navegador nao executados.

Proximo incremento: editor de cores nos tokens existentes, depois dados e ferramentas de convidados.

## Correcao da renderizacao de Configuracoes

Identificada apos o commit 00daf89: a variavel details era montada em settingsPage mas nao interpolada no formulario. Corrigida a inclusao dos campos do casamento e fotografias em public/app.js. tests/frontend.test.js agora verifica a existencia dos novos inputs, textareas e seletor de visibilidade no DOM. Sintaxe e 27 testes aprovados. Sem alteracao SQL; nao e necessario reaplicar migrations. Correcoes locais ainda precisam de commit/push e deploy.

Ajuste de apresentacao: detalhes do casamento exibem DD/MM/AAAA - HH:mm acima do contador, sem mostrar o fuso. Calculo do contador preservado. Sem migration.

## Reorganizacao visual da pagina publica

public/app.js agora monta um convite continuo na rota /: identificacao, ornamento, casal, contador, data/hora, orientacao e botao do album. Removidos cartoes separados, texto de boas-vindas da abertura publica e data repetida no rodape. Informacoes opcionais (foto, locais, historia e orientacoes) continuam abaixo, no mesmo fluxo. O campo welcome_message permanece salvo e usado no convite autenticado. Acesso administrativo preservado no rodape. Album exibe somente botao, com URL validada, nova aba e rel seguro; configuracoes de titulo/descricao permanecem salvas. Sem mudancas de banco ou rotas.

public/styles.css limita largura, centraliza conteudo e usa clamp, flex-wrap e quebra de textos/botao. Sem alturas fixas ou areas internas de rolagem na nova composicao; cores usam tokens existentes. Nao ha sistema dinamico de temas implementado no estado atual: nenhuma nova paleta paralela foi criada.

Validacao: node scripts/check.js, node --test tests/*.test.js (28 aprovados), git diff --check. Novo tests/public-layout.test.js verifica ordem, unicidade de data/contador, detalhes opcionais, ausencia de cartoes/textos provisorios, rodape e links invalidos. Revisao estatica de CSS para celular e desktop; inspecao visual real nao executada: inventario sem navegadores e tentativa de abrir IAB retornou Browser is not available. Nao houve deploy nem migration.

Ajuste da abertura publica: rodape oculto e vazio na rota /, mantendo apenas os nomes principais. Conteudo centralizado verticalmente usando min-height de viewport e flex, com padding simetrico e altura livre para rolagem natural. Sintaxe e testes de layout/contador verificados; sem migration.

## Reorganizacao da tela /convite

Nome do convite como unico h1, sem rotulo Seu convite. Mensagem welcome_message existente preservada (modelo atual armazena essa mensagem nas configuracoes do casamento, nao por convite). Data/hora em destaque; prazo real formatado em DD/MM/AAAA no fuso da Bahia; formularios individuais mantidos com bloqueio visual ao expirar e regras backend inalteradas. Contador unico sob titulo Quanto tempo falta ate o grande dia. Catalogo existente incorporado abaixo do contador, com os mesmos endpoints, reservas, troca/cancelamento, acesso e paginacao; rota /convite/presentes preservada. Album e detalhes opcionais abaixo, sem repetir mensagem/data/contador.

Alterados public/app.js, public/styles.css e tests/frontend.test.js. Layout centralizado e fluido, sem alturas fixas. Validacao: sintaxe, git diff --check e 28 testes aprovados, incluindo verificacao DOM da ordem/conteudo e fluxos completos de confirmacao e presentes. Inspecao visual em navegador nao disponivel nesta sessao; Supabase remoto e deploy nao alterados. Sem SQL novo.

## Limpar todos os convites (uso administrativo)

Em Convites, a secao Limpar todos os convites exige digitar EXCLUIR TODOS e confirmar a exclusao permanente. Apaga convites, convidados, respostas, tokens/links, reservas ativas e historicas e sessoes dos convidados. Mantem presentes, categorias, configuracoes, administradores, sessoes administrativas e registros de auditoria. Presentes antes reservados voltam a ficar disponiveis conforme sua situacao de cadastro. IDs nao sao reiniciados.

Antes de publicar, aplicar supabase/migrations/20261021_clear_invitations.sql em banco existente. Essa migration APENAS cria a funcao administrativa; nao apaga registros ao ser executada. A exclusao ocorre somente ao acionar e confirmar a opcao na interface. Novas instalacoes incluem a funcao no schema.sql. Nao reaplicar schema.sql em banco existente. A funcao e restrita a service_role, valida administrador ativo e confirmacao, bloqueia escritas concorrentes e executa em transacao; endpoint exige sessao administrativa, origem e CSRF. Operacao registrada em activity_logs. Banco remoto nao alterado pelo agente.

Correcao confirmada pelos logs de producao: 21000 DELETE requires a WHERE clause. Adicionados filtros explicitos por chave primaria nos DELETEs da limpeza; nova migration 20261022_fix_clear_invitations_where.sql para bancos existentes. Sintaxe e 10 testes HTTP/frontend aprovados; teste reaplica migration e verifica predicado em cada DELETE. PGlite nao inclui a extensao de protecao do Supabase, portanto verificacao real permanece a executar pelo usuario. Sem acesso ou exclusao no banco remoto.

## Otimizacao de carregamento

Investigacao e resultados detalhados em PERFORMANCE.md. Reduzidas chamadas na abertura do convite de 3 para 1 e ao navegar para presentes de 3 para 1; chamadas ao adaptador Supabase de 9 para 5 e 11 para 5, respectivamente. Ensaios locais com latencia simulada: 1108 -> 393 ms e 891 -> 383 ms; nao sao Web Vitals nem medicoes de producao. Consultas independentes em paralelo, dados de sessao/publicos na resposta privada do convite, catalogo/reserva combinados e QR importado sob demanda. Backend valida todas as requisicoes; respostas privadas seguem no-store. Sem mudanca visual, novas dependencias, indices ou migrations.

Arquivos alterados: public/app.js, server/app.js, tests/frontend.test.js, tests/http.test.js, README.md e este inventario. Criados scripts/measure-navigation.js e PERFORMANCE.md. Sintaxe, 32 testes e git diff --check aprovados. Nao ha comando de build na stack atual. Navegador, Web Vitals, Supabase remoto e deploy nao validados nesta sessao.
