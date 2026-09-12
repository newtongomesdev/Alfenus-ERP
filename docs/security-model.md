# Modelo de segurança

Além das regras existentes, propostas comerciais usam `law_firm_id` em todas as entidades, RLS em todas as tabelas e escrita limitada a proprietário, administrador e advogado. Suporte assistido não possui acesso a propostas nem destinatários. E-mails, telefones e observações internas não são expostos pelas leituras seguras previstas para a Data API.

As RPCs validam `auth.uid()`, membership ativo, tenant e papel; não recebem `law_firm_id`, ator, margem, custos ou memória interna do cliente. As tabelas históricas têm triggers append-only e os grants diretos de destinatários, eventos e idempotência são revogados para `authenticated`. O snapshot de pricing retém somente dados comerciais necessários à integridade histórica.
