Você continuará o desenvolvimento do ERP jurídico SaaS já existente.



O projeto já possui os módulos fundamentais de:



\- escritórios e tenants;

\- autenticação;

\- usuários;

\- papéis e permissões;

\- clientes;

\- leads;

\- pipeline;

\- processos;

\- casos extrajudiciais;

\- contratos;

\- honorários;

\- parcelas;

\- pagamentos;

\- despesas;

\- prazos;

\- audiências;

\- agenda;

\- tarefas;

\- documentos;

\- equipe;

\- notificações;

\- relatórios;

\- workflows;

\- portal do cliente;

\- timesheet;

\- campos personalizados;

\- importação e exportação;

\- auditoria;

\- pesquisa global;

\- comentários e menções;

\- correspondentes;

\- solicitações de documentos;

\- geração de documentos.



OBJETIVO DESTA ETAPA



Evoluir o sistema para uma plataforma jurídica de nível empresarial, com:



\- controladoria jurídica;

\- cálculo estruturado de prazos;

\- gestão avançada de contratos;

\- provisionamento e risco;

\- controle de valores pertencentes a clientes;

\- central de solicitações jurídicas;

\- formulários públicos;

\- comunicação centralizada;

\- tratamento local de PDFs;

\- PWA;

\- administração completa do SaaS;

\- planos e limites;

\- onboarding;

\- suporte;

\- segurança empresarial;

\- LGPD;

\- arquitetura preparada para integrações futuras.



Não recrie módulos existentes.



Antes de escrever código:



1\. Analise todo o estado atual do projeto.

2\. Leia migrations, banco, RLS, tipos, serviços, rotas, componentes e testes.

3\. Liste quais funcionalidades deste escopo já existem integralmente.

4\. Liste quais existem parcialmente.

5\. Identifique conflitos de arquitetura.

6\. Não suponha nomes de tabelas, caminhos ou padrões sem inspecionar.

7\. Preserve dados, compatibilidade e funcionalidades atuais.

8\. Não execute migrations destrutivas.

9\. Trabalhe em blocos pequenos, verificáveis e reversíveis.

10\. Não avance automaticamente entre os blocos.



REGRAS DE CUSTO



Nesta etapa, o sistema deve permanecer funcional sem custos externos obrigatórios.



Não implementar agora:



\- APIs pagas de tribunais;

\- monitoramento processual pago;

\- captura paga de publicações;

\- WhatsApp Business API;

\- SMS;

\- inteligência artificial paga;

\- OCR pago;

\- assinatura eletrônica paga;

\- boletos pagos;

\- Pix por intermediador;

\- conciliação bancária paga;

\- pesquisa jurídica paga;

\- jurimetria externa;

\- serviços comerciais obrigatórios.



Crie arquitetura preparada para esses serviços, mas mantenha todos como opcionais.



Use preferencialmente:



\- PostgreSQL;

\- Supabase já configurado;

\- Supabase Auth;

\- Supabase Storage;

\- Row Level Security;

\- recursos do navegador;

\- processamento local;

\- impressão;

\- HTML;

\- PDF local;

\- CSV;

\- APIs internas;

\- bibliotecas livres e compatíveis com a licença do produto.



Antes de adicionar qualquer nova dependência:



1\. verifique se já existe recurso equivalente no projeto;

2\. avalie o impacto no bundle;

3\. verifique licença;

4\. verifique manutenção;

5\. verifique riscos de segurança;

6\. documente a justificativa.



PRINCÍPIOS OBRIGATÓRIOS



\- Manter arquitetura multitenant.

\- Vincular todos os registros ao escritório.

\- Usar RLS em todas as tabelas sensíveis.

\- Nunca confiar no tenant enviado pelo navegador.

\- Determinar tenant e permissões pela sessão no servidor.

\- Não usar service role no cliente.

\- Validar dados no cliente e no servidor.

\- Registrar ações sensíveis em auditoria.

\- Usar exclusão lógica quando apropriado.

\- Não permitir alteração silenciosa de dados jurídicos críticos.

\- Não permitir alteração financeira sem histórico.

\- Não armazenar valores monetários em float.

\- Usar transações em operações com múltiplas tabelas.

\- Usar operações idempotentes.

\- Manter interface em português brasileiro.

\- Exibir valores em BRL.

\- Exibir datas no padrão brasileiro.

\- Garantir responsividade e acessibilidade.

\- Manter tema claro e escuro.

\- Não deixar botões sem funcionamento.

\- Não usar dados mockados na implementação final.

\- Não criar apenas telas demonstrativas.



==================================================

MÓDULO 1 — CONTROLADORIA JURÍDICA

==================================================



Criar uma central de controladoria para recebimento, triagem, distribuição e acompanhamento de publicações, intimações e comunicações processuais.



Nesta fase, a entrada pode ser:



\- manual;

\- importação CSV;

\- importação de arquivo estruturado;

\- criação interna;

\- provider futuro.



Criar entidade equivalente a:



legal\_publications



Campos mínimos:



\- id;

\- law\_firm\_id;

\- process\_id opcional;

\- client\_id opcional;

\- tribunal;

\- diário;

\- número do processo;

\- data de disponibilização;

\- data de publicação;

\- conteúdo integral;

\- resumo manual;

\- tipo;

\- origem;

\- status;

\- prioridade;

\- responsável pela triagem;

\- advogado responsável;

\- prazo sugerido;

\- prazo confirmado;

\- tratado\_em;

\- tratado\_por;

\- revisado\_em;

\- revisado\_por;

\- observações;

\- created\_at;

\- updated\_at.



Status:



\- recebida;

\- aguardando triagem;

\- em análise;

\- aguardando distribuição;

\- aguardando cálculo;

\- aguardando revisão;

\- tratada;

\- ignorada;

\- duplicada;

\- arquivada.



Tipos:



\- intimação;

\- despacho;

\- decisão;

\- sentença;

\- acórdão;

\- citação;

\- publicação administrativa;

\- outro.



Funcionalidades:



\- caixa de entrada;

\- itens não tratados;

\- identificação de duplicidade;

\- vinculação a processo;

\- vinculação a cliente;

\- atribuição de responsável;

\- tratamento individual;

\- tratamento em lote;

\- filtros por tribunal;

\- filtros por responsável;

\- filtros por processo;

\- filtros por cliente;

\- filtros por período;

\- filtros por status;

\- confirmação de leitura;

\- criação de prazo;

\- criação de tarefa;

\- criação de audiência;

\- marcação como irrelevante;

\- justificativa obrigatória ao ignorar;

\- histórico completo;

\- indicadores de risco;

\- auditoria.



Criar painel da controladoria com:



\- publicações recebidas hoje;

\- publicações não tratadas;

\- itens aguardando revisão;

\- itens sem responsável;

\- prazos criados;

\- itens vencidos sem tratamento;

\- tempo médio de triagem;

\- volume por responsável;

\- volume por tribunal;

\- taxa de tratamento no prazo.



Criar alertas internos quando:



\- uma publicação ficar sem responsável;

\- uma publicação não for tratada no tempo configurado;

\- o prazo sugerido estiver próximo;

\- a revisão estiver pendente;

\- houver possível duplicidade;

\- houver falha em importação.



Não integrar provedores externos nesta fase.



==================================================

MÓDULO 2 — MOTOR DE CÁLCULO DE PRAZOS

==================================================



Evoluir o prazo jurídico para um modelo calculável, auditável e revisável.



Criar uma entidade ou estrutura equivalente a:



deadline\_calculations



Campos:



\- id;

\- law\_firm\_id;

\- deadline\_id;

\- publication\_id opcional;

\- tribunal;

\- jurisdição;

\- tipo de procedimento;

\- regra processual;

\- data de disponibilização;

\- data de publicação;

\- data de ciência;

\- data inicial;

\- quantidade;

\- unidade;

\- dias úteis;

\- incluir data inicial;

\- incluir data final;

\- data calculada;

\- data ajustada;

\- motivo do ajuste;

\- calendário utilizado;

\- feriados considerados;

\- suspensões consideradas;

\- calculado\_por;

\- calculado\_em;

\- revisado\_por;

\- revisado\_em;

\- aprovado\_por;

\- aprovado\_em;

\- status;

\- versão;

\- created\_at.



Unidades:



\- dias;

\- horas;

\- meses;

\- anos.



Status:



\- rascunho;

\- calculado;

\- aguardando revisão;

\- revisado;

\- confirmado;

\- substituído;

\- cancelado.



Criar calendários internos:



\- feriados nacionais;

\- feriados estaduais;

\- feriados municipais;

\- recessos;

\- suspensões;

\- indisponibilidade do tribunal;

\- dias sem expediente.



Permitir ao administrador manter calendários por:



\- país;

\- estado;

\- município;

\- tribunal;

\- unidade judicial;

\- período.



O cálculo deve suportar:



\- dias úteis;

\- dias corridos;

\- exclusão da data inicial;

\- inclusão da data final;

\- ajustes por feriado;

\- ajustes por suspensão;

\- recesso;

\- vencimento em dia não útil;

\- prazo em horas;

\- justificativas manuais;

\- versionamento;

\- recálculo controlado.



Fluxo obrigatório:



prazo identificado

→ cálculo preliminar

→ revisão por segundo usuário

→ confirmação

→ acompanhamento

→ conclusão.



Criar opção de dupla conferência obrigatória conforme:



\- tipo de prazo;

\- área jurídica;

\- prioridade;

\- tribunal;

\- configuração do escritório.



Não trate o resultado como aconselhamento jurídico automático.



Exibir aviso de que o cálculo precisa de revisão profissional.



Registrar sempre:



\- parâmetros;

\- regra utilizada;

\- calendário;

\- usuário;

\- data;

\- alterações;

\- versão anterior.



Criar testes extensivos para o motor de cálculo.



==================================================

MÓDULO 3 — CLM E GESTÃO AVANÇADA DE CONTRATOS

==================================================



Não substituir contratos de honorários existentes.



Adicionar um módulo de Contract Lifecycle Management para contratos jurídicos, administrativos e empresariais.



Criar entidades equivalentes a:



contract\_requests

contract\_templates

contract\_clauses

contract\_versions

contract\_approvals

contract\_obligations

contract\_amendments

contract\_counterparties



CICLO DO CONTRATO



\- solicitação;

\- triagem;

\- minuta;

\- revisão;

\- negociação;

\- aprovação;

\- assinatura pendente;

\- ativo;

\- renovação;

\- encerramento;

\- rescindido;

\- arquivado.



SOLICITAÇÃO



Campos:



\- solicitante;

\- cliente;

\- empresa;

\- categoria;

\- tipo de contrato;

\- descrição;

\- prioridade;

\- data necessária;

\- responsável;

\- documentos;

\- status;

\- SLA.



MINUTAS E VERSÕES



Permitir:



\- criar minuta;

\- aplicar modelo;

\- criar nova versão;

\- comparar versões;

\- registrar autor;

\- comentários;

\- aprovação;

\- bloqueio de edição;

\- restauração;

\- histórico.



BIBLIOTECA DE CLÁUSULAS



Cada cláusula deve ter:



\- título;

\- categoria;

\- texto;

\- versão;

\- risco;

\- obrigatória;

\- alternativa;

\- aprovada;

\- responsável;

\- observações;

\- status.



Permitir:



\- inserir cláusula;

\- substituir cláusula;

\- criar alternativas;

\- marcar desvio;

\- solicitar aprovação;

\- comparar com padrão.



OBRIGAÇÕES CONTRATUAIS



Campos:



\- contrato;

\- descrição;

\- parte responsável;

\- periodicidade;

\- vencimento;

\- responsável interno;

\- evidência;

\- status;

\- alerta;

\- conclusão.



Exemplos:



\- pagamento;

\- entrega;

\- reajuste;

\- renovação;

\- apresentação de certidão;

\- prestação de contas;

\- confidencialidade;

\- seguro;

\- garantia.



ADITIVOS



Permitir:



\- vinculação ao contrato original;

\- tipo;

\- data;

\- alterações;

\- nova vigência;

\- novo valor;

\- anexos;

\- aprovação;

\- status.



REAJUSTES E RENOVAÇÕES



Controlar:



\- índice;

\- percentual;

\- data-base;

\- aviso prévio;

\- renovação automática;

\- prazo de denúncia;

\- nova vigência;

\- responsável;

\- notificação interna.



Não implementar assinatura eletrônica externa agora.



Permitir:



\- marcação manual de assinatura;

\- upload do documento assinado;

\- registro dos signatários;

\- data da assinatura;

\- evidência;

\- status.



==================================================

MÓDULO 4 — PROVISIONAMENTO, RISCO E VALORES PROCESSUAIS

==================================================



Adicionar gestão de risco e provisionamento por processo e por pedido.



Criar entidades equivalentes a:



process\_claims

risk\_assessments

provisions

judicial\_guarantees

judicial\_deposits

seizures

court\_releases



PEDIDOS DO PROCESSO



Campos:



\- processo;

\- descrição;

\- categoria;

\- valor original;

\- valor atualizado;

\- data-base;

\- índice;

\- status;

\- resultado;

\- observações.



AVALIAÇÃO DE RISCO



Campos:



\- processo;

\- pedido opcional;

\- classificação;

\- probabilidade;

\- valor estimado;

\- cenário;

\- justificativa;

\- responsável;

\- data-base;

\- aprovado\_por;

\- versão;

\- status.



Classificações:



\- remoto;

\- possível;

\- provável.



Cenários:



\- otimista;

\- esperado;

\- pessimista.



PROVISIONAMENTO



Campos:



\- processo;

\- pedido;

\- risco;

\- valor;

\- competência;

\- data-base;

\- tipo;

\- justificativa;

\- responsável;

\- aprovado\_por;

\- status;

\- reversão;

\- histórico.



GARANTIAS E DEPÓSITOS



Controlar:



\- depósito judicial;

\- seguro garantia;

\- carta fiança;

\- bloqueio;

\- penhora;

\- caução;

\- bem oferecido;

\- valor;

\- banco;

\- número;

\- validade;

\- documento;

\- situação;

\- liberação.



ALVARÁS E LEVANTAMENTOS



Controlar:



\- valor liberado;

\- beneficiário;

\- data;

\- instituição;

\- processo;

\- documento;

\- repasse;

\- retenção;

\- status.



Criar relatórios:



\- provisão por cliente;

\- provisão por processo;

\- provisão por área;

\- risco por classificação;

\- evolução histórica;

\- garantias vigentes;

\- valores bloqueados;

\- valores liberados;

\- diferença entre provisionado e realizado.



==================================================

MÓDULO 5 — VALORES DE TERCEIROS E PRESTAÇÃO DE CONTAS

==================================================



Criar controle separado para valores recebidos em nome do cliente.



Não misturar esses valores com receita do escritório.



Criar entidades equivalentes a:



client\_funds\_accounts

client\_funds\_transactions

client\_funds\_allocations

client\_funds\_reconciliations

client\_funds\_statements



Controlar:



\- recebimento em nome do cliente;

\- origem;

\- processo;

\- valor;

\- data;

\- conta;

\- retenção autorizada;

\- honorários descontados;

\- despesas descontadas;

\- saldo do cliente;

\- repasse;

\- beneficiário;

\- comprovante;

\- aprovação;

\- prestação de contas.



Tipos de transação:



\- entrada;

\- retenção;

\- repasse;

\- devolução;

\- ajuste;

\- estorno.



Regras:



\- não permitir saldo negativo;

\- exigir justificativa para ajuste;

\- exigir aprovação para repasse acima de limite configurado;

\- manter histórico imutável;

\- não apagar transações financeiras;

\- usar estorno;

\- registrar usuário e horário;

\- gerar extrato por cliente;

\- gerar extrato por processo;

\- separar saldo por escritório;

\- impedir acesso sem permissão financeira.



Gerar:



\- demonstrativo;

\- recibo;

\- prestação de contas;

\- relatório de saldo;

\- relatório de valores sem repasse;

\- alertas de valores parados.



==================================================

MÓDULO 6 — CENTRAL DE SOLICITAÇÕES JURÍDICAS E SLA

==================================================



Criar um módulo para demandas consultivas e solicitações internas ou de clientes.



Criar entidades equivalentes a:



legal\_request\_types

legal\_requests

legal\_request\_stages

legal\_request\_approvals

legal\_request\_sla\_events

legal\_request\_messages



Tipos iniciais:



\- revisão contratual;

\- elaboração de contrato;

\- elaboração de parecer;

\- resposta a notificação;

\- análise de risco;

\- consulta jurídica;

\- abertura de processo;

\- diligência;

\- análise regulatória;

\- solicitação de documento;

\- outro.



Campos:



\- solicitante;

\- empresa;

\- cliente;

\- unidade;

\- tipo;

\- categoria;

\- descrição;

\- prioridade;

\- responsável;

\- participantes;

\- data de abertura;

\- prazo;

\- SLA;

\- status;

\- custo previsto;

\- horas;

\- documentos;

\- aprovação;

\- conclusão;

\- avaliação.



Status:



\- aberta;

\- triagem;

\- aguardando informações;

\- em andamento;

\- aguardando aprovação;

\- concluída;

\- cancelada;

\- vencida.



SLA



Permitir configurar por:



\- tipo;

\- prioridade;

\- cliente;

\- plano;

\- área;

\- escritório.



Controlar:



\- tempo de primeira resposta;

\- tempo de solução;

\- pausas;

\- reaberturas;

\- vencimento;

\- justificativa;

\- escalonamento.



Dashboard:



\- solicitações abertas;

\- solicitações vencidas;

\- SLA em risco;

\- tempo médio;

\- volume por área;

\- volume por solicitante;

\- desempenho por responsável;

\- satisfação.



==================================================

MÓDULO 7 — FORMULÁRIOS PÚBLICOS E AGENDAMENTO

==================================================



Criar formulários públicos configuráveis pelo escritório.



Não usar serviço externo de formulários.



Permitir criar:



\- formulário de contato;

\- pré-atendimento;

\- consulta trabalhista;

\- consulta previdenciária;

\- família;

\- inventário;

\- criminal;

\- empresarial;

\- solicitação jurídica;

\- cadastro de cliente;

\- envio de documentos.



Recursos:



\- campos personalizados;

\- campos condicionais;

\- páginas ou etapas;

\- validação;

\- consentimento LGPD;

\- upload;

\- origem;

\- campanha;

\- área jurídica;

\- responsável padrão;

\- tags;

\- mensagem de confirmação;

\- limite de envio;

\- proteção contra abuso;

\- ativação;

\- desativação;

\- link público;

\- código de incorporação.



Ao enviar:



\- criar lead;

\- registrar origem;

\- executar verificação inicial de duplicidade;

\- sugerir conflito;

\- criar atividade;

\- atribuir responsável;

\- registrar consentimento;

\- notificar internamente.



AGENDAMENTO



Criar agendamento interno sem serviços externos.



Permitir ao escritório definir:



\- profissionais;

\- serviços;

\- duração;

\- horários disponíveis;

\- intervalo;

\- dias permitidos;

\- antecedência mínima;

\- antecedência máxima;

\- bloqueios;

\- feriados;

\- modalidade;

\- endereço;

\- link de reunião manual;

\- limite diário.



O cliente pode:



\- selecionar serviço;

\- selecionar profissional;

\- selecionar data;

\- selecionar horário;

\- informar dados;

\- confirmar consentimento;

\- cancelar por link seguro;

\- remarcar por link seguro.



Não enviar e-mail ou SMS nesta etapa.



Mostrar confirmação na tela e gerar notificação interna.



==================================================

MÓDULO 8 — COMUNICAÇÃO JURÍDICA CENTRALIZADA

==================================================



Criar um módulo de comunicação interno e externo pelo portal.



Não depender de WhatsApp ou e-mail.



Tipos:



\- mensagem interna;

\- mensagem para cliente;

\- comunicado;

\- reunião;

\- ligação;

\- carta;

\- correspondência;

\- anotação;

\- atualização de processo.



Permitir vincular a:



\- cliente;

\- lead;

\- processo;

\- contrato;

\- solicitação;

\- tarefa;

\- documento.



Campos:



\- assunto;

\- conteúdo;

\- remetente;

\- destinatários;

\- visibilidade;

\- canal;

\- data;

\- confirmação de leitura;

\- anexos;

\- status;

\- resposta;

\- thread.



Visibilidade:



\- privada;

\- equipe;

\- cliente;

\- participantes específicos.



Recursos:



\- conversas em thread;

\- menções;

\- anexos;

\- mensagens fixadas;

\- confirmação de leitura;

\- modelos;

\- comunicados em lote internos;

\- histórico;

\- pesquisa;

\- filtros;

\- auditoria.



Não enviar mensagem externa automaticamente.



Preparar adapters futuros para e-mail e WhatsApp.



==================================================

MÓDULO 9 — FERRAMENTAS LOCAIS DE PDF

==================================================



Criar uma central de ferramentas de PDF usando bibliotecas livres e processamento local sempre que possível.



Funções:



\- unir PDFs;

\- separar PDF;

\- extrair páginas;

\- remover páginas;

\- reordenar páginas;

\- girar páginas;

\- duplicar páginas;

\- inserir numeração;

\- inserir marca d’água;

\- inserir cabeçalho;

\- inserir rodapé;

\- criar capa;

\- criar índice simples;

\- comprimir;

\- converter imagens para PDF;

\- gerar pacote processual;

\- aplicar tarjas manuais;

\- adicionar senha quando tecnicamente seguro;

\- remover metadados;

\- visualizar antes de salvar.



Regras:



\- não enviar documentos para serviço externo;

\- processar no navegador ou servidor próprio;

\- validar MIME type;

\- limitar tamanho;

\- impedir arquivos executáveis;

\- registrar operação em documento sensível;

\- não sobrescrever original sem confirmação;

\- criar nova versão;

\- permitir descarte do arquivo temporário;

\- limpar temporários automaticamente.



TARJA MANUAL



Permitir ao usuário:



\- desenhar retângulos;

\- confirmar aplicação permanente;

\- visualizar antes;

\- criar nova versão;

\- registrar quem aplicou.



Não prometer OCR ou identificação automática nesta fase.



==================================================

MÓDULO 10 — PWA E EXPERIÊNCIA MÓVEL

==================================================



Transformar o sistema em Progressive Web App.



Implementar:



\- manifest;

\- ícones;

\- instalação;

\- service worker;

\- estratégias seguras de cache;

\- página offline;

\- atualização controlada;

\- aviso de nova versão;

\- atalhos;

\- experiência móvel;

\- navegação touch;

\- formulários responsivos.



Recursos móveis prioritários:



\- agenda;

\- tarefas;

\- prazos;

\- clientes;

\- processos;

\- timesheet;

\- notificações;

\- documentos;

\- upload pela câmera;

\- registro de atividade;

\- contato com cliente;

\- checklists.



OFFLINE



Permitir apenas operações seguras:



\- leitura limitada de dados já carregados;

\- criação de rascunho;

\- edição de rascunho;

\- registro temporário de timesheet;

\- checklist;

\- anotação.



Não armazenar offline:



\- documentos sensíveis completos;

\- dados financeiros desnecessários;

\- tokens permanentes;

\- dados de outros escritórios.



Ao retornar a conexão:



\- sincronizar;

\- identificar conflito;

\- pedir revisão;

\- evitar duplicidade;

\- mostrar resultado.



==================================================

MÓDULO 11 — ADMINISTRAÇÃO DO SAAS

==================================================



Criar um painel separado de superadministração da plataforma.



Não misturar com o painel dos escritórios.



Criar entidades equivalentes a:



plans

plan\_features

subscriptions

usage\_metrics

feature\_flags

tenant\_limits

platform\_admins

support\_access\_sessions

platform\_audit\_logs

system\_announcements



PAINEL DE ESCRITÓRIOS



Exibir:



\- escritório;

\- slug;

\- proprietário;

\- plano;

\- status;

\- período de teste;

\- usuários ativos;

\- clientes;

\- processos;

\- armazenamento;

\- último acesso;

\- data de criação;

\- inadimplência futura;

\- alertas;

\- erros recentes.



Ações:



\- visualizar;

\- suspender;

\- reativar;

\- alterar plano;

\- ajustar limite;

\- iniciar suporte assistido;

\- exportar dados;

\- solicitar exclusão;

\- registrar observação;

\- ver auditoria.



Nunca permitir acesso silencioso aos dados do escritório.



PLANOS E RECURSOS



Criar planos configuráveis.



Exemplos iniciais:



\- teste;

\- individual;

\- profissional;

\- escritório;

\- empresarial.



Cada plano pode definir:



\- número de usuários;

\- armazenamento;

\- número de clientes;

\- número de processos;

\- número de formulários;

\- portal do cliente;

\- workflows;

\- campos personalizados;

\- relatórios;

\- controladoria;

\- CLM;

\- provisionamento;

\- API futura;

\- suporte;

\- exportações.



Não espalhar verificações de plano pelo código.



Criar serviço central como:



hasFeature()

getUsage()

checkLimit()

incrementUsage()

canCreateResource()



FEATURE FLAGS



Permitir ativar recursos por:



\- plataforma;

\- plano;

\- escritório;

\- usuário;

\- ambiente;

\- percentual de rollout.



Registrar alterações.



USO



Calcular:



\- usuários;

\- armazenamento;

\- clientes;

\- processos;

\- documentos;

\- formulários;

\- solicitações;

\- operações de PDF;

\- acessos ao portal.



Evitar contadores inconsistentes.



Criar rotina de reconciliação.



Não implementar cobrança real agora.



Manter arquitetura para PaymentProvider futuro.



==================================================

MÓDULO 12 — ONBOARDING DO ESCRITÓRIO

==================================================



Criar onboarding guiado.



Etapas:



1\. Dados do escritório

2\. Identidade visual

3\. Áreas de atuação

4\. Configuração de usuários

5\. Convite da equipe

6\. Configuração financeira

7\. Tipos de processo

8\. Tipos de prazo

9\. Importação de clientes

10\. Primeiro cliente

11\. Primeiro contrato

12\. Primeiro processo

13\. Primeiro prazo

14\. Portal do cliente

15\. Configurações de segurança



Recursos:



\- progresso;

\- salvar e continuar;

\- ignorar etapa;

\- dados de exemplo opcionais;

\- checklist;

\- ajuda contextual;

\- conclusão;

\- reiniciar;

\- ocultar depois de concluído.



Criar onboarding diferente para:



\- advogado individual;

\- pequeno escritório;

\- escritório com equipe;

\- departamento jurídico.



Não exigir dados desnecessários.



==================================================

MÓDULO 13 — SUPORTE, DIAGNÓSTICO E OPERAÇÃO

==================================================



Criar central de suporte interna.



Entidades:



support\_tickets

support\_messages

support\_attachments

support\_categories

support\_access\_requests

system\_incidents

system\_status\_updates

changelog\_entries



CHAMADOS



Campos:



\- escritório;

\- usuário;

\- categoria;

\- prioridade;

\- assunto;

\- descrição;

\- contexto técnico;

\- anexos;

\- responsável;

\- status;

\- created\_at;

\- resolved\_at.



Status:



\- aberto;

\- aguardando suporte;

\- aguardando cliente;

\- em análise;

\- resolvido;

\- fechado.



Capturar de forma segura:



\- rota;

\- navegador;

\- versão;

\- horário;

\- identificador de erro;

\- escritório;

\- usuário.



Não capturar:



\- senha;

\- token;

\- documentos;

\- conteúdo jurídico sensível;

\- dados bancários;

\- dados pessoais desnecessários.



ACESSO ASSISTIDO



Criar fluxo:



\- suporte solicita;

\- proprietário aprova;

\- define escopo;

\- define duração;

\- registra motivo;

\- acesso expira;

\- todas as ações são auditadas.



Mostrar banner durante acesso assistido.



Não implementar impersonação irrestrita.



STATUS E INCIDENTES



Criar:



\- página de status interna;

\- incidentes;

\- atualizações;

\- manutenção;

\- recursos afetados;

\- início;

\- resolução;

\- histórico.



CHANGELOG



Permitir publicar:



\- versão;

\- novidades;

\- correções;

\- mudanças;

\- data;

\- público;

\- link.



==================================================

MÓDULO 14 — SEGURANÇA EMPRESARIAL

==================================================



Implementar controles avançados sem prejudicar usuários menores.



MFA



Usar MFA compatível com a autenticação existente.



Permitir:



\- ativação;

\- recuperação;

\- códigos de backup;

\- obrigatoriedade por escritório;

\- obrigatoriedade por papel;

\- registro de ativação;

\- revogação segura.



SESSÕES



Criar:



\- lista de sessões;

\- dispositivo;

\- navegador;

\- IP;

\- localização aproximada apenas se já disponível sem serviço pago;

\- último acesso;

\- encerramento remoto;

\- encerramento de todas;

\- alerta de nova sessão.



POLÍTICAS



Permitir ao escritório configurar:



\- MFA obrigatório;

\- tempo de sessão;

\- expiração por inatividade;

\- quantidade máxima de sessões;

\- complexidade de senha;

\- bloqueio após tentativas;

\- acesso por IP;

\- acesso por horário;

\- download de documentos;

\- exportação de dados;

\- compartilhamento público.



RESTRIÇÃO POR IP



Permitir:



\- lista permitida;

\- lista bloqueada;

\- comentário;

\- validade;

\- exceções;

\- modo de alerta;

\- modo de bloqueio.



Evitar bloquear o proprietário sem mecanismo de recuperação.



PERMISSÕES GRANULARES



Adicionar, quando necessário:



\- permissão por módulo;

\- permissão por ação;

\- permissão financeira;

\- permissão de exportação;

\- permissão de documento;

\- permissão por campo sensível;

\- permissão por equipe;

\- permissão por processo.



DOCUMENTOS RESTRITOS



Criar níveis:



\- padrão;

\- confidencial;

\- altamente confidencial.



Para altamente confidencial:



\- acesso explícito;

\- justificativa;

\- auditoria;

\- download controlado;

\- link público proibido;

\- visualização registrada.



LOGS



Criar logs imutáveis para:



\- autenticação;

\- permissões;

\- financeiro;

\- documentos;

\- exportações;

\- suporte assistido;

\- configurações de segurança;

\- superadministração.



Não permitir edição pela interface.



==================================================

MÓDULO 15 — LGPD E GOVERNANÇA DE DADOS

==================================================



Criar ferramentas para conformidade.



CONSENTIMENTOS



Registrar:



\- titular;

\- finalidade;

\- texto;

\- versão;

\- data;

\- origem;

\- IP quando disponível;

\- revogação;

\- evidência.



SOLICITAÇÕES DO TITULAR



Tipos:



\- confirmação;

\- acesso;

\- correção;

\- anonimização;

\- portabilidade;

\- eliminação;

\- revogação;

\- informação sobre compartilhamento.



Fluxo:



\- recebida;

\- identificação;

\- em análise;

\- aprovada;

\- parcialmente aprovada;

\- recusada;

\- concluída.



Registrar justificativas.



RETENÇÃO



Permitir políticas por:



\- módulo;

\- tipo de documento;

\- cliente;

\- processo;

\- obrigação legal;

\- período.



Não eliminar automaticamente dados jurídicos sem revisão e autorização.



ANONIMIZAÇÃO



Criar rotina controlada.



Antes:



\- verificar obrigações;

\- verificar processos;

\- verificar financeiro;

\- gerar relatório;

\- solicitar aprovação.



EXPORTAÇÃO



Permitir gerar pacote do titular com:



\- dados cadastrais;

\- processos;

\- documentos permitidos;

\- mensagens;

\- consentimentos;

\- histórico relevante.



Não incluir dados de terceiros indevidamente.



CLASSIFICAÇÃO



Classificar dados como:



\- público;

\- interno;

\- confidencial;

\- altamente confidencial;

\- dado pessoal;

\- dado sensível;

\- financeiro;

\- jurídico.



==================================================

MÓDULO 16 — BACKUP, RECUPERAÇÃO E CONTINUIDADE

==================================================



Documentar e implementar controles de recuperação.



Criar:



docs/backup-and-recovery.md

docs/disaster-recovery.md

docs/security-operations.md

docs/data-retention.md



A documentação deve cobrir:



\- backup do banco;

\- backup do storage;

\- frequência;

\- retenção;

\- criptografia;

\- restauração;

\- responsabilidade;

\- teste;

\- incidentes;

\- recuperação.



Criar painel interno para registrar:



\- último backup conhecido;

\- último teste de restauração;

\- resultado;

\- responsável;

\- duração;

\- falhas;

\- próxima revisão.



Não criar botão inseguro de backup completo no navegador.



Criar recursos de exportação por escritório.



Definir:



\- RPO;

\- RTO;

\- procedimento;

\- responsáveis;

\- critérios de emergência.



==================================================

ARQUITETURA PARA INTEGRAÇÕES FUTURAS

==================================================



Criar interfaces desacopladas.



PROCESSOS



interface ProcessMonitoringProvider {

&#x20; searchProcess()

&#x20; fetchCaseHeader()

&#x20; fetchMovements()

&#x20; fetchPublications()

&#x20; synchronizeProcess()

}



MENSAGENS



interface MessagingProvider {

&#x20; sendMessage()

&#x20; getMessageStatus()

&#x20; receiveWebhook()

}



E-MAIL



interface EmailProvider {

&#x20; sendEmail()

&#x20; getDeliveryStatus()

&#x20; receiveEvent()

}



ASSINATURA



interface SignatureProvider {

&#x20; createEnvelope()

&#x20; addSigner()

&#x20; sendEnvelope()

&#x20; getEnvelopeStatus()

&#x20; cancelEnvelope()

}



PAGAMENTOS



interface PaymentProvider {

&#x20; createCharge()

&#x20; createPix()

&#x20; createBoleto()

&#x20; getPaymentStatus()

&#x20; cancelCharge()

&#x20; refundPayment()

}



IA



interface AIProvider {

&#x20; summarize()

&#x20; extractStructuredData()

&#x20; suggestDeadline()

&#x20; draftText()

&#x20; compareDocuments()

}



CALENDÁRIO



interface CalendarProvider {

&#x20; createEvent()

&#x20; updateEvent()

&#x20; deleteEvent()

&#x20; synchronize()

}



OCR



interface OCRProvider {

&#x20; extractText()

&#x20; extractFields()

}



Criar apenas:



\- tipos;

\- interfaces;

\- contratos;

\- adapters locais quando aplicável;

\- implementação nula;

\- documentação.



Nenhuma tela deve depender de provider externo para funcionar.



==================================================

ROTAS SUGERIDAS

==================================================



Adapte às convenções já existentes.



Controladoria:



/controladoria

/controladoria/publicacoes

/controladoria/publicacoes/\[id]

/controladoria/calendarios

/controladoria/revisoes



Contratos:



/contratos-empresariais

/contratos-empresariais/solicitacoes

/contratos-empresariais/\[id]

/contratos-empresariais/clausulas

/contratos-empresariais/modelos



Risco:



/riscos

/provisionamentos

/garantias

/valores-judiciais



Valores de clientes:



/financeiro/valores-de-clientes

/financeiro/prestacoes-de-contas



Solicitações:



/solicitacoes

/solicitacoes/\[id]

/solicitacoes/configuracoes



Formulários:



/configuracoes/formularios

/f/\[slug]



Agendamento:



/configuracoes/agendamento

/agendar/\[slug]



PDF:



/ferramentas/pdf



SaaS:



/admin

/admin/escritorios

/admin/planos

/admin/recursos

/admin/uso

/admin/incidentes

/admin/suporte



Segurança:



/configuracoes/seguranca

/configuracoes/sessoes

/configuracoes/lgpd

/configuracoes/retencao



==================================================

COMPONENTES REUTILIZÁVEIS

==================================================



Crie ou adapte:



\- PublicationInbox;

\- PublicationDetails;

\- PublicationTreatmentDialog;

\- DeadlineCalculator;

\- DeadlineReviewPanel;

\- JudicialCalendarEditor;

\- ContractVersionViewer;

\- ContractComparison;

\- ClauseLibrary;

\- ApprovalFlow;

\- ContractObligationList;

\- RiskBadge;

\- RiskAssessmentForm;

\- ProvisionHistory;

\- ClientFundsStatement;

\- TransferApprovalDialog;

\- LegalRequestBoard;

\- SLAIndicator;

\- PublicFormBuilder;

\- ConditionalFieldEditor;

\- AvailabilityCalendar;

\- CommunicationThread;

\- PdfWorkspace;

\- PdfPageSorter;

\- RedactionTool;

\- MobileBottomNavigation;

\- OfflineStatus;

\- InstallPwaPrompt;

\- PlanFeatureGuard;

\- UsageMeter;

\- TenantAdminTable;

\- OnboardingChecklist;

\- SupportTicketPanel;

\- AssistedAccessBanner;

\- SessionManager;

\- SecurityPolicyEditor;

\- ConsentHistory;

\- DataSubjectRequestPanel;

\- RetentionPolicyEditor;

\- AuditLogViewer.



Não crie versões duplicadas de componentes que já existam.



==================================================

TESTES OBRIGATÓRIOS

==================================================



Criar testes para:



CONTROLADORIA



\- criação manual;

\- importação;

\- duplicidade;

\- atribuição;

\- tratamento;

\- criação de prazo;

\- revisão;

\- isolamento entre tenants.



PRAZOS



\- dias úteis;

\- dias corridos;

\- feriados;

\- suspensões;

\- recesso;

\- data inicial;

\- data final;

\- revisão;

\- versionamento;

\- alteração justificada.



CLM



\- criação de solicitação;

\- versão;

\- aprovação;

\- obrigação;

\- aditivo;

\- renovação.



RISCO



\- avaliação;

\- provisionamento;

\- histórico;

\- garantia;

\- permissões.



VALORES DE CLIENTES



\- entrada;

\- retenção;

\- repasse;

\- saldo;

\- estorno;

\- impossibilidade de saldo negativo;

\- aprovação.



SLA



\- início;

\- pausa;

\- retomada;

\- vencimento;

\- conclusão.



FORMULÁRIOS



\- validação;

\- condicionais;

\- criação de lead;

\- consentimento;

\- proteção por tenant.



PDF



\- união;

\- separação;

\- reordenação;

\- rotação;

\- descarte de temporários;

\- preservação do original.



PWA



\- manifest;

\- atualização;

\- cache;

\- offline;

\- sincronização;

\- duplicidade.



SAAS



\- limite de plano;

\- feature flag;

\- suspensão;

\- reativação;

\- isolamento;

\- uso.



SEGURANÇA



\- MFA;

\- sessão;

\- encerramento remoto;

\- restrição por IP;

\- permissão granular;

\- acesso assistido;

\- expiração.



LGPD



\- consentimento;

\- solicitação;

\- exportação;

\- anonimização;

\- retenção.



==================================================

ORDEM DE IMPLEMENTAÇÃO

==================================================



BLOCO 1 — ANÁLISE E PREPARAÇÃO



\- analisar estado atual;

\- mapear funcionalidades;

\- identificar conflitos;

\- criar plano de migrations;

\- criar plano de rotas;

\- criar plano de segurança;

\- criar plano de custos;

\- criar interfaces futuras;

\- não alterar funcionalidades ainda.



BLOCO 2 — ADMINISTRAÇÃO DO SAAS



\- painel de plataforma;

\- planos;

\- recursos;

\- limites;

\- métricas de uso;

\- feature flags;

\- suspensão;

\- reativação.



BLOCO 3 — ONBOARDING, SUPORTE E SEGURANÇA



\- onboarding;

\- chamados;

\- acesso assistido;

\- sessões;

\- MFA;

\- políticas;

\- auditoria empresarial.



BLOCO 4 — CONTROLADORIA



\- publicações;

\- triagem;

\- distribuição;

\- revisão;

\- painel;

\- importação manual.



BLOCO 5 — CÁLCULO DE PRAZOS



\- calendários;

\- motor;

\- revisão;

\- versionamento;

\- testes.



BLOCO 6 — RISCO E VALORES PROCESSUAIS



\- pedidos;

\- risco;

\- provisão;

\- garantias;

\- depósitos;

\- relatórios.



BLOCO 7 — VALORES DE CLIENTES



\- contas;

\- transações;

\- repasses;

\- extratos;

\- prestação de contas.



BLOCO 8 — SOLICITAÇÕES E SLA



\- intake;

\- workflows;

\- SLA;

\- aprovações;

\- portal.



BLOCO 9 — CLM



\- solicitações;

\- contratos;

\- versões;

\- cláusulas;

\- aprovações;

\- obrigações;

\- aditivos.



BLOCO 10 — FORMULÁRIOS E AGENDAMENTO



\- construtor;

\- páginas públicas;

\- condicionais;

\- agendamento;

\- consentimento.



BLOCO 11 — COMUNICAÇÃO E PDF



\- central de comunicação;

\- threads;

\- confirmação de leitura;

\- ferramentas PDF.



BLOCO 12 — PWA



\- instalação;

\- cache;

\- offline limitado;

\- sincronização;

\- experiência móvel.



BLOCO 13 — LGPD E CONTINUIDADE



\- consentimentos;

\- solicitações;

\- retenção;

\- exportação;

\- backup;

\- recuperação;

\- documentação.



==================================================

FORMA DE TRABALHO

==================================================



Não implemente todos os blocos de uma vez.



Primeiro apresente:



1\. resumo da arquitetura atual;

2\. funcionalidades já existentes;

3\. funcionalidades parcialmente existentes;

4\. funcionalidades ausentes;

5\. tabelas e migrations necessárias;

6\. alterações em RLS;

7\. permissões necessárias;

8\. novas rotas;

9\. componentes reutilizáveis;

10\. dependências propostas;

11\. riscos de segurança;

12\. riscos de custo;

13\. riscos de compatibilidade;

14\. ordem recomendada;

15\. arquivos previstos para alteração.



Depois execute somente o BLOCO 1.



Não comece o BLOCO 2 sem autorização.



Ao finalizar cada bloco:



\- liste arquivos criados;

\- liste arquivos alterados;

\- liste migrations;

\- liste políticas RLS;

\- liste funcionalidades concluídas;

\- liste testes criados;

\- execute typecheck;

\- execute lint;

\- execute testes;

\- execute build;

\- corrija erros;

\- informe riscos;

\- informe pendências;

\- informe débitos técnicos;

\- recomende o próximo bloco.



Não declare uma funcionalidade concluída sem:



\- persistência real;

\- validação;

\- permissões;

\- RLS;

\- tratamento de erro;

\- estado vazio;

\- carregamento;

\- responsividade;

\- acessibilidade;

\- testes;

\- build aprovado.



Comece agora analisando o estado atual do projeto. Não escreva código antes de concluir o relatório do BLOCO 1.

