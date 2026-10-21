# Arquitetura atual

O frontend em public/app.js usa navegacao com History API, fetch na mesma origem, escape HTML e componentes de formulario em strings. public/styles.css centraliza o design responsivo e os tokens de cor. Nao existe compilacao do frontend.

server/app.js cria Express e concentra sessao, CSRF, origem, autorizacao e validacao. server/supabase.js separa cliente de login do cliente privilegiado. server/index.js valida ambiente e inicia o processo; index.js e a entrada para hospedagem. As sessoes persistem em app_sessions; o limitador de tentativas e local ao processo.

Leituras usam SDK Supabase. Escritas de negocio usam wedding_mutate, uma RPC PostgreSQL transacional com verificacao de administrador/convite. A API publica seleciona explicitamente campos de wedding_settings; nunca publique o mapa inteiro de configuracoes.

Fotografias de convidados sao somente links externos do Google Drive. Fotos dos presentes continuam no bucket wedding-gifts. Nao ha nova integracao OAuth, sincronizacao nem upload de fotos dos convidados.

A arquitetura foi preservada. Migracao para Next.js/React e modelo multi-casamento requerem proposta especifica e aprovacao antes de alteracoes substanciais. Veja IMPLEMENTATION_STATUS.md.
