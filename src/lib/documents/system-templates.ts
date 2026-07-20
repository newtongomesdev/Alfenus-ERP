export type SystemDocumentTemplate = {
  id: string;
  name: string;
  description: string;
  category: string;
  content: string;
};

export const systemDocumentTemplates: SystemDocumentTemplate[] = [
  {
    id: "system-procuracao",
    name: "Procuração Ad Judicia e Extra",
    description:
      "Instrumento completo de mandato para representação judicial e extrajudicial, com poderes gerais, especiais e referência ao caso vinculado.",
    category: "procuracao",
    content: `PROCURAÇÃO AD JUDICIA ET EXTRA

Ao(s) Juízo(s) e demais Autoridades

OUTORGANTE: {{client.name}}, {{client.nationality | default:brasileiro(a)}}, {{client.marital_status | default:estado civil}}, {{client.profession | default:profissão}}, inscrito(a) no CPF/CNPJ sob o n.º {{client.document | default:não informado}}, portador(a) do RG n.º {{client.rg | default:não informado}}, residente e domiciliado(a) em {{client.address | default:não informado}}, e-mail: {{client.email | default:não informado}}, conforme qualificação constante do cadastro.

OUTORGADO(A): {{firm.name}}, inscrito(a) no CPF/CNPJ sob o n.º {{firm.document | default:não informado}}, com sede/escritório em {{firm.address | default:não informado}}, inscrito(a) na OAB sob o n.º {{firm.oab | default:não informado}}, e-mail: {{firm.email | default:não informado}}, aqui representado(a) por seus advogados integrantes.

PODERES DE REPRESENTAÇÃO

Pelo presente instrumento particular de procuração, o(a) OUTORGANTE nomeia, constitui e confere poderes ao(à) OUTORGADO(A) para que este(a), na qualidade de Advogado(a) e bastante procurador(a), possa representá-lo(a) judicial e extrajudicialmente perante todos os juízos, tribunais, órgãos administrativos, autarquias e demais autoridades competentes, em todo o território nacional, para o fim específico de:

a) propor ações judiciais de qualquer natureza — conhecimento, execução, mandado de segurança, ação popular, ação civil pública e demais espécies — bem como ações cautelares, procedimentos especiais e Juízo arbitral;

b) contestar, reconhecer a procedência ou improcedência do pedido, desistir da ação, renunciar ao direito que pleiteia, transigir, firmar acordos e propostas de conciliação;

c) acompanhar todos os atos processuais, receber citações, intimações, mandados e correspondências, assinar termos, dar quitação e dar baixa em certidões;

d) produzir provas de todas as espécies admitidas em direito — documental, testemunhal, pericial, técnica e inspeção judicial —, requerer a abertura de inquérito policial e participar de diligências investigatórias;

e) interpor recursos administrativos e judiciais — apelação, recurso especial, recurso extraordinário, agravo de instrumento, embargos de declaração, recurso ordinário, mandado de segurança e quaisquer outros — bem como desistir de recursos interpostos;

f) substabelecer o presente mandato, com ou sem reserva de poderes, em outro(s) profissional(is) habilitado(s), nos termos do art. 105 do Código de Processo Civil;

g) praticar todos os demais atos necessários ao fiel e cuidadoso desempenho deste mandato, inclusive firmar requerimentos, petições, contratos e documentos em nome do(a) OUTORGANTE.

PODERES ESPECIAIS

Ficam igualmente conferidos poderes especiais ao(à) OUTORGADO(A), nos termos expressos do art. 105 do Código de Processo Civil, para: receber citação, confessar, reconhecer a procedência do pedido, transigir, firmar acordos, compromissos, conciliação e mediação; desistir, renunciar ao direito sobre o qual se funda a ação; receber valores, dar e receber quitação; assinar declaração de hipossuficiência econômica; prestar e receber contas; hipotecar imóveis do(a) OUTORGANTE quando indispensável ao cumprimento do mandato; e praticar quaisquer outros atos de administração judicial ou extrajudicial que se façam imprescindíveis.

LIMITES E VIGÊNCIA

A presente procuração outorga poderes gerais para a gestão de negócios judiciais e extrajudiciais e vigorará por prazo indeterminado, podendo ser revogada a qualquer tempo por comunicação escrita dirigida ao(à) OUTORGADO(A).

REFERÊNCIA AO CASO VINCULADO

Processo/Assunto: {{case.title | default:não informado}}
N.º do Processo: {{case.number | default:não informado}}
Vara/Tribunal: {{case.court | default:não informado}}

{{firm.city | default:Cidade}}, {{today}}.


____________________________________________
{{client.name}}
OUTORGANTE
CPF/CNPJ: {{client.document | default:não informado}}

____________________________________________
{{firm.name}}
OUTORGADO(A)
OAB: {{firm.oab | default:não informado}}`,
  },
  {
    id: "system-honorarios",
    name: "Contrato de Honorários Advocatícios",
    description:
      "Contrato completo e detalhado para prestação de serviços advocatícios, incluindo objeto, honorários, despesas, obrigações, deveres, responsabilidade, confidencialidade e encerramento.",
    category: "contrato",
    content: `CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS

N.º {{contract.number | default:a ser preenchido}}

Pelo presente instrumento particular, que entre si celebram:

CONTRATANTE: {{client.name}}, {{client.nationality | default:brasileiro(a)}}, {{client.marital_status | default:estado civil}}, {{client.profession | default:profissão}}, inscrito(a) no CPF/CNPJ sob o n.º {{client.document | default:não informado}}, portador(a) do RG n.º {{client.rg | default:não informado}}, residente e domiciliado(a) em {{client.address | default:não informado}}, e-mail: {{client.email | default:não informado}}, doravante denominado(a) CONTRATANTE;

CONTRATADO(A): {{firm.name}}, inscrito(a) no CPF/CNPJ sob o n.º {{firm.document | default:não informado}}, com sede/escritório em {{firm.address | default:não informado}}, inscrito(a) na OAB sob o n.º {{firm.oab | default:não informado}}, e-mail: {{firm.email | default:não informado}}, doravante denominado(a) CONTRATADO(A);

Têm entre si justo e contratado o seguinte:

CLÁUSULA 1.ª — DO OBJETO

1.1. O presente contrato tem por objeto a prestação de serviços advocatícios pelo CONTRATADO(A) ao(à) CONTRATANTE, referentes a {{contract.description | default:assunto jurídico a ser detalhado}}, compreendendo, de forma enunciativa e não taxativa: análise jurídica preliminar; elaboração de pareceres; orientação jurídica; elaboração e interposição de peças processuais; acompanhamento de atos processuais e administrativos; e todas as demais diligências necessárias à efetiva defesa dos interesses do(a) CONTRATANTE.

1.2. Os serviços serão executados com observância dos deveres previstos no art. 6.º da Lei n.º 8.906/1994 (Estatuto da OAB) e nas normas regulamentares aplicáveis, dentro dos limites do mandato outorgado.

CLÁUSULA 2.ª — DOS HONORÁRIOS

2.1. Pela prestação dos serviços descritos na Cláusula 1.ª, o(a) CONTRATANTE pagará ao(à) CONTRATADO(A), a título de honorários advocatícios, o valor total de R$ {{contract.value | default:0,00}} ({{contract.value_letter | default:zero reais}}).

2.2. O pagamento será efetuado da seguinte forma: {{contract.payment_terms | default:conforme registrado no sistema Alfenus}}.

2.3. Em caso de inadimplência no prazo estipulado, incidirá automaticamente, e sem necessidade de interpelação judicial ou extrajudicial:

a) multa moratória de {{contract.late_fee | default:2%}} sobre o valor devido;
b) juros de mora de 1% ao mês, calculados pro rata die desde o vencimento até a data efetiva do pagamento;
c) atualização monetária pelo IGP-M/FGV ou índice equivalente, conforme apuração na data da efetiva quitação.

2.4. O valor dos honorários poderá ser revisado mediante acordo escrito entre as partes, sempre que houver alteração significativa no escopo dos serviços originalmente contratado.

CLÁUSULA 3.ª — DAS DESPESAS

3.1. Serão de responsabilidade do(a) CONTRATANTE todas as despesas diretas e indiretas decorrentes da execução do mandato, incluindo, a título exemplificativo: custas judiciais e processuais; emolumentos cartorários; despesas postais e de courier; honorários periciais; diárias de deslocamento e estada; traslados; cópias certificadas; e quaisquer outras despesas de terceiros.

3.2. O(A) CONTRATADO(A) providenciará o adiantamento das despesas quando necessário, sendo reembolsado(a) mediante apresentação de comprovantes, no prazo de {{contract.expense_reimbursement_days | default:15}} dias após a comprovação.

3.3. As despesas de honorários contratuais de outros profissionais eventualmente contratados pelo(a) CONTRATANTE correrão por conta exclusiva deste(a), salvo se previamente autorizadas por escrito pelo(a) CONTRATADO(A).

CLÁUSULA 4.ª — DAS OBRIGAÇÕES DO(A) CONTRATANTE

4.1. Cumpre ao(à) CONTRATANTE, sob pena de responsabilização, as seguintes obrigações:

a) fornecer ao(à) CONTRATADO(A), de forma tempestiva e completa, todas as informações e documentos necessários à execução dos serviços, declarando sua autenticidade e veracidade sob as penas da lei;

b) manter atualizados seus dados cadastrais, endereço, telefone e endereço eletrônico para comunicações;

c) comunicar imediatamente qualquer alteração nos fatos ou circunstâncias que possam influir na execução do mandato;

d) não contratar outros profissionais para a mesma matéria objeto deste contrato, sem prévia comunicação ao(à) CONTRATADO(A);

e) efetuar os pagamentos nos prazos e condições estipulados, sem deduções ou retenções indevidas.

CLÁUSULA 5.ª — DAS OBRIGAÇÕES DO(A) CONTRATADO(A)

5.1. O(A) CONTRATADO(A) se obriga a:

a) exercer o mandato com zelo, diligência e competência técnica, em conformidade com a legislação vigente, o Estatuto da OAB e as normas deontológicas profissionais;

b) manter sigilo absoluto sobre todas as informações que lhe sejam confidenciadas em razão do mandato, nos termos do art. 7.º, incisos II e VI, da Lei n.º 8.906/1994;

c) informar ao(à) CONTRATANTE, de forma clara e objetiva, o andamento do(s) caso(s) e as perspectivas de êxito, evitando criar expectativas infundadas;

d) apresentar relatórios periódicos sobre a evolução do(s) procedimento(s) a que se refere a Cláusula 1.ª;

e) restituir, ao final do mandato, todos os documentos e valores que lhe foram confiados pelo(a) CONTRATANTE.

CLÁUSULA 6.ª — DA GARANTIA DE RESULTADO

6.1. O(A) CONTRATADO(A) não garante resultado específico algum, uma vez que a solução dos casos depende de fatores alheios à sua vontade, tais como: convicção do julgador, provas produzidas, fundamentação legal aplicável e circunstâncias fáticas do caso concreto.

6.2. O(A) CONTRATADO(A) garante, tão somente, a adequada e diligente prestação dos serviços profissionais dentro dos limites do mandato conferido.

CLÁUSULA 7.ª — DA CONFIDENCIALIDADE E PROTEÇÃO DE DADOS

7.1. As partes comprometem-se a manter absoluto sigilo sobre todas as informações confidenciais obtidas em razão do presente contrato, não podendo divulgá-las a terceiros, salvo por determinação judicial ou legal, ou mediante autorização expressa da parte titular das informações.

7.2. Os dados pessoais coletados no âmbito deste contrato serão tratados em conformidade com a Lei Geral de Proteção de Dados Pessoais (Lei n.º 13.709/2018), sendo utilizados exclusivamente para a execução do mandato e o cumprimento de obrigações legais.

CLÁUSULA 8.ª — DA VIGÊNCIA E RESCISÃO

8.1. O presente contrato terá vigor a partir da data de sua assinatura e será válido pelo prazo de {{contract.duration | default:indefinido}}, salvo nas hipóteses de rescisão previstas nesta cláusula.

8.2. O contrato poderá ser rescindido, por qualquer das partes, mediante comunicação por escrito, com antecedência mínima de {{contract.termination_notice | default:30}} dias, sem prejuízo do disposto na Cláusula 9.ª.

8.3. Constituem causas de rescisão imediata, independentemente de notificação:

a) inadimplência de quaisquer obrigações previstas neste contrato, após notificação e decurso de prazo de {{contract.cure_period | default:10}} dias para regularização;

b) descumprimento das normas deontológicas profissionais pelo(A) CONTRATADO(A);

c) perda das condições de habilitação profissional do(A) CONTRATADO(A);

d) prática de atos que comprometam a confiança mútua entre as partes.

CLÁUSULA 9.ª — DOS EFEITOS DA RESCISÃO

9.1. Em caso de rescisão, por qualquer motivo, permanecerão exigíveis:

a) os honorários proporcionais aos serviços efetivamente prestados até a data do encerramento, calculados proporcionalmente ao valor total do contrato;

b) as despesas já incorridas e não reembolsadas, comprovadas mediante apresentação de recibos ou notas fiscais;

c) as obrigações de sigilo e confidencialidade previstas na Cláusula 7.ª, que sobreviverão ao término do contrato por prazo indeterminado.

9.2. O(A) CONTRATADO(A) se compromete a devolver, no prazo de {{contract.document_return_days | default:15}} dias, todos os documentos, peças processuais e valores pertencentes ao(à) CONTRATANTE.

CLÁUSULA 10.ª — DAS DISPOSIÇÕES GERAIS

10.1. Qualquer tolerância de uma das partes quanto ao descumprimento de cláusulas deste contrato não implicará renúncia, novação ou alteração de seu conteúdo.

10.2. As comunicações entre as partes relativas a este contrato deverão ser dirigidas por escrito ao endereço constante do preâmbulo ou por meio eletrônico, sendo consideradas recebidas na data do envio, quando por e-mail.

10.3. As partes elegem o Foro da Comarca de {{firm.city | default:Cidade}} — {{firm.state | default:Estado}} — para dirimir quaisquer questões oriundas do presente contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja.

E, por estarem justos e contratados, as partes firmam o presente instrumento em duas vias de igual teor e forma.

{{firm.city | default:Cidade}}, {{today}}.


____________________________________________
{{client.name}}
CONTRATANTE
CPF/CNPJ: {{client.document | default:não informado}}

____________________________________________
{{firm.name}}
CONTRATADO(A)
OAB: {{firm.oab | default:não informado}}`,
  },
  {
    id: "system-notificacao",
    name: "Notificação Extrajudicial",
    description:
      "Comunicação formal com exposição circunstanciada dos fatos, prazo certo, providência solicitada, constituição em mora e consequências legais.",
    category: "notificacao",
    content: `NOTIFICAÇÃO EXTRAJUDICIAL

Cartório/Ofício: {{notification.registry | default:não informado}}

NOTIFICANTE: {{client.name}}, inscrito(a) no CPF/CNPJ sob o n.º {{client.document | default:não informado}}, com endereço em {{client.address | default:não informado}}, neste ato representado(a) pelo(à) Advogado(a) {{firm.name}}, inscrito(a) na OAB sob o n.º {{firm.oab | default:não informado}}.

NOTIFICADO(A): {{case.opposing_party | default:NOME DA PESSOA NOTIFICADA}}, inscrito(a) no CPF/CNPJ sob o n.º {{case.opposing_party_document | default:não informado}}, com endereço em {{case.opposing_party_address | default:não informado}}.

ASSUNTO: {{case.title | default:assunto a ser especificado}}
REFERÊNCIA: {{case.number | default:sem número de processo}}

Senhor(a),

O(A) NOTIFICANTE, por intermédio de seu(sua) Advogado(a), vem, por meio da presente, NOTIFICAR formalmente o(a) NOTIFICADO(A) do que se segue:

DOS FATOS

{{notification.fact | default:descreva de forma circunstanciada e objetiva os fatos que motivam a presente notificação, indicando datas, locais e demais circunstâncias relevantes}}

DO DIREITO

O fato acima narrado encontra amparo no(s) seguinte(s) dispositivo(s) legal(is): {{notification.legal_basis | default:indique os dispositivos legais aplicáveis, quando couber}}.

DA PROVIDÊNCIA SOLICITADA

Diante do exposto, NOTIFICA-SE o(a) NOTIFICADO(A) para que, no prazo improrrogável de {{notification.deadline | default:5 (cinco) dias corridos}}, contados do recebimento da presente, adote a seguinte providência:

{{notification.request | default:informe de forma clara e precisa a providência esperada do notificado, incluindo, quando possível, o valor, prazo ou conduta esperada}}

DA CONSTITUIÇÃO EM MORA E DAS CONSEQUÊNCIAS DO NÃO ATENDIMENTO

Serve a presente notificação para CONSTITUIR EM MORA o(a) NOTIFICADO(A), nos termos do art. 397 do Código Civil brasileiro. O não atendimento no prazo estipulado ensejará:

a) a propositura das ações judiciais cabíveis — cíveis, penais ou administrativas, conforme o caso — sem aviso adicional, com a consequente condenação ao pagamento de custas, honorários advocatícios e periciais;

b) a apuração de perdas e danos em todos os seus reflexos — materiais e morais —, incluindo lucros cessantes e danos emergentes, na forma dos arts. 186 e 927 do Código Civil;

c) a incidência de encargos legais, correção monetária e juros de mora, desde a data do inadimplemento;

d) a inscrição em cadastros de proteção ao crédito, quando aplicável, e a adoção de medidas cautelares e urgentes perante o Poder Judiciário.

DA CONFIRMAÇÃO DE RECEBIMENTO

Requeira-se a devolução da presente notificação devidamente recebida e assinada pelo(a) notificado(a), ou por seu representante legal, com indicação da data e hora do recebimento. A ausência de resposta no prazo assinalado será interpretada como recusa tácita ao cumprimento da providência solicitada.

{{firm.city | default:Cidade}}, {{today}}.


____________________________________________
{{firm.name}}
Advogado(a)
OAB: {{firm.oab | default:não informado}}
Em nome de {{client.name}}`,
  },
  {
    id: "system-recebimento",
    name: "Recibo de Honorários e Quitação",
    description:
      "Recibo formal e completo para comprovação de pagamento de honorários advocatícios ou reembolsos, com especificação de parcelas e dados de quitação.",
    category: "financeiro",
    content: `RECIBO DE PAGAMENTO E QUITAÇÃO

N.º {{receipt.number | default:a ser preenchido}}

Recebi de {{client.name}}, inscrito(a) no CPF/CNPJ sob o n.º {{client.document | default:não informado}}, a quantia de R$ {{contract.value | default:0,00}} ({{contract.value_letter | default:zero reais}}), por meio de {{payment.method | default:PIX / Transferência Bancária / Dinheiro}} — {{payment.details | default:sem detalhes adicionais}} —, com data de pagamento/compensação em {{payment.date | default:data a informar}}, relativo à {{receipt.installment | default:parcela única / honorários prestados}}.

DESCRIMINAÇÃO DOS VALORES:

— Honorários advocatícios: R$ {{payment.fee_value | default:0,00}}
— Reembolso de despesas/custas: R$ {{payment.expense_value | default:0,00}}
— Retenções tributárias (se houver): R$ {{payment.taxes_retained | default:0,00}}

Referência ao processo/assunto: {{case.title | default:prestação de serviços advocatícios}}
N.º do processo: {{case.number | default:não informado}}

DA QUITAÇÃO

Dou, por este instrumento, {{receipt.type | default:plena, geral e irrevogável quitação da referida parcela}}, declarando recebido o valor sobredito referente aos serviços acima discriminados.

OBSERVAÇÕES

{{receipt.notes | default:nenhuma observação adicional}}

{{firm.city | default:Cidade}}, {{today}}.


____________________________________________
{{firm.name}}
Recebedor(a)
CPF/CNPJ: {{firm.document | default:não informado}}
OAB: {{firm.oab | default:não informado}}`,
  },
  {
    id: "system-relatorio",
    name: "Relatório de Andamento ao Cliente",
    description:
      "Atualização profissional e objetiva de caso jurídico, com situação atual, providências realizadas, próximos passos, orientações ao cliente e ressalvas legais.",
    category: "relatorio",
    content: `RELATÓRIO DE ANDAMENTO PROCESSUAL

Cliente: {{client.name}}
CPF/CNPJ: {{client.document | default:não informado}}

Assunto: {{case.title | default:não informado}}
N.º do Processo: {{case.number | default:não informado}}
Tribunal/Órgão: {{case.court | default:não informado}}
Vara: {{case.vara | default:não informado}}
Parte Contrária: {{case.opposing_party | default:não informado}}

Data de emissão: {{today}}
Responsável pelo caso: {{firm.name}} / OAB {{firm.oab | default:não informado}}

═══════════════════════════════════════════════

1. SITUAÇÃO ATUAL DO CASO

{{report.current_status | default:Descreva de forma clara, objetiva e acessível ao cliente a situação atual do processo, incluindo a fase processual, os pedidos em curso e qualquer decisão recente proferida.}}

2. PROVIDÊNCIAS REALIZADAS DESDE A ÚLTIMA ATUALIZAÇÃO

{{report.actions_taken | default:Liste e descreva todas as medidas adotadas desde a última comunicação ao cliente, incluindo: petições protocoladas, audiências realizadas, diligências cumpridas, recursos interpostos e demais atos processuais relevantes.}}

3. PRÓXIMOS PASSOS E CRONOGRAMA

{{report.next_steps | default:Indique as providências futuras planejadas, prazos processuais relevantes, audiências agendadas e o responsável por cada etapa.}}

4. ORIENTAÇÕES AO CLIENTE

{{report.client_guidance | default:Forneça orientações claras e objetivas ao cliente quanto a documentos que deve reunir, atitudes que deve adotar ou evitar, e informações complementares que deve fornecer ao escritório.}}

5. PONTOS DE ATENÇÃO E RISCOS

{{report.risks | default:Aponte eventuais riscos, incertezas ou pontos de atenção relativos ao caso, incluindo a possibilidade de resultados adversos e suas possíveis consequências.}}

═══════════════════════════════════════════════

RESSALVAS

Este relatório tem caráter meramente informativo e tem por base as informações disponíveis e a legislação vigente na data de sua emissão. Não constitui garantia de resultado, uma vez que a decisão final depende exclusivamente da análise e convicção do julgador competente. As informações aqui prestadas poderão ser alteradas em razão de fatos novos, decisões judiciais ou modificações legislativas supervenientes.

Dúvidas e esclarecimentos: {{firm.email | default:não informado}} / {{firm.phone | default:não informado}}

{{firm.city | default:Cidade}}, {{today}}.


____________________________________________
{{firm.name}}
Advogado(a) Responsável
OAB: {{firm.oab | default:não informado}}`,
  },
  {
    id: "system-declaracao",
    name: "Declaração de Hipossuficiência",
    description:
      "Declaração formal para instruir pedido de gratuidade de justiça nos termos do art. 98 do CPC e Lei 1.060/50, com consequências da falsidade.",
    category: "declaracao",
    content: `DECLARAÇÃO DE HIPOSSUFICIÊNCIA ECONÔMICA

Eu, {{client.name}}, {{client.nationality | default:brasileiro(a)}}, {{client.marital_status | default:estado civil}}, {{client.profession | default:profissão}}, inscrito(a) no CPF/CNPJ sob o n.º {{client.document | default:não informado}}, portador(a) do RG n.º {{client.rg | default:não informado}}, residente e domiciliado(a) em {{client.address | default:não informado}}, declaro, sob as penas da lei (art. 299 do Código Penal e art. 99, § 3.º, do Código de Processo Civil), que:

a) não possuo recursos financeiros suficientes para arcar com as custas judiciais, despesas processuais, honorários periciais e advocatícios sem prejuízo do meu sustento próprio e de minha família;

b) minha renda mensal líquida é de R$ {{client.monthly_income | default:não informado}}, sendo esta destinada ao sustento do meu núcleo familiar;

c) a presente declaração é prestada para instruir requerimento de Gratuidade da Justiça, nos termos do art. 98 e seguintes do Código de Processo Civil e da Lei n.º 1.060/1950.

CIÊNCIA DAS CONSEQUÊNCIAS

Declaro ter plena ciência de que a prestação de informações falsas sujeita o infror às sanções penais previstas no art. 299 do Código Penal (falsidade ideológica), além da revogação do benefício com condenação no pagamento de até o quíntuplo das custas devidas (art. 100, parágrafo único, do CPC).

{{firm.city | default:Cidade}}, {{today}}.


____________________________________________
{{client.name}}
DECLARANTE
CPF/CNPJ: {{client.document | default:não informado}}`,
  },
  {
    id: "system-peticao",
    name: "Petição de Juntada de Documentos",
    description:
      "Peça processual completa e estruturada para juntada de documentos, com endereçamento correto, qualificação das partes e pedido fundamentado.",
    category: "peticao",
    content: `EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA {{case.court | default:VARA COMPETENTE}}

Processo n.º {{case.number | default:NÚMERO DO PROCESSO}}
Classe: {{case.class | default:não informado}}

{{client.name}}, já qualificado(a) nos autos da ação em epígrafe, por intermédio de seu(sua) advogado(a) infra-assinado(a), inscrito(a) na OAB sob o n.º {{firm.oab | default:não informado}}, vem, respeitosamente, à presença de Vossa Excelência, requerer a

JUNTADA DE DOCUMENTOS

pelos fatos e fundamentos a seguir expostos.

I — DA NECESSIDADE E RELEVÂNCIA DA JUNTADA

1.1. No exercício do seu direito constitucional à ampla defesa e ao contraditório (art. 5.º, LV, da CF/88), a parte Peticionante junta aos autos os documentos anexos, indispensáveis para a elucidação da verdade real e instrução da causa.

1.2. Os documentos apresentados referem-se a {{petition.purpose | default:esclarecimento de fato Relevante para o processo}}, demonstrando a veracidade das alegações deduzidas.

II — DA RELAÇÃO DOS DOCUMENTOS

Segue relação dos documentos anexados:

{{petition.document_list | default:
1. Documento I — (descreva o documento)
2. Documento II — (descreva o documento)}}

III — DOS PEDIDOS

Diante do exposto, REQUER:

a) o recebimento e a juntada dos documentos anexos aos autos do processo;
b) a intimação da parte contrária para, querendo, manifestar-se no prazo legal (art. 437, § 1.º, do CPC).

Termos em que,
Pede deferimento.

{{firm.city | default:Cidade}}, {{today}}.


____________________________________________
{{firm.name}}
OAB: {{firm.oab | default:não informado}}`,
  },
  {
    id: "system-proposta-honorarios",
    name: "Proposta de Honorários Advocatícios",
    description:
      "Apresentação comercial profissional e completa para prestação de serviços jurídicos, com escopo detalhado, valores, condições e validade.",
    category: "financeiro",
    content: `PROPOSTA DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS

Ref.: {{proposal.reference | default:a ser preenchido}}

DESTINATÁRIO(A): {{client.name}}
CPF/CNPJ: {{client.document | default:não informado}}
Endereço: {{client.address | default:não informado}}

ASSUNTO: {{case.title | default:serviço jurídico a ser contratado}}

Prezado(a) Senhor(a),

Cumprimentando-o(a) cordialmente, encaminhamos a presente proposta para prestação de serviços advocatícios, em conformidade com os termos e condições a seguir descritos.

═══════════════════════════════════════════════

1. ESCOPO DOS SERVIÇOS

1.1. Os serviços objeto desta proposta compreendem:

{{proposal.scope | default:Descreva de forma detalhada e completa o(s) serviço(s) a ser(em) prestado(s), incluindo: (i) análise e diagnóstico jurídico; (ii) elaboração de parecer e orientação; (iii) atuação processual ou extrajudicial; (iv) acompanhamento integral do caso; (v) relatórios periódicos de andamento.}}

1.2. Os limites da atuação estão adstritos ao(s) seguinte(s) âmbito(s): {{proposal.scope_limit | default:descreva eventuais limitações ao escopo, como instâncias recursais, valores ou procedimentos excluídos}}.

2. HONORÁRIOS ADVOCATÍCIOS

2.1. Pela execução dos serviços descritos no item 1, os honorários propostos são de:

Valor total: R$ {{contract.value | default:0,00}}
Por extenso: {{contract.value_letter | default:zero reais}}

2.2. Estrutura de pagamento: {{proposal.payment_terms | default:a ser acordada entre as partes — ex.: 50% na assinatura do contrato e 50% na conclusão dos serviços}}.

2.3. Os honorários poderão ser revisados caso haja alteração substancial no escopo dos serviços, mediante acordo escrito prévio entre as partes.

3. DESPESAS E REEMBOLSOS

3.1. Os valores acima referem-se exclusivamente a honorários profissionais. Não estão incluídos, salvo indicação expressa em contrário:

a) custas judiciais e processuais;
b) emolumentos cartorários e registros;
c) honorários periciais e de consultores técnicos;
d) despesas de deslocamento e hospedagem (quando necessárias);
e) despesas com cópias, publicações e comunicações;
f) quaisquer outras despesas de terceiros.

3.2. As despesas serão de responsabilidade do(a) contratante e faturadas separadamente, mediante apresentação de comprovantes.

4. PRAZO DE EXECUÇÃO

4.1. Estima-se a execução dos serviços no prazo de {{proposal.estimated_duration | default:a ser definido com base na complexidade do caso}}, contados a partir da formalização do contrato e disponibilização dos documentos necessários.

4.2. O prazo indicado é estimativo e poderá ser ajustado em função da complexidade, do andamento processual e de fatores alheios à vontade do(A) profissional.

5. VALIDADE DA PROPOSTA

5.1. Esta proposta permanece válida por {{proposal.validity | default:10 (dez) dias corridos}}, contados da data de emissão, sem prejuízo de sua prorrogação mediante acordo entre as partes.

5.2. Após o prazo de validade, os valores e condições aqui descritos poderão ser revisados.

6. FORMALIZAÇÃO DA CONTRATAÇÃO

6.1. A aceitação desta proposta dar-se-á por meio da assinatura do Contrato de Prestação de Serviços Advocatícios correspondente, que detalhará os termos e condições da relação profissional.

6.2. A contratação será formalizada mediante assinatura de instrumento próprio, que prevalecerá sobre os termos desta proposta em caso de divergência.

7. CONDIÇÕES GERAIS

7.1. Todos os dados e informações obtidos no curso da relação profissional serão tratados com absoluto sigilo, nos termos do art. 7.º da Lei n.º 8.906/1994 e da Lei n.º 13.709/2018 (LGPD).

7.2. A presente proposta não constitui contrato, mas sim manifestação de interesse em prestar os serviços descritos, sujeita à aceitação formal do(A) destinatário(a).

Aguardamos seu retorno, permanecendo à inteira disposição para quaisquer esclarecimentos.

Atenciosamente,

{{firm.city | default:Cidade}}, {{today}}.

____________________________________________
{{firm.name}}
Advogado(a)
OAB: {{firm.oab | default:não informado}}
E-mail: {{firm.email | default:não informado}}
Telefone: {{firm.phone | default:não informado}}`,
  },
  {
    id: "system-declaracao-comparecimento",
    name: "Declaração de Comparecimento",
    description:
      "Declaração formal para justificar ausência ou presenciar atendimento jurídico, com especificação de horário e motivo nos termos da CLT.",
    category: "declaracao",
    content: `DECLARAÇÃO DE COMPARECIMENTO PARA FINS JURÍDICOS

Para fins de comprovação de comparecimento ao atendimento jurídico, declaramos, sob as penas da lei, que:

O(A) Sr(a). {{client.name}}, inscrito(a) no CPF/CNPJ sob o n.º {{client.document | default:não informado}}, portador(a) do RG n.º {{client.rg | default:não informado}}, compareceu ao escritório de {{firm.name}}, inscrito(a) na OAB sob o n.º {{firm.oab | default:não informado}}, situado em {{firm.address | default:não informado}}, nas seguintes condições:

Data do atendimento: {{attendance.date | default:data a informar}}
Horário de início: {{attendance.time | default:horário a informar}}
Horário de término: {{attendance.end_time | default:horário a informar}}
Duração total: {{attendance.duration | default:duração a informar}}

MOTIVO DO ATENDIMENTO

O comparecimento teve por finalidade {{case.title | default:atendimento jurídico}} — {{attendance.purpose | default:consulta, orientação jurídica e análise documental referente ao caso em questão}}.

DOCUMENTOS APRESENTADOS

{{attendance.documents | default:relação dos documentos eventualmente apresentados pelo(a) cliente durante o atendimento}}

OBSERVAÇÕES

{{attendance.notes | default:nenhuma observação adicional}}

A presente declaração é emitida a pedido do(a) declarante, para os fins que lhe aprouver, incluindo, quando aplicável, justificativa de ausência ao trabalho, à escola ou a outro compromisso, nos termos do art. 473, inciso VIII, da Consolidação das Leis do Trabalho.

Por ser verdade, firmamos a presente declaração.

{{firm.city | default:Cidade}}, {{today}}.


____________________________________________
{{firm.name}}
Advogado(a)
OAB: {{firm.oab | default:não informado}}`,
  },
  {
    id: "system-encerramento",
    name: "Termo de Encerramento de Atendimento",
    description:
      "Termo formal para encerramento do atendimento jurídico, com registro de pendências, orientações finais e cláusulas de sobrevivência.",
    category: "geral",
    content: `TERMO DE ENCERRAMENTO DE ATENDIMENTO JURÍDICO

N.º {{closing.number | default:a ser preenchido}}

CLIENTE: {{client.name}}
CPF/CNPJ: {{client.document | default:não informado}}
Endereço: {{client.address | default:não informado}}

ASSUNTO: {{case.title | default:não informado}}
N.º DO PROCESSO: {{case.number | default:não informado}}
TRIBUNAL/ÓRGÃO: {{case.court | default:não informado}}
VARA: {{case.vara | default:não informado}}

ADVOGADO(A) RESPONSÁVEL: {{firm.name}}
OAB: {{firm.oab | default:não informado}}

═══════════════════════════════════════════════

As partes acima identificadas registram, por meio deste termo, o encerramento definitivo do atendimento jurídico referente ao assunto/processo indicado, com efeitos a partir da data de assinatura do presente instrumento.

1. DO OBJETO DO ATENDIMENTO ENCERRADO

{{closing.scope | default:Descreva de forma resumida o objeto do atendimento jurídico que está sendo encerrado, incluindo a natureza da demanda, as partes envolvidas e a fase processual em que se encontra o caso.}}

2. DAS PROVIDÊNCIAS CUMPRIDAS

{{closing.actions_performed | default:Liste as principais providências e atos jurídicos cumpridos ao longo do atendimento, incluindo peças processuais elaboradas, audiências acompanhadas, diligências realizadas e decisões obtidas.}}

3. DA SITUAÇÃO FINAL DO CASO

{{closing.final_status | default:Descreva a situação em que se encontra o caso na data de encerramento do atendimento, incluindo o andamento processual, eventual resultado obtido e pendências que permanecem em aberto.}}

4. DAS PENDÊNCIAS E ORIENTAÇÕES FINAIS

4.1. Pendências identificadas:

{{closing.pending_items | default:
— (descreva pendência 1, ex.: documento pendente de juntada)
— (descreva pendência 2, ex.: prazo recursal a vencer)
— (descreva pendência 3, ex.: audiência agendada)}}

4.2. Orientações ao cliente:

{{closing.client_guidance | default:
— (orientação 1: prazos que o cliente deve observar)
— (orientação 2: documentos que deve reunir)
— (orientação 3: atitudes que deve adotar ou evitar)}}

4.3. Recomendações adicionais:

{{closing.recommendations | default:registre eventuais recomendações, como a necessidade de contratação de novo profissional, providências administrativas ou judiciais que o(A) cliente deverá adotar por conta própria.}}

5. DOS HONORÁRIOS E DESPESAS

5.1. Até a presente data, os honorários e despesas relativos ao atendimento encerrado encontram-se {{closing.payment_status | default:a regularizar — detalhe a situação financeira pendente}}.

5.2. Eventuais honorários remanescentes ou despesas pendentes permanecem exigíveis, independentemente do encerramento do atendimento, nos termos do contrato firmado entre as partes.

6. DA ENTREGA DE DOCUMENTOS

{{closing.document_return | default:Declara-se que todos os documentos originais do(A) cliente foram devolvidos na data de hoje, conforme relação em anexo, e que cópias das peças processuais elaboradas encontram-se disponíveis para retirada.}}

7. DAS CLÁUSULAS DE SOBREVIVÊNCIA

7.1. O encerramento do atendimento não afasta, exonera ou modifica:

a) obrigações já assumidas pelas partes e não cumpridas até a presente data;
b) honorários vencidos e não pagos, que permanecem exigíveis;
c) despesas pendentes de reembolso;
d) deveres legais de guarda de documentos, que serão observados pelo prazo legal aplicável;
e) obrigações de sigilo e confidencialidade, que sobrevivem ao encerramento por prazo indeterminado.

7.2. Eventuais reclamações, questionamentos ou demandas decorrentes do atendimento encerrado deverão ser dirigidos por escrito ao escritório, no prazo de {{closing.complaint_deadline | default:30}} dias a contar da assinatura deste termo.

8. DA DECLARAÇÃO DAS PARTES

8.1. O(A) CLIENTE declara que tomou conhecimento das orientações e pendências registradas neste termo e que se encontra ciente das consequências do encerramento do atendimento.

8.2. O(A) ADVOGADO(A) declara que cumpriu integralmente o mandato confiado, tendo agido com zelo, diligência e dentro dos limites do contrato firmado.

═══════════════════════════════════════════════

E, por estarem de acordo, as partes firmam o presente Termo de Encerramento em duas vias de igual teor e forma, por baixo assinado.

{{firm.city | default:Cidade}}, {{today}}.


____________________________________________
{{client.name}}
CLIENTE
CPF/CNPJ: {{client.document | default:não informado}}

____________________________________________
{{firm.name}}
ADVOGADO(A) RESPONSÁVEL
OAB: {{firm.oab | default:não informado}}`,
  },
  {
    id: "system-substabelecimento",
    name: "Substabelecimento de Procuração",
    description:
      "Instrumento para transferência de poderes conferidos em procuração a outro(a) advogado(a), com ou sem reserva de poderes.",
    category: "procuracao",
    content: `SUBSTABELECIMENTO DE PROCURAÇÃO

SUBSTABELECENTE: {{firm.name}}, inscrito(a) na OAB sob o n.º {{firm.oab | default:não informado}}, com escritório profissional em {{firm.address | default:não informado}}.

SUBSTABELECIDO(A): {{substitute.lawyer_name | default:NOME DO ADVOGADO SUBSTABELECIDO}}, inscrito(a) na OAB sob o n.º {{substitute.oab | default:não informado}}, com endereço profissional em {{substitute.address | default:não informado}}.

PODERES SUBSTABELECIDOS

Pelo presente instrumento, o(a) SUBSTABELECENTE substabelece no(a) SUBSTABELECIDO(A), {{substitute.reservation_clause | default:com reserva de iguais poderes}}, todos os poderes que lhe foram conferidos por {{client.name}}, nos autos do processo n.º {{case.number | default:não informado}}, em trâmite perante o(a) {{case.court | default:não informado}}.

DURAÇÃO E VIGÊNCIA

O presente substabelecimento vigorará para a prática dos atos necessários no referido processo até final decisão ou ulterior revogação expressa.

{{firm.city | default:Cidade}}, {{today}}.


____________________________________________
{{firm.name}}
OAB: {{firm.oab | default:não informado}}
SUBSTABELECENTE`,
  },
  {
    id: "system-acordo",
    name: "Termo de Acordo Extrajudicial e Transação",
    description:
      "Instrumento de composição amigável de litígio ou pendência financeira/jurídica, com concessões mútuas, cláusula penal e quitação irrestrita.",
    category: "contrato",
    content: `TERMO DE ACORDO EXTRAJUDICIAL E TRANSAÇÃO

PRIMEIRO(A) TRANSAVENTE: {{client.name}}, inscrito(a) no CPF/CNPJ sob o n.º {{client.document | default:não informado}}, residente e domiciliado(a) em {{client.address | default:não informado}}.

SEGUNDO(A) TRANSAVENTE: {{case.opposing_party | default:NOME DA OUTRA PARTE}}, inscrito(a) no CPF/CNPJ sob o n.º {{case.opposing_party_document | default:não informado}}, residente e domiciliado(a) em {{case.opposing_party_address | default:não informado}}.

As partes acima qualificadas resolvem, com fundamento nos artigos 840 e seguintes do Código Civil brasileiro e no artigo 515, inciso III, do Código de Processo Civil, celebrar o presente TERMO DE ACORDO EXTRAJUDICIAL, mediante as seguintes cláusulas:

CLÁUSULA 1.ª — DO OBJETO E CONCESSÕES MÚTUAS

1.1. O presente acordo tem por objetivo pôr fim amigável à controvérsia existente entre as partes relativa a {{case.title | default:descreva a controvérsia ou processo}}, objeto do Processo n.º {{case.number | default:se houver processamento judicial}}.

1.2. Para prevenir ou encerrar o litígio, as partes ajustam concessões mútuas nos termos das cláusulas a seguir.

CLÁUSULA 2.ª — DAS CONDIÇÕES FINANCEIRAS E FORMA DE PAGAMENTO

2.1. O(A) SEGUNDO(A) TRANSAVENTE pagará ao(à) PRIMEIRO(A) TRANSAVENTE o valor total ajustado de R$ {{contract.value | default:0,00}} ({{contract.value_letter | default:zero reais}}).

2.2. O pagamento será efetuado em {{agreement.installments | default:parcela única}}, da seguinte forma: {{agreement.payment_details | default:PIX / depósito bancário na conta indicada}}.

CLÁUSULA 3.ª — DA CLÁUSULA PENAL

3.1. O descumprimento de qualquer das obrigações assumidas neste instrumento ensejará o vencimento antecipado das parcelas vincendas, acrescido de multa penal compensatória de {{agreement.penalty | default:20%}} sobre o valor do débito remanescente, além de juros moratórios de 1% ao mês e correção monetária.

CLÁUSULA 4.ª — DA QUITAÇÃO INTEGRAL E HOMOLOGAÇÃO

4.1. Cumpridas integralmente as obrigações estipuladas neste termo, as partes dão-se mútua, plena, geral e irrevogável quitação de todos os direitos e obrigações decorrentes do objeto transacionado, nada mais podendo reclamar em juízo ou fora dele.

4.2. As partes autorizam a juntada deste termo nos autos do processo em referência (caso existente) para homologação judicial, com resolução do mérito nos termos do art. 487, inciso III, "b", do Código de Processo Civil.

{{firm.city | default:Cidade}}, {{today}}.


____________________________________________
{{client.name}}
PRIMEIRO(A) TRANSAVENTE

____________________________________________
{{case.opposing_party | default:NOME DA OUTRA PARTE}}
SEGUNDO(A) TRANSAVENTE`,
  },
  {
    id: "system-manifestacao",
    name: "Petição Simples de Manifestação Processual",
    description:
      "Peça genérica para requerer prazos, informar cumprimento de despacho, reagendar audiências ou manifestar-se sobre andamentos.",
    category: "peticao",
    content: `EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA {{case.court | default:VARA COMPETENTE}}

Processo n.º {{case.number | default:NÚMERO DO PROCESSO}}

{{client.name}}, já devidamente qualificado(a) nos autos da ação em epígrafe, por intermédio de seu(sua) advogado(a) infra-assinado(a), vem, respeitosamente, à presença de Vossa Excelência, apresentar

MANIFESTAÇÃO PROCESSUAL

pelas razões a seguir expostas.

1. DOS FATOS E DOS REQUERIMENTOS

1.1. Em atenção ao r. despacho/intimação retro, o(a) Peticionante vem informar e requerer o quanto segue:

{{motion.statement | default:Descreva detalhadamente o motivo da manifestação, tais como: (i) pedido de dilatação de prazo por X dias; (ii) informação sobre cumprimento de diligência; (iii) justificativa ou reagendamento de audiência; (iv) manifestação sobre certidão do oficial de justiça.}}

2. DO PEDIDO

Diante do exposto, requer a Vossa Excelência o deferimento do quanto requerido na presente petição, determinando-se os demais atos necessários ao regular prosseguimento do feito.

Termos em que,
Pede deferimento.

{{firm.city | default:Cidade}}, {{today}}.


____________________________________________
{{firm.name}}
Advogado(a)
OAB: {{firm.oab | default:não informado}}`,
  },
];
