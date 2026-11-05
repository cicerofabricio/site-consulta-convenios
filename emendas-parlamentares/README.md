# Consulta de Emendas Parlamentares — Transferências Especiais

Site estático isolado na pasta \`emendas-parlamentares/\` deste repositório. Não interfere na página de consulta de convênios nem em outros projetos.

## Fonte de dados

- API oficial: https://api-publica.transferegov.gestao.gov.br/especiais/docs
- Base URL: https://api-publica.transferegov.gestao.gov.br/especiais
- Tabelas: \`beneficiarios-especiais\`, \`planos-acao-especiais\`; data da última atualização: \`data-atualizacao\`.
- A API registra **transferências especiais** (emendas Pix), não todas as emendas parlamentares.
- **Valor de plano não equivale a valor empenhado, pago ou executado.** Os indicadores desta tela mostram apenas valores previstos de custeio e investimento dos planos de ação.

## Funcionalidades

- Filtros por UF e beneficiário/município, ano da emenda, situação, categoria, parlamentar (busca parcial) e número/código.
- Paginação com 25 linhas, detalhes do plano, métricas agregadas e exportação CSV compatível com Excel.
- Dados atuais obtidos diretamente da API no navegador, sem banco de dados, token ou proxy.
- Paginação de até 200 registros por chamada com limite de segurança de 20 mil registros por consulta.
- Caso a API esteja vazia ou indisponível, a tela exibe um aviso explícito; não utiliza dados falsos.

## Hospedagem

Hospedagem recomendada: GitHub Pages servindo a branch \`main\` a partir da raiz do repositório. O caminho desta aplicação é \`/site-consulta-convenios/emendas-parlamentares/\`.

No GitHub: **Settings → Pages → Build and deployment → Deploy from a branch → main / (root)**. Se o repositório já estiver publicado dessa forma, esta pasta ficará disponível automaticamente.

## Limitações e diagnóstico

O GitHub Pages não executa um servidor de aplicação. O navegador só poderá consumir a API oficial se ela aceitar requisições cross-origin (CORS). Não foi possível fazer teste de ponta a ponta neste ambiente. Se houver bloqueio de CORS ou falha de rede, a mensagem da própria interface informa isso sem alegar ausência de emendas.

A publicação federal já apresentou relatos de tabelas temporariamente vazias; por isso, resposta vazia não é prova definitiva de inexistência de dados. Verifique sempre a documentação e o portal oficial.