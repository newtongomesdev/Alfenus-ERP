# Deploy na Vercel - Alfenus

## Projeto

Conecte o repositório GitHub `newtongomesdev/Alfenus-ERP` na Vercel.

Configuração esperada:

- **Framework Preset:** Next.js
- **Root Directory:** raiz do repositório
- **Install Command:** `npm install`
- **Build Command:** `npm run build`
- **Output Directory:** deixe vazio/padrão

O arquivo `vercel.json` já configura o cron de alertas:

```json
{
  "crons": [
    {
      "path": "/api/cron/alerts",
      "schedule": "0 8 * * *"
    }
  ]
}
```

## Variáveis de ambiente

Configure estas variáveis em **Vercel > Project > Settings > Environment Variables**.

Use em **Production**:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=https://SEU-DOMINIO
CRON_SECRET=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_STARTER=
STRIPE_PRICE_PROFESSIONAL=
STRIPE_PRICE_BUSINESS=
RESEND_API_KEY=
```

Use também em **Preview** se quiser testar branches/PRs na Vercel. Se o Preview apontar para o mesmo Supabase de produção, qualquer teste gravará no banco real.

## Supabase Auth

Depois de ter a URL de produção da Vercel, ajuste em **Supabase > Authentication > URL Configuration**:

```text
Site URL:
https://SEU-DOMINIO

Redirect URLs:
https://SEU-DOMINIO/**
https://*.vercel.app/**
http://localhost:3000/**
```

Se o domínio final ainda não estiver pronto, use temporariamente a URL de produção da Vercel:

```text
https://NOME-DO-PROJETO.vercel.app
```

Quando o domínio definitivo estiver conectado, atualize `NEXT_PUBLIC_APP_URL` na Vercel e o **Site URL** no Supabase para o domínio definitivo.

## Stripe

No Stripe Dashboard:

1. Crie os produtos/assinaturas.
2. Copie os Price IDs para:
   - `STRIPE_PRICE_STARTER`
   - `STRIPE_PRICE_PROFESSIONAL`
   - `STRIPE_PRICE_BUSINESS`
3. Configure o webhook de produção para:

```text
https://SEU-DOMINIO/api/stripe/webhook
```

Eventos necessários:

```text
checkout.session.completed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.payment_succeeded
invoice.payment_failed
```

Copie o signing secret do webhook para:

```text
STRIPE_WEBHOOK_SECRET=
```

## Resend

No Resend:

1. Verifique o domínio remetente.
2. Use a chave em `RESEND_API_KEY`.
3. No Supabase SMTP, use:

```text
Host: smtp.resend.com
Port: 465
Username: resend
Password: RESEND_API_KEY
Sender name: Alfenus
Sender email: email verificado no Resend
```

## Checklist antes do primeiro deploy

1. Rodar `npm run typecheck`.
2. Rodar `npm test -- --run`.
3. Rodar `npm run build`.
4. Aplicar `supabase/alfenus_schema_completo.sql` no Supabase.
5. Configurar variáveis na Vercel.
6. Configurar URLs de autenticação no Supabase.
7. Configurar webhook do Stripe com a URL final.
8. Fazer deploy pela integração GitHub da Vercel.
