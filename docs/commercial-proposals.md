# Propostas Comerciais

Fundação da etapa 5.2.3.1. O modelo canônico usa `commercial_proposals`, versões imutáveis, seções, itens, destinatários, eventos append-only e operações idempotentes. A tabela legada `fee_proposals` permanece fora do novo fluxo.

Migrations aplicadas no projeto Alfenus: `20260727120000_commercial_proposals_foundation.sql`, `20260727130000_commercial_proposals_rpc_rls_fix.sql`, `20260727140000_complete_commercial_proposals_operations.sql`, `20260727150000_harden_commercial_proposals_data_api.sql`, `20260727160000_secure_commercial_proposals_rpc_execution.sql`, `20260727170000_debug_proposal_update.sql`, `20260727180000_fix_proposal_optimistic_locking.sql`, `20260727190000_debug_duplicate_proposal.sql`, `20260727200000_fix_duplicate_proposal_ambiguity.sql` e `20260727210000_complete_duplicate_recipients.sql`. As migrations de diagnóstico foram imediatamente substituídas pelas versões seguras seguintes e não permanecem como definição efetiva.

## Segurança
Todas as tabelas têm RLS e `law_firm_id`. Escrita é limitada a proprietário, administrador e advogado. Suporte assistido não recebe política de leitura ou mutação; destinatários não são expostos por acesso direto a `authenticated`. Leituras seguras usam `get_commercial_proposals_secure`, `get_commercial_proposal_secure` e `get_commercial_proposal_version_secure`.

## Domínio
Status: `draft`, `ready`, `sent`, `viewed`, `accepted`, `rejected`, `expired`, `cancelled`, `superseded` e `archived`. Versões nunca são atualizadas ou removidas; correções criam outra versão. A origem `pricing_scenario` copia somente dados comerciais e snapshot histórico. Margem, custos internos e memória não entram no snapshot público.

## Operações
`create_commercial_proposal_manual` cria proposta draft, versão inicial e seções padrão. `create_commercial_proposal_from_pricing_version` valida tenant, papel, cenário e versão, cria snapshot, itens comerciais, eventos e idempotência na mesma transação. `duplicate_commercial_proposal` copia a versão ativa, seções, itens e destinatários opcionalmente, sem compartilhar registros. `update_commercial_proposal_metadata` exige `p_expected_updated_at` e rejeita sobrescritas concorrentes.

Assinaturas: `create_commercial_proposal_manual(text, char(3), integer, text)` e `create_commercial_proposal_from_pricing_version(uuid, uuid, text, uuid, uuid, integer, text, text)`. O retry com a mesma chave e hash retorna os IDs já persistidos; conflito de hash deve ser tratado pelo serviço de aplicação antes de repetir a operação.

O runtime `scripts/test_commercial_proposals_runtime.mjs` cria usuários e tenants temporários, autentica por senha, testa JWT/RLS/Data API, concorrência, imutabilidade e remove os fixtures no `finally`. Execute com `PROPOSALS_INTEGRATION_TESTS=true` e `PROPOSALS_TEST_ENV=development`.

## Limitações
Não há interface, página pública, envio, aceite público, assinatura, PDF, conversão em contrato, automações ou analytics nesta etapa.
