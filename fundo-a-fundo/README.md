# Consulta de Transferências Fundo a Fundo

Página estática independente em `fundo-a-fundo/`, criada sem alterações na consulta de convênios ou emendas.

## Dados

- Fonte oficial: https://api-publica.transferegov.gestao.gov.br/fundoafundo/docs
- Endpoint: `GET https://api-publica.transferegov.gestao.gov.br/fundoafundo/planos-acao`
- Paginação oficial: `pagina` e `tamanho_da_pagina`.
- Consulta direta no navegador: sem backend, Supabase, token, banco ou arquivos TXT.

## Filtros

- UF e município do ente recebedor;
- Código IBGE do município (mais seguro que nome por exatidão);
- Código do plano de ação;
- Situação do plano;
- CNPJ do fundo vinculado.

Os parâmetros textuais usam comparação por igualdade na API; a consulta não faz busca por trecho do nome. A página exibe 50 planos por página e permite exportar em CSV os registros **da página atual**, não todos os resultados.

## Interpretação

A coluna "Repasse previsto" lê `valor_total_repasse_plano_acao`. A coluna "Parcela de emendas" lê `valor_repasse_emenda_plano_acao`. **Não representam pagamento efetivo**, portanto não devem ser utilizados como valor efetivamente recebido.

## GitHub Pages

Para hospedar este diretório no GitHub Pages, configure no repositório:
**Settings → Pages → Deploy from a branch → main → /(root)**.

Caminho esperado na configuração padrão:
https://cicerofabricio.github.io/site-consulta-convenios/fundo-a-fundo/

Se o Pages já publicar a branch `main` pela raiz, o diretório é disponibilizado automaticamente após o deploy. Não foi possível verificar remotamente o status do Pages ou executar chamadas diretamente à API na sessão de criação. CORS ou indisponibilidade do serviço podem impedir o acesso pelo navegador; nesse caso a interface exibirá erro, sem inventar resultados.
