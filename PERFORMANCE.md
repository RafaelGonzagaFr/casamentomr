# Investigação e otimização de carregamento

## Evidências no código

Stack preservada: JavaScript/HTML/CSS, Express 5, Supabase, Vercel. Não há React, fontes remotas, bundler, build ou divisão servidor/cliente de Next.js. Nenhuma dependência nova.

O maior custo identificado é a sequência de chamadas de rede, e não o tamanho dos assets:

- Antes: abertura de `/convite` aguardava `/api/public`, `/api/session` e `/api/guest/home`, nessa ordem. A validação do convidado consultava sessão, convite e token sequencialmente.
- Toda navegação autenticada repetia `/api/session` antes das requisições de dados, que já validam a mesma sessão no backend.
- Lista de presentes fazia duas requisições de dados, cada uma com sua validação de sessão: catálogo e reserva própria.
- QRCode era importado ao iniciar o servidor, embora utilizado somente na emissão administrativa de links.

O contador já atualiza apenas o seu elemento uma vez por segundo; não refaz consultas nem renderiza a página inteira. O timer é encerrado na navegação e após o início. Foi preservado.

## Alterações

`server/app.js`:

- Consultas independentes de convite/token em paralelo, mantendo checagem de revogação, vínculo, expiração e situação.
- `/api/guest/home` retorna também os metadados de sessão/CSRF e os dados públicos derivados das mesmas configurações lidas nessa requisição.
- `/api/guest/gifts?include=reservation` retorna catálogo e reserva do próprio convite, consultados em paralelo após uma única validação. A rota antiga de reserva continua disponível.
- Projeções explícitas no convite e no catálogo reduzem campos retornados em produção.
- QRCode carregado com import dinâmico somente na emissão. Sem estimativa de ganho de cold start, que não foi medido.
- Assets estáticos com revalidação obrigatória. HTML e TODAS as APIs continuam `no-store`; não foi implementado cache compartilhado de convidados ou disponibilidade.

`public/app.js`:

- A abertura direta do convite usa somente `/api/guest/home`.
- Metadados de sessão são reaproveitados em memória da aba durante a navegação. Isso não substitui autenticação: todos os endpoints continuam consultando e validando a sessão real a cada requisição. Login limpa os metadados anteriores, logout os apaga e respostas 401 os invalidam. Nenhum token foi colocado em localStorage.
- Lista de presentes usa uma requisição combinada; reserva/troca/cancelamento continuam sem cache e transacionais.

## Comparação controlada

Baseline Git: `f42ae38`. Comando: `node scripts/measure-navigation.js f42ae38`.

JSDOM, servidor HTTP local e PostgreSQL PGlite isolado. Mesmos dados, com atraso artificial de 50 ms por requisição HTTP da aplicação e 100 ms por chamada ao adaptador Supabase. Uma amostra por variante; não representa benchmark estatístico nem uma conexão móvel real. Nenhuma credencial ou dado de produção utilizado. O script cria temporariamente `server/.performance-baseline.js` e remove ao terminar.

| Operação | Antes | Depois |
|---|---:|---:|
| Abertura do convite: tempo até DOM pronto | 1.108 ms | 393 ms |
| Abertura: requisições de API | 3 | 1 |
| Abertura: chamadas ao adaptador Supabase | 9 | 5 |
| Navegar à lista: tempo até DOM pronto | 891 ms | 383 ms |
| Navegar à lista: requisições de API | 3 | 1 |
| Navegar à lista: chamadas ao adaptador Supabase | 11 | 5 |
| JavaScript: bytes sem compressão | 36.102 | 36.355 |
| JavaScript: bytes gzip calculados localmente | 10.656 | 10.720 |

CSS inalterado: 10.753 bytes; gzip calculado: 3.177 bytes. O gzip é uma estimativa do conteúdo comprimido, não uma medição de transferência da Vercel. O pequeno aumento de JS serve à redução de requisições; não houve redução artificial por remoção de funcionalidades.

Contagens acima são chamadas ao SDK/adaptador, não número de instruções SQL internas: views e contagens exatas podem executar trabalho adicional no PostgreSQL real.

## Banco, imagens e produção

Chaves primárias/únicas já atendem as buscas de sessões, convites e tokens. Existem índices de convidados por convite/status, reservas ativas únicas e índices de histórico. Não há EXPLAIN ANALYZE ou métricas remotas que justifiquem novos índices; nenhuma migration foi criada. As listas já são paginadas em 12 ou 20 itens. Mantidas contagens exatas para não mudar paginação.

Não há upload de imagem nos formulários de presentes atuais. Imagens antigas de presentes já usam lazy loading no catálogo e área administrativa. A foto principal é externa e depende do arquivo configurado pelo casal; sem dimensões/tamanho reais e medição não foi feita transformação, proxy, alteração de prioridade ou corte da imagem. Não foram adicionadas fontes nem estilos novos. Imagens externas grandes continuam sendo uma possível fonte de lentidão a verificar com o URL efetivamente utilizado.

`npm run dev` usa Node --watch; não há compilação do frontend. Os resultados acima vêm do servidor local, não da infraestrutura de produção. O log anterior informa execução Vercel em iad1: a distância real até o projeto Supabase e o cold start podem influenciar os tempos, mas não foram medidos nem alterados. Não foi mudada região de hospedagem por suposição.

## Validação e limites

Checks de sintaxe, testes de RSVP, convites, QR, reservas/trocas/cancelamento, concorrência, autorização, isolamento entre convidados, revogação, headers sem cache e contador. Teste de frontend verifica uma única requisição ao navegar para presentes.

LCP, CLS e INP não foram medidos: não há navegador disponível nesta sessão. JSDOM não mede pintura, layout ou interação real. Também não houve auditoria visual móvel/desktop, teste de carga, medição de imagem externa, deploy ou consulta ao Supabase de produção. Não existe comando de build/linter/TypeScript no projeto; `node scripts/check.js` é a verificação disponível. A validação em produção deve conferir Network e Web Vitals após publicar, com cache frio/quente e a mesma simulação de rede nas duas versões.
