# E-mails do Supabase Auth - Alfenus

Use estes textos em **Supabase Dashboard > Authentication > Email Templates**.

Em **Authentication > URL Configuration**, configure:

- **Site URL local:** `http://localhost:3000`
- **Site URL producao:** dominio final do Alfenus ou URL de producao da Vercel
- **Redirect URLs local:** `http://localhost:3000/**`
- **Redirect URLs producao:** `https://SEU-DOMINIO/**`
- **Redirect URLs preview Vercel:** `https://*.vercel.app/**`

Em **Project Settings > Authentication > SMTP Settings**, usando Resend:

- **Host:** `smtp.resend.com`
- **Port:** `465`
- **Username:** `resend`
- **Password:** valor de `RESEND_API_KEY`
- **Sender email:** e-mail verificado no Resend, por exemplo `contato@seudominio.com.br`
- **Sender name:** `Alfenus`

## Confirm signup

**Subject**

```text
Confirme seu e-mail no Alfenus
```

**Body**

```html
<div style="margin:0;padding:0;background:#f7f7f5;font-family:Inter,Arial,sans-serif;color:#1f2933;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f7f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e5e2dc;border-radius:14px;overflow:hidden;">
          <tr>
            <td style="padding:28px 32px 12px;">
              <p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#7c6b43;">Alfenus</p>
              <h1 style="margin:0;font-size:24px;line-height:1.25;color:#111827;">Confirme seu e-mail</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 0;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#4b5563;">
                Falta apenas esta etapa para ativar sua conta e concluir a configuracao inicial do escritorio no Alfenus.
              </p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:#4b5563;">
                Confirme que este e-mail pertence a voce para acessar o ambiente com seguranca.
              </p>
              <p style="margin:0 0 28px;">
                <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#1f2933;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;border-radius:10px;padding:13px 18px;">
                  Confirmar e-mail
                </a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid #eeeae3;background:#fbfaf8;">
              <p style="margin:0 0 10px;font-size:12px;line-height:1.6;color:#6b7280;">
                Se o botao nao funcionar, copie e cole este link no navegador:
              </p>
              <p style="margin:0;font-size:12px;line-height:1.6;word-break:break-all;color:#374151;">
                {{ .ConfirmationURL }}
              </p>
              <p style="margin:18px 0 0;font-size:12px;line-height:1.6;color:#6b7280;">
                Se voce nao criou uma conta no Alfenus, ignore este e-mail.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</div>
```

## Reset password

**Subject**

```text
Redefina sua senha do Alfenus
```

**Body**

```html
<div style="margin:0;padding:0;background:#f7f7f5;font-family:Inter,Arial,sans-serif;color:#1f2933;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f7f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e5e2dc;border-radius:14px;overflow:hidden;">
          <tr>
            <td style="padding:28px 32px 12px;">
              <p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#7c6b43;">Alfenus</p>
              <h1 style="margin:0;font-size:24px;line-height:1.25;color:#111827;">Redefina sua senha</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 0;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#4b5563;">
                Recebemos uma solicitacao para alterar a senha da sua conta no Alfenus.
              </p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:#4b5563;">
                Use o link abaixo para criar uma nova senha com seguranca.
              </p>
              <p style="margin:0 0 28px;">
                <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#1f2933;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;border-radius:10px;padding:13px 18px;">
                  Redefinir senha
                </a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid #eeeae3;background:#fbfaf8;">
              <p style="margin:0 0 10px;font-size:12px;line-height:1.6;color:#6b7280;">
                Se voce nao pediu esta alteracao, ignore este e-mail. Sua senha atual permanecera a mesma.
              </p>
              <p style="margin:0;font-size:12px;line-height:1.6;word-break:break-all;color:#374151;">
                {{ .ConfirmationURL }}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</div>
```

## Magic link

**Subject**

```text
Acesse sua conta Alfenus
```

**Body**

```html
<div style="margin:0;padding:0;background:#f7f7f5;font-family:Inter,Arial,sans-serif;color:#1f2933;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f7f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e5e2dc;border-radius:14px;overflow:hidden;">
          <tr>
            <td style="padding:28px 32px 12px;">
              <p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#7c6b43;">Alfenus</p>
              <h1 style="margin:0;font-size:24px;line-height:1.25;color:#111827;">Acesse sua conta</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 0;">
              <p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:#4b5563;">
                Use o link abaixo para entrar no Alfenus sem digitar sua senha.
              </p>
              <p style="margin:0 0 28px;">
                <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#1f2933;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;border-radius:10px;padding:13px 18px;">
                  Entrar no Alfenus
                </a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid #eeeae3;background:#fbfaf8;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:#6b7280;">
                Se voce nao solicitou este acesso, ignore este e-mail.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</div>
```

## Invite user

**Subject**

```text
Voce foi convidado para o Alfenus
```

**Body**

```html
<div style="margin:0;padding:0;background:#f7f7f5;font-family:Inter,Arial,sans-serif;color:#1f2933;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f7f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e5e2dc;border-radius:14px;overflow:hidden;">
          <tr>
            <td style="padding:28px 32px 12px;">
              <p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#7c6b43;">Alfenus</p>
              <h1 style="margin:0;font-size:24px;line-height:1.25;color:#111827;">Convite para o escritorio</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 0;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#4b5563;">
                Voce recebeu um convite para acessar um escritorio no Alfenus.
              </p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:#4b5563;">
                Aceite o convite para entrar no ambiente da equipe e acompanhar clientes, processos, prazos e documentos.
              </p>
              <p style="margin:0 0 28px;">
                <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#1f2933;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;border-radius:10px;padding:13px 18px;">
                  Aceitar convite
                </a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid #eeeae3;background:#fbfaf8;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:#6b7280;">
                Se voce nao esperava este convite, ignore este e-mail.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</div>
```

## Change email address

**Subject**

```text
Confirme a alteracao de e-mail no Alfenus
```

**Body**

```html
<div style="margin:0;padding:0;background:#f7f7f5;font-family:Inter,Arial,sans-serif;color:#1f2933;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f7f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e5e2dc;border-radius:14px;overflow:hidden;">
          <tr>
            <td style="padding:28px 32px 12px;">
              <p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#7c6b43;">Alfenus</p>
              <h1 style="margin:0;font-size:24px;line-height:1.25;color:#111827;">Confirme o novo e-mail</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 0;">
              <p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:#4b5563;">
                Para concluir a alteracao do e-mail da sua conta, confirme o novo endereco usando o botao abaixo.
              </p>
              <p style="margin:0 0 28px;">
                <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#1f2933;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;border-radius:10px;padding:13px 18px;">
                  Confirmar novo e-mail
                </a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid #eeeae3;background:#fbfaf8;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:#6b7280;">
                Se voce nao solicitou esta alteracao, revise a seguranca da sua conta.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</div>
```

## Reauthentication

**Subject**

```text
Codigo de seguranca do Alfenus
```

**Body**

```html
<div style="margin:0;padding:0;background:#f7f7f5;font-family:Inter,Arial,sans-serif;color:#1f2933;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f7f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e5e2dc;border-radius:14px;overflow:hidden;">
          <tr>
            <td style="padding:28px 32px 12px;">
              <p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#7c6b43;">Alfenus</p>
              <h1 style="margin:0;font-size:24px;line-height:1.25;color:#111827;">Codigo de seguranca</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 28px;">
              <p style="margin:0 0 18px;font-size:15px;line-height:1.65;color:#4b5563;">
                Use este codigo para confirmar uma acao sensivel na sua conta:
              </p>
              <p style="margin:0;font-size:28px;font-weight:800;letter-spacing:.18em;color:#111827;">
                {{ .Token }}
              </p>
              <p style="margin:22px 0 0;font-size:12px;line-height:1.6;color:#6b7280;">
                Nao compartilhe este codigo. A equipe do Alfenus nunca solicitara este codigo fora da plataforma.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</div>
```
