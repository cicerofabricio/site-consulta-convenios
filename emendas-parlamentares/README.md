# Emendas Federais — São Bernardo do Campo (CGU)

Painel de consulta independente em \`emendas-parlamentares/\`, integrado ao GitHub Pages de \`cicerofabricio/site-consulta-convenios\`.

## Fonte única

Os registros são provenientes **exclusivamente dos arquivos oficiais de dados abertos da Controladoria-Geral da União (CGU)**:
https://portaldatransparencia.gov.br/download-de-dados/emendas-parlamentares

O script \`atualizar_cgu.py\` obtém o ZIP público e processa:
- \`EmendasParlamentares.csv\`
- \`EmendasParlamentares_PorFavorecido.csv\`
- \`EmendasParlamentares_Convenios.csv\`

A execução no GitHub Actions (\`.github/workflows/atualizar-emendas-cgu.yml\`) é diária, às 10h40 UTC (7h40 de Brasília), com acionamento manual opcional. Publica \`dados-cgu.json\` **somente quando a coleta é validada**. O frontend \`cgu.js\` lê apenas esse JSON estático, sem token no navegador e sem chamadas diretas à API.

## Filtros

- **Prefeitura + Fundo Municipal de Saúde (padrão)** — união dos registros de ambos os CNPJs com soma dos valores recebidos na seleção. Cada registro continua identificando o destinatário original.
- Somente Prefeitura: CNPJ 46.523.239/0001-47.
- Somente Fundo Municipal de Saúde: CNPJ 13.961.905/0001-70.
- Todos os registros, outros CNPJs da cidade, ou somente localidade do gasto.
- Ano, tipo de emenda, busca textual e exportação CSV para Excel.
- Resumos financeiros calculados sobre os filtros ativos; não somar valores de localidade como transferência ao Município.

O campo \`valorRecebidoCentavos\` é derivado do valor recebido no CSV Por Favorecido, somado por código da emenda e CNPJ. Uma mesma emenda pode constar para vários favorecidos; o total da Prefeitura + Fundo refere-se exclusivamente aos dois CNPJs municipais.

## Escopo e cautelas

O projeto **não consulta o Transferegov** e não publica as telas antigas de emendas Pix. Isso não exclui emendas Pix que constem nos arquivos de favorecidos da CGU. A solução **não contém emendas estaduais**.

Pagamentos recebidos por terceiros situados na cidade são separados dos recursos municipais; emendas associadas somente à localidade não são comprovantes de receita. A ausência de registro não prova inexistência de emendas. O portal é uma consulta independente, sem vínculo institucional com a CGU ou a Prefeitura.

URL: https://cicerofabricio.github.io/site-consulta-convenios/emendas-parlamentares/
