# Emendas Federais — São Bernardo do Campo

Painel independente: https://cicerofabricio.github.io/site-consulta-convenios/emendas-parlamentares/

## Fonte de valores recebidos: CGU

O script \`atualizar_cgu.py\` baixa os arquivos oficiais públicos
https://portaldatransparencia.gov.br/download-de-dados/emendas-parlamentares
e cruza EmendasParlamentares.csv, PorFavorecido.csv e Convênios.csv.

O resultado \`dados-cgu.json\` é atualizado diariamente às 10h40 UTC (7h40 de Brasília), por \`.github/workflows/atualizar-emendas-cgu.yml\`. Valores são recebimentos, não planos ou empenhos.

## Dados bancários (enriquecimento)

O script \`enriquecer_contas.py\` usa a API aberta:
https://api-publica.transferegov.gestao.gov.br/especiais/docs

Obtém os beneficiários cadastrados consultando o CNPJ oficial e depois os planos por \`id_beneficiario\`. O vínculo bancário só é permitido quando:
1. O beneficiário da API tem exatamente o CNPJ público escolhido;
2. O plano pertence ao identificador de beneficiário confirmado;
3. O número de 12 dígitos da emenda é idêntico ao código no registro CGU com o MESMO CNPJ;
4. Banco, agência e conta constam no plano; e
5. A URL da fonte refere-se ao plano de ação encontrado.

O resultado separado \`dados-contas.json\` é atualizado às 10h55 UTC (7h55 de Brasília) pelo workflow \`.github/workflows/enriquecer-contas.yml\`. A CGU continua funcionando mesmo que o enriquecimento falhe.

**Limite fundamental:** a conta indicada é a conta cadastrada/vinculada ao plano de ação. Não é prova do crédito efetivo daquele pagamento. A coluna informa expressamente essa limitação. Não vincular contas por valores semelhantes, nome do parlamentar, ano ou município isoladamente.

Na primeira verificação, a API retornou 9 planos associados a CNPJ 46.523.239/0001-47 e nenhum plano para CNPJ 13.961.905/0001-70. A ausência de planos não implica ausência de contas do Fundo Municipal de Saúde. Consultas públicas do FNS: https://portalfns.saude.gov.br/consultas/. Nenhuma conta é atribuída a emenda do FNS sem documento que identifique também a emenda correspondente.

A interface **não chama Transferegov diretamente**. A fonte complementar é consumida pelo GitHub Actions; a tela lê arquivos locais estáticos.

## Filtros e visualização

Destinatário (Prefeitura + Fundo por padrão), ano, tipo, situação bancária, busca textual, paginação e CSV. São exibidos banco, agência, conta, tipo de comprovação e URL oficial por emenda quando verificados. Quando não houver associação documental precisa, exibe “Não identificada”.

A execução conserva o arquivo bancário anterior em caso de falha de API e não substitui a lista da CGU. Emendas estaduais não estão incluídas.

## Escopo dos beneficiários

- Prefeitura: CNPJ 46.523.239/0001-47.
- Fundo Municipal de Saúde: CNPJ 13.961.905/0001-70.
- Outros favorecidos locais aparecem separadamente, mas não são tratados como Prefeitura/Fundo.
