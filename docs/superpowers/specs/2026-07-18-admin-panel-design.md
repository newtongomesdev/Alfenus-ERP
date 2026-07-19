# Painel Admin - Design Spec

## Visão Geral

Painel de administração da plataforma Alfenus (SaaS multi-tenant para escritórios de advocacia). Permite que um super-admin gerencie todos os tenants, usuários, visualize métricas globais e monitore o sistema.

**Abordagem:** Rotas `/admin/*` no mesmo app Next.js 16. O `proxy.ts` protege as rotas verificando `app_metadata.role = 'superadmin'` no JWT. Queries cross-tenant usam o cliente Supabase service_role (`getSupabaseAdminClient()`).

## 1. Autenticação e Autorização

### Identificação do Superadmin
- O Supabase Auth armazena `app_metadata.role = 'superadmin'` no JWT do super-admin
- `app_metadata` é imutável pelo cliente (só alterável via Admin API ou Dashboard)
- Para criar o primeiro superadmin: usar o Supabase Dashboard para setar `app_metadata.role = 'superadmin'` em um usuário existente

### Proteção de Rotas
- `proxy.ts` verifica: se a rota começa com `/admin`, decodifica o JWT e checa `app_metadata.role`
- Se não for `superadmin` → redireciona para `/dashboard`
- Superadmins sem tenant ativo são redirecionados para `/admin` (não precisam de tenant para acessar o painel)

### Contexto Admin
- Nova função `getAdminContext()` em `src/lib/admin/auth.ts`
- Retorna: `{ user, isSuperAdmin, adminClient }` ou redireciona
- O `adminClient` é o Supabase client com `SUPABASE_SERVICE_ROLE_KEY` (bypassa RLS)

## 2. Estrutura de Rotas

```
/admin                          → Dashboard global (métricas resumidas)
/admin/escritorios              → Lista de todos os tenants (paginada, busca, filtros)
/admin/escritorios/[id]         → Detalhe do escritório (dados, métricas, membros, ações)
/admin/usuarios                 → Lista de todos os usuários (cross-tenant, paginada)
/admin/usuarios/[id]            → Detalhe do usuário (dados Auth, tenants vinculados)
/admin/logs                     → Logs de auditoria globais (filtros por tenant, ação, data)
/admin/saude                    → Health check do sistema (storage, contagens, erros)
```

### Layout Admin
- `src/app/admin/layout.tsx` — layout raiz do admin, com sidebar e header próprios
- `src/components/layout/admin-shell.tsx` — shell do admin (sidebar + header + conteúdo)
- `src/components/layout/admin-sidebar.tsx` — sidebar com navegação admin

### Navegação Admin
| Ícone | Item | Rota |
|-------|------|------|
| LayoutDashboard | Dashboard | /admin |
| Building2 | Escritórios | /admin/escritorios |
| Users | Usuários | /admin/usuarios |
| ScrollText | Logs | /admin/logs |
| HeartPulse | Saúde | /admin/saude |
| ArrowLeft | Voltar ao app | /dashboard |

## 3. Gestão de Tenants

### Lista (`/admin/escritorios`)
- Tabela paginada (20 por página) com colunas: Nome, Slug, Plano, Status, Membros, Criado em
- Busca por nome/slug (input com debounce)
- Filtro por status: Todos, Ativos, Suspensos
- Métricas no topo: Total de tenants, Ativos, Suspensos
- Click na linha → `/admin/escritorios/[id]`

### Detalhe (`/admin/escritorios/[id]`)
- **Dados cadastrais:** Nome, slug, documento, email, telefone, endereço (jsonb), plano, status
- **Métricas do tenant:** Clientes, Processos, Contratos, Parcelas (total, pagas, abertas), Pagamentos, Membros
- **Lista de membros:** Nome, email, papel, status, último acesso
- **Ações:**
  - Suspender → `UPDATE law_firms SET status = 'suspenso' WHERE id = $id` (com confirmação)
  - Reativar → `UPDATE law_firms SET status = 'ativo' WHERE id = $id`
  - Editar dados → Modal com formulário de edição
- **Log de tenant:** Últimas 50 entradas de `audit_logs` filtradas por `law_firm_id`

### Queries (service_role)
```typescript
getAdminTenants(page, limit, search?, status?) → { tenants, totalCount }
getAdminTenantDetail(tenantId) → { tenant, metrics, members }
updateTenantStatus(tenantId, status) → void
updateTenantData(tenantId, data) → void
```

## 4. Gestão de Usuários

### Lista (`/admin/usuarios`)
- Tabela paginada (20 por página) com colunas: Nome, Email, Tenants, Último acesso
- Busca por nome/email
- Métricas no topo: Total de usuários, Ativos (acesso últimos 30 dias), Sem tenant
- Click na linha → `/admin/usuarios/[id]`

### Detalhe (`/admin/usuarios/[id]`)
- **Dados Auth:** Email, data de criação, último sign-in, email confirmado
- **Tenants vinculados:** Nome do escritório, papel, status, desde quando
- **Ações:**
  - Desativar membership → `UPDATE law_firm_members SET status = 'inativo' WHERE id = $memberId` (com confirmação)
  - Redefinir senha → Supabase Admin API `admin.auth.admin.generateLink()`

### Queries (service_role)
```typescript
getAdminUsers(page, limit, search?) → { users, totalCount }
getAdminUserDetail(userId) → { user, memberships }
deactivateUserMembership(memberId) → void
resetUserPassword(userId) → { resetLink }
```

**Observação:** Não criamos usuários no admin. O fluxo de cadastro/convite existente é o caminho oficial.

## 5. Métricas da Platform

### Dashboard (`/admin`)
- **MetricCards no topo:**
  - Total de tenants (ativos / suspensos)
  - Total de usuários
  - Tenants criados este mês
  - Total de documentos armazenados
- **Gráfico:** Novos tenants por mês (últimos 12 meses) — usando Chart.js ou recharts
- **Tabela:** Últimos 10 tenants criados (nome, plano, data, membros)

### Queries (service_role)
```typescript
getAdminPlatformMetrics() → {
  totalTenants, activeTenants, suspendedTenants,
  totalUsers, activeUsers,
  tenantsThisMonth,
  totalDocuments, totalStorageBytes
}
getAdminRecentTenants(limit) → TenantListItem[]
getAdminTenantsByMonth(months) → Array<{ month, count }>
```

## 6. Logs de Auditoria

### Página (`/admin/logs`)
- Tabela paginada (50 por página) de `audit_logs` cross-tenant
- Colunas: Data/Hora, Escritório, Ator, Ação, Entidade, ID da Entidade
- Filtros:
  - Escritório (select com busca)
  - Ação (select: todos, pagamentos, estornos, convites, etc.)
  - Período (date range: de/ate)
- Click expande metadata JSON (se disponível)

### Queries (service_role)
```typescript
getAdminAuditLogs(page, limit, filters?) → { logs, totalCount }
// filters: { lawFirmId?, action?, dateFrom?, dateTo? }
```

## 7. Saúde do Sistema

### Página (`/admin/saude`)
- **Contagens por tabela:** clients, leads, legal_cases, contracts, installments, payments, expenses, deadlines, tasks, appointments, documents, notifications, audit_logs
- **Storage:** Total de arquivos, tamanho total, uso por bucket
- **Membros:** Total, ativos, por papel
- **Status geral:** Verde/Amarelo/Vermelho baseado em thresholds (ex: >1000 erros = vermelho)

### Queries (service_role)
```typescript
getAdminSystemHealth() → {
  tableCounts: Record<string, number>,
  storageUsage: { files: number, bytes: number },
  memberStats: { total, byRole: Record<string, number> }
}
```

## 8. Mudanças no Banco de Dados

### Migration `0007_admin_panel.sql`

```sql
-- Função para verificar se o usuário é superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT coalesce(
    (auth.jwt()->'app_metadata'->>'role') = 'superadmin',
    false
  )
$$;

-- Políticas RLS para superadmins (leitura cross-tenant)
-- Superadmins podem ler todos os law_firms
CREATE POLICY "Superadmins can view all tenants"
  ON public.law_firms FOR SELECT
  USING (public.is_superadmin());

-- Superadmins podem ler todos os members
CREATE POLICY "Superadmins can view all members"
  ON public.law_firm_members FOR SELECT
  USING (public.is_superadmin());

-- Superadmins podem atualizar tenants (suspender/reativar/editar)
CREATE POLICY "Superadmins can update tenants"
  ON public.law_firms FOR UPDATE
  USING (public.is_superadmin());

-- Superadmins podem ler todos os audit_logs
CREATE POLICY "Superadmins can view all audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.is_superadmin());

-- Bug fix: corrigir referência 'members' → 'law_firm_members' nas RPCs
-- (register_payment e reverse_payment)
```

**Nota:** Embora o admin use service_role (que bypassa RLS), as políticas RLS para superadmins são uma camada extra de segurança caso alguém acidentalmente use o cliente anon em vez do admin.

## 9. Arquivos a Criar/Modificar

### Novos (15 arquivos)
| Arquivo | Descrição |
|---------|-----------|
| `supabase/migrations/0007_admin_panel.sql` | Função is_superadmin + políticas RLS + bug fix |
| `src/lib/admin/auth.ts` | getAdminContext() |
| `src/lib/admin/queries.ts` | Todas as queries cross-tenant |
| `src/components/layout/admin-shell.tsx` | Shell do admin |
| `src/components/layout/admin-sidebar.tsx` | Sidebar admin |
| `src/app/admin/layout.tsx` | Layout raiz do admin |
| `src/app/admin/page.tsx` | Dashboard global |
| `src/app/admin/escritorios/page.tsx` | Lista de tenants |
| `src/app/admin/escritorios/[id]/page.tsx` | Detalhe do tenant |
| `src/app/admin/usuarios/page.tsx` | Lista de usuários |
| `src/app/admin/usuarios/[id]/page.tsx` | Detalhe do usuário |
| `src/app/admin/logs/page.tsx` | Logs de auditoria |
| `src/app/admin/saude/page.tsx` | Saúde do sistema |
| `src/app/admin/escritorios/actions.ts` | Server actions admin |
| `src/app/admin/usuarios/actions.ts` | Server actions admin |

### Modificados (2 arquivos)
| Arquivo | Mudança |
|---------|---------|
| `src/proxy.ts` | Adicionar proteção de rotas `/admin/*` |
| `src/lib/supabase/types.ts` | Adicionar tipos para is_superadmin |

## 10. Fora do Escopo (por enquanto)

- **Gestão de billing/assinaturas** — o campo `plan` continua como string; sistema de cobrança é um projeto separado
- **Feature flags** — não implementado nesta fase
- **Impersonation** (logar como membro de um tenant) — funcionalidade avançada para futura iteração
- **Dashboard com gráficos interativos** — métricas simples com MetricCards; gráfico de tenants por mês usa componente leve
- **Notificações push para superadmins** — fora do escopo
