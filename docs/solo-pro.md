# Solo Pro — Documentação Técnica

## Visão Geral

O Solo Pro é um sistema de inteligência operacional integrado ao ERP Jurídico, projetado para escritórios de advocacia independentes. Ele fornece um painel de saúde do escritório, recomendações operacionais baseadas em regras, e um wizard de configuração inicial.

## Estrutura de Diretórios

```
src/
├── lib/solo-pro/
│   ├── types.ts          # Tipos TypeScript
│   ├── constants.ts      # Constantes e configurações
│   ├── rules.ts          # Engine de regras (9 regras)
│   ├── queries.ts        # Queries do servidor
│   ├── actions.ts        # Server Actions
│   └── __tests__/
│       └── solo-pro-rules.test.ts
├── components/solo-pro/
│   ├── meu-escritorio.tsx        # Painel principal (5 tabs)
│   ├── office-health-card.tsx    # Card de saúde
│   ├── recommendation-card.tsx   # Card individual
│   ├── recommendation-list.tsx   # Lista de recomendações
│   └── setup-diagnostic.tsx      # Wizard de configuração
└── app/meu-escritorio/
    └── page.tsx                  # Página server-side
```

## Tabelas no Supabase

| Tabela | Descrição |
|--------|-----------|
| `operational_rules` | Regras operacionais (9 regras base) |
| `operational_recommendations` | Recomendações geradas pelas regras |
| `recommendation_dismissals` | Recomendações dispensadas |
| `recommendation_actions` | Ações executadas sobre recomendações |
| `recommendation_preferences` | Preferências de supressão por regra |
| `office_health_snapshots` | Snapshots diários de saúde |
| `setup_diagnostic` | Respostas ao wizard de configuração |
| `client_update_schedules` | Agendamentos de atualização para clientes |

## RPCs (Functions SQL)

- `calculate_office_health_score(p_law_firm_id)` → Retorna score 0-100
- `generate_office_health_snapshot(p_law_firm_id, p_snapshot_date)` → Gera snapshot diário
- `generate_operational_recommendations(p_law_firm_id)` → Gera recomendações baseadas em regras
- `save_setup_diagnostic_answers(p_law_firm_id, p_answers)` → Salva respostas do wizard

## Health Score

- **0-39**: Crítico
- **40-59**: Pendente
- **60-79**: Atenção
- **80-100**: Organizado

## Regras Operacionais (9 regras)

| Regra | Métrica |
|-------|---------|
| `leads_sem_retorno` | Clients com lead > 2 days sem return |
| `propostas_perto_vencer` | Proposals expiring in 3 days |
| `casos_sem_acao` | Cases without next action in 7 days |
| `parcelas_atrasadas` | Overdue installments with no charge |
| `clientes_sem_atualizacao` | Clients without updates in 30 days |
| `tarefas_acima_capacidade` | Over due tasks with no return |
| `clientes_indicacao` | Referral clients not contacted this quarter |
| `documentos_pendentes_audiencia` | Pending documents for upcoming audience |
| `contrato_sem_parcela` | Active contracts without invoice |

## RLS Policies

- 32 políticas RLS total
- Usa a função `has_law_firm_access(law_firm_id)` para verificar acesso
- Recomendações e snapshots são isolados por tenant
- Regras operacionais são públicas (visíveis a todos os tenants sem lei)

## Tipos Supabase

Os tipos TypeScript para as tabelas Solo Pro estão em `src/lib/supabase/types.ts`, na seção `Tables`. As funções RPC estão na seção `Functions`.

## Testes

- **Testes unitários**: `src/lib/solo-pro/__tests__/solo-pro-rules.test.ts`
  - Testa funções de health status
  - Testa threshold e constants
  - Testa tipos de recomendação
- **Cobertura**: 1610 tests passing (63 test files)
- **TypeScript**: 0 errors
- **Lint**: 0 warnings in Solo Pro files

## Build

- `npx next build` → Compiled successfully
- `npx vitest run` → 63 passes (1610 tests)
- `npx tsc --noEmit` → 0 errors