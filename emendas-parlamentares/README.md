# Emendas Parlamentares — São Bernardo do Campo/SP

Página estática independente em `emendas-parlamentares/` no repositório `cicerofabricio/site-consulta-convenios`. Não altera a aplicação de convênios existente nem qualquer projeto SIGPC.

## Destinatários aceitos

A consulta é **exclusiva aos seguintes destinatários públicos**, cada um identificado pelo próprio CNPJ:

| Destinatário | CNPJ (sem pontuação) |
| --- | --- |
| Prefeitura do Município de São Bernardo do Campo | 46523239000147 |
| Fundo Municipal de Saúde de São Bernardo do Campo | 13961905000170 |

O CNPJ do Fundo consta no CNES/DATASUS e no relatório DIGISUS da gestão municipal de saúde.

A busca automática consulta primeiro `beneficiarios-especiais?cnpj_beneficiario=...` para **cada CNPJ** e só consulta planos com os identificadores de beneficiário comprovados pela API. O filtro **Ambos / Prefeitura / Fundo Municipal de Saúde** atua sobre os resultados agregados em memória; a tabela mostra o CNPJ destinatário por registro. Em caso de falha em uma das consultas, a página informa que o conjunto pode ser parcial.

Beneficiário privado com sede em São Bernardo do Campo **não** entra no escopo.

## Fontes e modalidades

- **Consulta automática:** API oficial Transferegov de transferências especiais (emendas Pix): https://api-publica.transferegov.gestao.gov.br/especiais/docs
- **Outras fontes federais:** Portal da Transparência/CGU; Tesouro Nacional; Câmara, Senado e FNS para os repasses na saúde.
- **Fonte estadual pertinente:** Portal da Transparência do Estado de São Paulo, emendas concedidas e histórico.
- O catálogo apresenta filtros distintos de **tipo de emenda** (individual, bancada, comissão, relator histórico, estadual) e **forma de repasse** (transferência especial, fundo a fundo, convênio, contrato de repasse e outras).
- Esses filtros são sobre a *fonte pública a consultar*, **não** equivalem a um banco consolidado de registros provenientes de todas as fontes.
- O Portal da Transparência/CGU requer credenciais para parte da API; não armazene credenciais em JS público.

Emendas fundo a fundo para o Fundo Municipal de Saúde devem ser conferidas nas fontes do Fundo Nacional de Saúde e Portal da Transparência, não apenas na API das emendas Pix.

## Painel automático

- Tabelas: `beneficiarios-especiais`, `planos-acao-especiais` e `data-atualizacao`.
- Filtros: destinatário, ano, parlamentar, emenda, situação, categoria.
- Resultados: código da emenda, beneficiário e CNPJ, objeto, situação, custo, investimento, valores previstos.
- Paginação de 25 linhas, detalhes e exportação CSV compatível com Excel.
- API paginada com até 200 registros/requisição e limite de segurança de 20 mil registros por consulta.
- **Valores de plano não equivalem a empenho, pagamento ou execução.** Não some as fases financeiras entre bases.
- A ausência de registros na resposta não comprova ausência de emendas; bases oficiais podem estar incompletas ou indisponíveis.
- Não há banco próprio nem credenciais embutidas.

## GitHub Pages

Endereço esperado: https://cicerofabricio.github.io/site-consulta-convenios/emendas-parlamentares/

Publicação: `Settings → Pages → Deploy from a branch → main / (root)`. O repositório tem Pages habilitado, mas a publicação da URL e o consumo da API no navegador devem ser verificados após o deploy.

## Limitação técnica

A API precisa permitir CORS para consulta direta via navegador. Não houve teste completo ponta a ponta deste ambiente. Se a requisição falhar, a interface mostra erro, sem inventar registros ou valores.


## Consulta consolidada da CGU - 05/11/2026

O processamento em atualizar_cgu.py baixa o ZIP oficial da CGU (Emendas, Por Favorecido e Convênios), sem token de API. A cada atualização válida do GitHub Actions, publica dados-cgu.json. O sistema identifica separadamente Prefeitura 46.523.239/0001-47, Fundo de Saúde 13.961.905/0001-70, outras pessoas jurídicas localizadas no município e emendas com apenas localidade do gasto em São Bernardo do Campo. O quarto grupo não é contabilizado como recursos recebidos. A interface não soma valores de planos de ação (Pix) aos valores pagos da CGU. Não inclui pessoas físicas por privacidade. A importação estadual permanece manual pelo portal https://www.transparencia.sp.gov.br/EmendasParlamentares/Concedidas porque a URL pública da exportação não foi tecnicamente validada.
