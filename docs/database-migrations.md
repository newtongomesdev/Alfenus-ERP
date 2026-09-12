# Database Migrations

## Estado atual

O projeto possui migrations históricas com prefixos duplicados:

- `0007_admin_panel.sql` e `0007_lgpd_privacy.sql`
- `0041_onboarding_invites.sql` e `0041_solo_mode.sql`
- `0042_document_access_logs.sql` e `0042_solo_pro.sql`

O Supabase CLI exige uma versão única por migration. Por isso, não é seguro usar
`migration repair` para marcar toda a pasta enquanto esses grupos permanecerem
ambíguos.

O banco remoto possui objetos de migrations posteriores, incluindo Pricing
`0048` a `0053`, mas não possui histórico em
`supabase_migrations.schema_migrations`. A inspeção também não encontrou as
tabelas principais de `0041_solo_mode` e `0042_solo_pro`.

## Estratégia adotada

Foi adotada a **Estratégia 2: baseline canônica**. Solo Mode e Solo Pro fazem
parte do schema canônico porque existem no código, nas rotas e nos testes do
Alfenus. A migration ativa `20260726200000_alfenus_canonical_baseline.sql`
reúne todos os arquivos legados em uma ordem explícita, incluindo as duas
migrations Solo e as correções de Pricing até `0053`, em uma cadeia única e
reproduzível. A ordem dos grupos duplicados fica registrada no gerador.

Os arquivos numerados anteriores foram preservados em
`supabase/migrations_legacy/` somente para auditoria e não são descobertos pelo
Supabase CLI. Não há renumeração fictícia nem inserção manual no histórico.

## Inventário dos prefixos duplicados

| Arquivo | Presente no remoto | Dependências posteriores | Pode ser renumerado | Ação |
| --- | --- | --- | --- | --- |
| `0007_admin_panel.sql` | Objetos administrativos presentes; histórico vazio | `0022`, `0036` e rotas `/admin` | Não isoladamente | Incorporado na baseline |
| `0007_lgpd_privacy.sql` | Objetos LGPD presentes; histórico vazio | `0008`, `0032` e rotas LGPD | Não isoladamente | Incorporado na baseline |
| `0041_onboarding_invites.sql` | Objetos de onboarding presentes; histórico vazio | fluxo `/onboarding` e convites | Não isoladamente | Incorporado na baseline |
| `0041_solo_mode.sql` | Ausente antes da correção; aplicado como delta forward-only | rotas Solo, recibos, propostas e tipos | Não isoladamente | Incorporado na baseline e aplicado ao remoto |
| `0042_document_access_logs.sql` | Presente; histórico vazio | auditoria e segurança de documentos | Não isoladamente | Incorporado na baseline |
| `0042_solo_pro.sql` | Ausente antes da correção; aplicado como delta forward-only | relatórios Solo, diagnóstico e recomendações | Não isoladamente | Incorporado na baseline e aplicado ao remoto |

Não foram encontrados outros branches, tags, releases ou arquivos locais de
`schema_migrations` para o projeto. O remoto era o único ambiente disponível
para confirmação e estava com histórico vazio; por isso a baseline foi preferida
à renumeração parcial.

O `config.toml` foi normalizado para a versão instalada do CLI `2.65.2`.
As opções incompatíveis foram removidas: `db.health_timeout`, `local_smtp` e
`experimental.pgdelta`. Um backup pré-ajuste foi mantido localmente.

## Procedimento seguro

1. Validar a baseline em um banco vazio descartável.
2. Aplicar no remoto somente as deltas Solo ausentes, se a comparação confirmar
   que elas ainda não existem.
3. Executar `supabase migration repair` somente para a versão canônica, depois
   de validar que o schema remoto corresponde à baseline.
4. Validar com `supabase migration list` antes de qualquer `db push`.

Não executar `db reset` remoto nem inserir diretamente em
`supabase_migrations.schema_migrations`.

## Prevenção

### Reconciliação de 2026-07-27

O projeto remoto do Alfenus foi consultado explicitamente pela conexão do projeto. O histórico remoto contém `20260726200000`, que corresponde à baseline canônica, e não contém a fundação de propostas inicialmente. O projeto vinculado ao CLI local apontava para outro ref e não foi alterado.

O dry-run remoto mostrou somente `20260727120000_commercial_proposals_foundation.sql`, que foi aplicado com sucesso. Após a verificação dos objetos, a correção necessária das policies de INSERT para as RPCs invoker foi publicada em `20260727130000_commercial_proposals_rpc_rls_fix.sql`; seu dry-run também mostrou somente essa migration e ela foi aplicada.

O resultado final de `supabase migration list` no projeto Alfenus é: baseline `20260726200000`, foundation `20260727120000` e fix `20260727130000`. Nenhum `migration repair` foi necessário e nenhuma linha de `schema_migrations` foi alterada diretamente.

O encerramento posterior aplicou as migrations incrementais `20260727140000` até `20260727210000`, incluindo duplicação, optimistic locking, proteção da Data API e correções de definição das RPCs. As migrations `20260727170000` e `20260727190000` foram diagnósticos transitórios, imediatamente substituídos por `20260727180000` e `20260727200000`/`20260727210000`; o catálogo final contém as definições seguras.

Antes de criar uma migration, execute:

```text
npm run db:migrations:check
```

O comando falha quando encontra prefixos duplicados na pasta ativa. Para
reconstruir a migration canônica após uma nova delta, execute:

```text
npm run db:migrations:canonical
```
