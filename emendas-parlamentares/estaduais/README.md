# Emendas estaduais de São Paulo destinadas a São Bernardo do Campo

Fonte: https://www.transparencia.sp.gov.br/EmendasParlamentares/Concedidas
Arquivo oficial ZIP: https://www.transparencia.sp.gov.br/Dados%20Abertos/Emendas/emendas.zip

O script atualizar_sp.py filtra todos os lançamentos de emenda.csv cujo campo municipio_gasto é exatamente São Bernardo do Campo, consolida os movimentos financeiros positivos e negativos por código, instrumento, beneficiário, objeto e executor, e gera ../dados-sp.json. Workflow .github/workflows/atualizar-emendas-sp.yml, execução diária às 11h10 UTC, após a coleta federal.

**Unidade monetária:** a origem traz valores numéricos em centavos (198806000.00 = R$ 1.988.060,00). Validado com a emenda 2024.018.58123, valor nominal no anexo oficial da Assembleia Legislativa.

**Beneficiário:** o ZIP não publica CNPJ. O nome "PREFEITURA MUNICIPAL DE SAO BERNARDO DO CAMPO" é categorizado como Prefeitura, mas sem afirmar que uma conta corrente específica ou o CNPJ do Fundo Municipal de Saúde recebeu o pagamento. Não classificar despesas de Secretaria da Saúde como recebimento pelo Fundo sem documento que informe o CNPJ. Outros destinatários na cidade são separados. "Emenda LOA" e "Transferência Voluntária" são categorias diferentes; padrão é Emenda LOA.

**Dados bancários:** não há banco, agência ou conta na base de emendas estadual. O ZIP de convênios estaduais também não divulga chaves suficientes (CNPJ e número do instrumento) para vincular com segurança essas informações a uma emenda. Mostrar sempre "Não identificada" até obter documentação pública específica.

Os valores são empenhos, liquidações e pagamentos do governo estadual, não comprovação de ingresso em conta municipal. A tela usa dados-sp.json estático publicado em GitHub Pages e exporta CSV para Excel. Não há login, chave de API nem programação do Transferegov na página estadual.
