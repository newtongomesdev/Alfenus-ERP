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
    name: "Procuracao Ad Judicia e Extra",
    description: "Instrumento para representacao judicial e extrajudicial, com poderes gerais e especiais editaveis.",
    category: "procuracao",
    content: `PROCURACAO\n\nOUTORGANTE: {{client.name}}, inscrito(a) no CPF/CNPJ sob o no {{client.document | default:NAO INFORMADO}}, com endereco e demais qualificacoes constantes do cadastro.\n\nOUTORGADO: {{firm.name}}, inscrito(a) no CPF/CNPJ sob o no {{firm.document | default:NAO INFORMADO}}.\n\nPelo presente instrumento particular, o(a) OUTORGANTE nomeia e constitui o(a) OUTORGADO(a) seu bastante procurador(a), conferindo-lhe poderes para representa-lo(a) judicial e extrajudicialmente, praticando os atos necessarios a defesa de seus interesses.\n\nPODERES\nO mandato compreende os poderes da clausula ad judicia et extra, inclusive para propor acoes, apresentar defesa, acompanhar processos, receber citacoes e intimacoes, produzir provas, firmar requerimentos, recorrer, substabelecer com ou sem reserva de poderes e praticar todos os demais atos necessarios ao fiel cumprimento deste mandato.\n\nPODERES ESPECIAIS\nQuando necessarios ao caso concreto, ficam tambem conferidos poderes para transigir, desistir, reconhecer a procedencia do pedido, receber e dar quitacao, firmar compromissos e acordos.\n\nREFERENCIA\nProcesso ou assunto: {{case.title | default:NAO INFORMADO}}\nProcesso no: {{case.number | default:NAO INFORMADO}}\n\n{{firm.city | default:Cidade}}, {{today}}.\n\n\n____________________________________________\n{{client.name}}\nOUTORGANTE`,
  },
  {
    id: "system-honorarios",
    name: "Contrato de Honorarios Advocatícios",
    description: "Contrato completo para prestacao de servicos, honorarios, despesas, deveres e encerramento.",
    category: "contrato",
    content: `CONTRATO DE PRESTACAO DE SERVICOS ADVOCATICIOS\n\nPelo presente instrumento, de um lado, {{client.name}}, CPF/CNPJ {{client.document | default:NAO INFORMADO}}, doravante CONTRATANTE; e, de outro, {{firm.name}}, CPF/CNPJ {{firm.document | default:NAO INFORMADO}}, doravante CONTRATADO, celebram o presente contrato.\n\nCLÁUSULA 1 - OBJETO\nO CONTRATADO prestara servicos advocaticios referentes a {{contract.description | default:assunto juridico a ser definido}}, incluindo analise, orientacao e atuacao necessaria dentro dos limites deste instrumento.\n\nCLÁUSULA 2 - HONORARIOS E FORMA DE PAGAMENTO\nPelos servicos, o CONTRATANTE pagara honorarios no valor total de {{contract.value | default:R$ 0,00}}, conforme condicoes registradas no Alfenus. A eventual inadimplencia podera acarretar multa, juros e atualizacao, na forma ajustada entre as partes.\n\nCLÁUSULA 3 - DESPESAS\nCustas, emolumentos, diligencias, deslocamentos, pericias, correspondentes e demais despesas necessarias a execucao do servico serao de responsabilidade do CONTRATANTE, mediante previa ciencia sempre que possivel.\n\nCLÁUSULA 4 - OBRIGACOES DO CONTRATANTE\nO CONTRATANTE devera fornecer informacoes e documentos verdadeiros, completos e em tempo habil, mantendo seus dados de contato atualizados.\n\nCLÁUSULA 5 - LIMITES DA ATUACAO\nO CONTRATADO obriga-se a empregar a tecnica e diligencia profissional adequadas, sem garantia de resultado, pois a decisao final depende de terceiros e das particularidades do caso.\n\nCLÁUSULA 6 - CONFIDENCIALIDADE E DADOS\nAs partes comprometem-se a preservar informacoes confidenciais. Os dados pessoais serao tratados para execucao deste contrato e cumprimento de obrigacoes legais.\n\nCLÁUSULA 7 - ENCERRAMENTO\nO contrato podera ser encerrado por qualquer parte mediante comunicacao escrita, permanecendo exigiveis os honorarios e despesas relativos aos servicos ja prestados.\n\nE, por estarem de acordo, firmam o presente instrumento.\n\n{{firm.city | default:Cidade}}, {{today}}.\n\n____________________________________________\n{{client.name}}\nCONTRATANTE\n\n____________________________________________\n{{firm.name}}\nCONTRATADO`,
  },
  {
    id: "system-notificacao",
    name: "Notificacao Extrajudicial",
    description: "Comunicacao formal com prazo, providencia solicitada e registro de recebimento.",
    category: "notificacao",
    content: `NOTIFICACAO EXTRAJUDICIAL\n\nNOTIFICANTE: {{client.name}}, CPF/CNPJ {{client.document | default:NAO INFORMADO}}.\n\nNOTIFICADO(A): {{case.opposing_party | default:NOME DO NOTIFICADO}}.\n\nASSUNTO: {{case.title | default:ASSUNTO A SER ESPECIFICADO}}\nREFERENCIA: {{case.number | default:SEM NUMERO DE PROCESSO}}\n\nPrezado(a) Senhor(a),\n\nNa qualidade de representante do(a) NOTIFICANTE, {{firm.name}} comunica formalmente que {{notification.fact | default:descreva de forma objetiva os fatos que motivam esta notificacao}}.\n\nDiante disso, solicita-se que {{notification.request | default:informe a providencia esperada}} no prazo de {{notification.deadline | default:5 dias corridos}} contados do recebimento desta notificacao.\n\nO nao atendimento podera ensejar a adocao das medidas administrativas e judiciais cabiveis, sem prejuizo da apuracao de perdas e danos, quando aplicavel.\n\nSolicita-se a confirmacao de recebimento deste documento.\n\n{{firm.city | default:Cidade}}, {{today}}.\n\n____________________________________________\n{{firm.name}}`,
  },
  {
    id: "system-recebimento",
    name: "Recibo de Honorarios",
    description: "Recibo formal de pagamento de honorarios ou reembolso, pronto para assinatura.",
    category: "financeiro",
    content: `RECIBO DE PAGAMENTO\n\nRecebi de {{client.name}}, CPF/CNPJ {{client.document | default:NAO INFORMADO}}, a quantia de {{contract.value | default:R$ 0,00}}, referente a {{contract.description | default:servicos advocaticios}}.\n\nForma de pagamento: {{payment.method | default:NAO INFORMADA}}.\nData do pagamento: {{payment.date | default:DATA A INFORMAR}}.\n\nDou plena, geral e irrevogavel quitacao pelo valor acima identificado, exclusivamente quanto ao pagamento ora recebido.\n\n{{firm.city | default:Cidade}}, {{today}}.\n\n____________________________________________\n{{firm.name}}\nCPF/CNPJ: {{firm.document | default:NAO INFORMADO}}`,
  },
  {
    id: "system-relatorio",
    name: "Relatorio de Andamento ao Cliente",
    description: "Atualizacao clara de processo, providencias realizadas, proximos passos e orientacoes.",
    category: "relatorio",
    content: `RELATORIO DE ANDAMENTO\n\nCLIENTE: {{client.name}}\nASSUNTO: {{case.title | default:NAO INFORMADO}}\nPROCESSO: {{case.number | default:NAO INFORMADO}}\nTRIBUNAL/ORGAO: {{case.court | default:NAO INFORMADO}}\n\n1. SITUACAO ATUAL\n{{report.current_status | default:Descreva o status atual do caso, com linguagem clara e objetiva.}}\n\n2. PROVIDENCIAS REALIZADAS\n{{report.actions_taken | default:Liste as principais medidas adotadas desde a ultima atualizacao.}}\n\n3. PROXIMOS PASSOS\n{{report.next_steps | default:Indique as providencias esperadas, prazos relevantes e quem sera responsavel por cada etapa.}}\n\n4. ORIENTACOES AO CLIENTE\n{{report.client_guidance | default:Registre documentos, informacoes ou condutas esperadas do cliente.}}\n\nEste relatorio possui carater informativo e reflete a situacao conhecida na data de sua emissao.\n\n{{firm.city | default:Cidade}}, {{today}}.\n\n{{firm.name}}`,
  },
  {
    id: "system-declaracao",
    name: "Declaracao de Hipossuficiencia",
    description: "Declaracao para instrucao de pedido de gratuidade da justica, sujeita a revisao do caso.",
    category: "declaracao",
    content: `DECLARACAO DE HIPOSSUFICIENCIA ECONOMICA\n\nEu, {{client.name}}, CPF/CNPJ {{client.document | default:NAO INFORMADO}}, declaro, sob as penas da lei, que nao possuo recursos suficientes para arcar com custas, despesas processuais e honorarios periciais sem prejuizo do meu sustento e de minha familia.\n\nA presente declaracao e prestada para fins de requerimento dos beneficios da gratuidade da justica, nos termos da legislacao aplicavel. Comprometo-me a comunicar eventual alteracao relevante em minha situacao economica.\n\n{{firm.city | default:Cidade}}, {{today}}.\n\n____________________________________________\n{{client.name}}\nDECLARANTE`,
  },
  {
    id: "system-peticao",
    name: "Peticao de Juntada de Documentos",
    description: "Peca estruturada para juntada, com identificacao do processo e pedido objetivo.",
    category: "peticao",
    content: `EXCELENTISSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA {{case.court | default:VARA COMPETENTE}}\n\nProcesso no {{case.number | default:NUMERO DO PROCESSO}}\n\n{{client.name}}, ja qualificado(a) nos autos em epigrafe, por seu advogado, vem, respeitosamente, a presenca de Vossa Excelencia requerer a\n\nJUNTADA DE DOCUMENTOS\n\npelos fatos e fundamentos a seguir expostos.\n\n1. A parte apresenta os documentos anexos, pertinentes a demonstracao de {{petition.purpose | default:fato relevante para o julgamento da causa}}.\n\n2. Os documentos acompanham esta manifestacao para que sejam recebidos, juntados aos autos e considerados na apreciacao do feito.\n\nDiante do exposto, requer a juntada dos documentos anexos e o regular prosseguimento do processo.\n\nTermos em que,\nPede deferimento.\n\n{{firm.city | default:Cidade}}, {{today}}.\n\n____________________________________________\n{{firm.name}}\nOAB: {{firm.oab | default:NAO INFORMADA}}`,
  },
  {
    id: "system-proposta-honorarios",
    name: "Proposta de Honorarios",
    description: "Apresentacao comercial profissional para advogados autonomos e escritorios de pequeno porte.",
    category: "financeiro",
    content: `PROPOSTA DE HONORARIOS ADVOCATICIOS\n\nDESTINATARIO(A): {{client.name}}\nASSUNTO: {{case.title | default:SERVICO JURIDICO}}\n\n1. ESCOPO DO ATENDIMENTO\n{{proposal.scope | default:Descreva o servico, as entregas e os limites da atuacao profissional.}}\n\n2. HONORARIOS\nPela execucao dos servicos descritos, os honorarios propostos sao de {{contract.value | default:R$ 0,00}}.\nForma de pagamento: {{proposal.payment_terms | default:a definir entre as partes}}.\n\n3. DESPESAS\nCustas, emolumentos, deslocamentos, pericias e despesas de terceiros nao estao incluidos, salvo indicacao expressa em contrario.\n\n4. VALIDADE\nEsta proposta permanece valida por {{proposal.validity | default:10 dias}} a contar da data de emissao. A contratacao sera formalizada por instrumento proprio.\n\n{{firm.city | default:Cidade}}, {{today}}.\n\n{{firm.name}}\n{{firm.email | default:}}\n{{firm.phone | default:}}`,
  },
  {
    id: "system-declaracao-comparecimento",
    name: "Declaracao de Comparecimento",
    description: "Declaracao para justificar presenca do cliente em atendimento juridico.",
    category: "declaracao",
    content: `DECLARACAO DE COMPARECIMENTO\n\nDeclaramos, para os devidos fins, que {{client.name}}, CPF/CNPJ {{client.document | default:NAO INFORMADO}}, compareceu a {{firm.name}} em {{attendance.date | default:DATA A INFORMAR}}, no horario de {{attendance.time | default:HORARIO A INFORMAR}}, para atendimento juridico referente a {{case.title | default:assunto juridico}}.\n\nPor ser verdade, firmamos a presente declaracao.\n\n{{firm.city | default:Cidade}}, {{today}}.\n\n____________________________________________\n{{firm.name}}`,
  },
  {
    id: "system-encerramento",
    name: "Termo de Encerramento de Atendimento",
    description: "Formaliza o encerramento do atendimento, orientacoes finais e pendencias registradas.",
    category: "geral",
    content: `TERMO DE ENCERRAMENTO DE ATENDIMENTO\n\nCLIENTE: {{client.name}}\nASSUNTO: {{case.title | default:NAO INFORMADO}}\nREFERENCIA: {{case.number | default:NAO INFORMADO}}\n\nAs partes registram o encerramento do atendimento juridico relacionado ao assunto acima, a partir desta data.\n\nPENDENCIAS E ORIENTACOES FINAIS\n{{closing.notes | default:Registre eventuais pendencias, documentos a entregar, prazos ou orientacoes fornecidas ao cliente.}}\n\nO encerramento nao afasta obrigacoes ja assumidas, honorarios vencidos, despesas pendentes ou deveres legais de guarda de documentos.\n\n{{firm.city | default:Cidade}}, {{today}}.\n\n____________________________________________\n{{client.name}}\n\n____________________________________________\n{{firm.name}}`,
  },
];
