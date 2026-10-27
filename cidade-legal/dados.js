/* ══════════════════════════════════════════════════════════════════════════
   CIDADE LEGAL — Conteúdo jurídico
   Cada prédio representa uma área do Direito brasileiro. Para liberá-lo, o
   prefeito precisa passar na "licença" (quiz). Depois de construído, o prédio
   gera "casos" — situações do dia a dia que o jogador resolve com a lei.

   Para adicionar conteúdo, basta acrescentar itens nos arrays abaixo:
   · PREDIOS[].licenca  → perguntas do quiz  { p, ops, c, exp }
   · CASOS              → dilemas mensais    { predio, titulo, quem, texto, ops, c, exp, base }
   (c = índice da alternativa correta, começando em 0)
══════════════════════════════════════════════════════════════════════════ */

const PREDIOS = {
  prefeitura: {
    nome: 'Prefeitura', icone: '🏛️', area: 'Direito Constitucional e Administrativo', cor: '#C8980F',
    custo: 0, nivel: 0, unico: true,
    efeito: { renda: 0, manutencao: 20, pop: 0, felicidade: 0 },
    aula: {
      resumo: 'O município é um ente da federação com autonomia: tem prefeito, vereadores e leis próprias para assuntos de interesse local.',
      pontos: [
        'O Brasil é uma federação formada pela União, Estados, Distrito Federal e Municípios — todos autônomos (CF, art. 18).',
        'O município legisla sobre assuntos de interesse local, como coleta de lixo, transporte urbano e uso do solo (CF, art. 30).',
        'A administração pública segue o "LIMPE": Legalidade, Impessoalidade, Moralidade, Publicidade e Eficiência (CF, art. 37).',
        'Para contratar obras e serviços, a prefeitura faz licitação (Lei 14.133/2021); para contratar servidores efetivos, concurso público (CF, art. 37, II).',
      ],
      pratica: 'O prefeito não pode contratar a empresa do primo sem licitação, nem nomear o filho para um cargo efetivo sem concurso.',
    },
    licenca: [],
  },

  casa: {
    nome: 'Casas', icone: '🏠', area: 'Direito Civil — Propriedade', cor: '#1A72C8',
    custo: 120, nivel: 0,
    efeito: { renda: 14, manutencao: 0, pop: 6, felicidade: 0 },
    aula: {
      resumo: 'A propriedade dá ao dono o direito de usar, aproveitar, vender e reaver o bem — mas ela deve cumprir sua função social.',
      pontos: [
        'O proprietário pode usar, gozar, dispor e reaver a coisa de quem a possua injustamente (Código Civil, art. 1.228).',
        'Imóvel só passa a ser seu com o registro da escritura no Cartório de Registro de Imóveis (CC, art. 1.245). "Contrato de gaveta" não transfere a propriedade.',
        'Usucapião: quem mora num imóvel urbano de até 250 m², por 5 anos, sem oposição e sem ter outro imóvel, pode se tornar dono (CF, art. 183).',
        'Imóveis públicos não podem ser adquiridos por usucapião (CF, art. 183, §3º).',
        'O vizinho não pode fazer uso anormal da propriedade que prejudique o sossego, a saúde ou a segurança dos outros (CC, art. 1.277).',
      ],
      pratica: 'Comprou uma casa? Faça a escritura e registre no Cartório de Imóveis. Sem registro, o vendedor ainda é o dono no papel.',
    },
    licenca: [
      { p: 'Quando a propriedade de um imóvel é transferida ao comprador?', ops: ['Na assinatura do contrato particular', 'No pagamento da primeira parcela', 'Com o registro do título no Cartório de Registro de Imóveis', 'Quando o comprador recebe as chaves'], c: 2, exp: 'Pelo art. 1.245 do Código Civil, entre vivos a propriedade imobiliária só se transfere com o registro do título no Registro de Imóveis.' },
      { p: 'Qual o prazo da usucapião especial urbana (imóvel de até 250 m² usado como moradia)?', ops: ['2 anos', '5 anos', '10 anos', '20 anos'], c: 1, exp: 'A CF, art. 183, prevê 5 anos de posse ininterrupta e sem oposição, desde que a pessoa não seja dona de outro imóvel.' },
      { p: 'É possível adquirir uma praça pública por usucapião?', ops: ['Sim, após 15 anos', 'Sim, se ninguém reclamar', 'Não, bens públicos não são usucapíveis', 'Só com autorização do prefeito'], c: 2, exp: 'A Constituição (art. 183, §3º e art. 191, parágrafo único) proíbe a usucapião de imóveis públicos.' },
      { p: 'O vizinho faz festas barulhentas toda madrugada. Qual regra protege você?', ops: ['Direito de vizinhança — uso anormal da propriedade', 'Código de Defesa do Consumidor', 'CLT', 'Não há proteção legal'], c: 0, exp: 'O art. 1.277 do Código Civil permite ao vizinho fazer cessar interferências prejudiciais ao sossego, à saúde e à segurança.' },
    ],
  },

  aluguel: {
    nome: 'Prédio de Aluguel', icone: '🏢', area: 'Lei do Inquilinato', cor: '#3A80F0',
    custo: 260, nivel: 1,
    efeito: { renda: 30, manutencao: 0, pop: 14, felicidade: 0 },
    aula: {
      resumo: 'A Lei do Inquilinato (Lei 8.245/1991) regula a relação entre quem aluga (locador) e quem mora (locatário).',
      pontos: [
        'O locatário pode devolver o imóvel antes do fim do contrato pagando multa proporcional ao tempo que falta (art. 4º).',
        'O contrato pode exigir apenas UMA garantia: caução, fiança, seguro-fiança ou cessão fiduciária de quotas (art. 37). Exigir duas é contravenção.',
        'A caução em dinheiro não pode passar de 3 meses de aluguel (art. 38, §2º).',
        'Se o imóvel for vendido, o inquilino tem direito de preferência para comprá-lo nas mesmas condições (art. 27).',
        'O locador deve entregar o imóvel em condições de uso e pagar as despesas extraordinárias de condomínio, como reformas estruturais (art. 22).',
      ],
      pratica: 'Pediram fiador E seguro-fiança ao mesmo tempo? Isso é ilegal: a lei só permite uma modalidade de garantia por contrato.',
    },
    licenca: [
      { p: 'Quantas modalidades de garantia o locador pode exigir no mesmo contrato?', ops: ['Uma', 'Duas', 'Três', 'Quantas quiser'], c: 0, exp: 'O parágrafo único do art. 37 da Lei 8.245/91 veda mais de uma modalidade de garantia no mesmo contrato.' },
      { p: 'Qual o limite da caução em dinheiro?', ops: ['1 mês de aluguel', '3 meses de aluguel', '6 meses de aluguel', '12 meses de aluguel'], c: 1, exp: 'O art. 38, §2º, limita a caução em dinheiro a 3 meses de aluguel, depositada em poupança.' },
      { p: 'O dono decide vender o apartamento alugado. O que o inquilino tem?', ops: ['Nada, deve sair em 24h', 'Direito de preferência na compra', 'Direito a ficar de graça por 1 ano', 'Direito a 50% do valor'], c: 1, exp: 'O art. 27 da Lei do Inquilinato garante ao locatário a preferência para adquirir o imóvel em igualdade de condições com terceiros.' },
    ],
  },

  mercado: {
    nome: 'Mercado', icone: '🏪', area: 'Direito do Consumidor', cor: '#E07B2A',
    custo: 180, nivel: 0,
    efeito: { renda: 26, manutencao: 0, pop: 0, felicidade: 3 },
    aula: {
      resumo: 'O Código de Defesa do Consumidor (Lei 8.078/1990) protege quem compra, porque o consumidor é a parte mais fraca da relação.',
      pontos: [
        'Comprou fora da loja (internet, telefone, porta a porta)? Você tem 7 dias para desistir e receber tudo de volta (art. 49).',
        'Prazo para reclamar de defeito aparente: 30 dias para produtos não duráveis (comida) e 90 dias para duráveis (eletrônicos) (art. 26).',
        'Venda casada é proibida — a loja não pode obrigar você a levar um produto para comprar outro (art. 39, I).',
        'Propaganda enganosa ou abusiva é proibida, e a oferta anunciada obriga o fornecedor (arts. 30 e 37).',
        'O fornecedor responde pelos danos causados por defeito do produto mesmo sem culpa — é a responsabilidade objetiva (art. 12).',
      ],
      pratica: 'O preço na etiqueta era menor que o do caixa? A oferta vincula a loja: você paga o menor preço anunciado.',
    },
    licenca: [
      { p: 'Comprei um tênis pela internet e me arrependi. Qual o prazo para desistir?', ops: ['3 dias', '7 dias', '15 dias', '30 dias'], c: 1, exp: 'O direito de arrependimento (art. 49 do CDC) vale por 7 dias para compras fora do estabelecimento comercial.' },
      { p: 'O cinema só deixa entrar quem comprar a pipoca dele. Isso é:', ops: ['Legal, a empresa define as regras', 'Venda casada, prática abusiva', 'Permitido aos finais de semana', 'Questão de direito trabalhista'], c: 1, exp: 'Condicionar o fornecimento de um produto ou serviço a outro é venda casada, proibida pelo art. 39, I, do CDC.' },
      { p: 'Qual o prazo para reclamar de defeito aparente numa geladeira (produto durável)?', ops: ['7 dias', '30 dias', '90 dias', '5 anos'], c: 2, exp: 'Para produtos duráveis o prazo é de 90 dias (art. 26, II, do CDC); para não duráveis, 30 dias.' },
      { p: 'Um anúncio diz que o celular é à prova d\'água, mas não é. Isso é:', ops: ['Propaganda enganosa', 'Liberdade de expressão', 'Erro sem consequência', 'Crime ambiental'], c: 0, exp: 'Informação falsa capaz de induzir o consumidor a erro é publicidade enganosa (art. 37, §1º, do CDC).' },
    ],
  },

  fabrica: {
    nome: 'Fábrica', icone: '🏭', area: 'Direito do Trabalho', cor: '#D9662B',
    custo: 320, nivel: 1,
    efeito: { renda: 48, manutencao: 0, pop: 4, felicidade: -2 },
    aula: {
      resumo: 'A CLT e o art. 7º da Constituição garantem direitos mínimos a quem trabalha com carteira assinada.',
      pontos: [
        'Jornada normal de até 8 horas por dia e 44 horas por semana (CF, art. 7º, XIII). O que passar disso é hora extra, paga com no mínimo 50% a mais (art. 7º, XVI).',
        'Férias anuais remuneradas com um terço a mais (art. 7º, XVII) e 13º salário (art. 7º, VIII).',
        'Quem trabalha mais de 6 horas tem direito a no mínimo 1 hora de intervalo para refeição (CLT, art. 71).',
        'O empregador deve recolher o FGTS — 8% do salário depositados todo mês em conta do trabalhador (Lei 8.036/1990).',
        'É proibido qualquer trabalho a menores de 16 anos, salvo como aprendiz a partir dos 14 (CF, art. 7º, XXXIII).',
      ],
      pratica: 'Trabalhou 10 horas num dia? As 2 horas a mais são extras e devem ser pagas com adicional de pelo menos 50% (ou compensadas em banco de horas válido).',
    },
    licenca: [
      { p: 'Qual a jornada máxima normal prevista na Constituição?', ops: ['6h/dia e 30h/semana', '8h/dia e 44h/semana', '10h/dia e 50h/semana', '12h/dia e 60h/semana'], c: 1, exp: 'O art. 7º, XIII, da CF fixa duração do trabalho normal não superior a 8 horas diárias e 44 semanais.' },
      { p: 'Qual o adicional mínimo da hora extra?', ops: ['10%', '25%', '50%', '100%'], c: 2, exp: 'O art. 7º, XVI, da CF garante remuneração do serviço extraordinário superior, no mínimo, em 50% à do normal.' },
      { p: 'A partir de que idade alguém pode trabalhar como aprendiz?', ops: ['12 anos', '14 anos', '16 anos', '18 anos'], c: 1, exp: 'A CF (art. 7º, XXXIII) proíbe trabalho a menores de 16 anos, salvo na condição de aprendiz, a partir de 14.' },
      { p: 'Além do salário, quanto o trabalhador recebe a mais nas férias?', ops: ['Nada', 'Um terço do salário', 'Metade do salário', 'Dois salários'], c: 1, exp: 'As férias são remuneradas com, pelo menos, um terço a mais do que o salário normal (CF, art. 7º, XVII).' },
    ],
  },

  escola: {
    nome: 'Escola', icone: '🏫', area: 'Educação e ECA', cor: '#0FA86A',
    custo: 240, nivel: 1,
    efeito: { renda: 0, manutencao: 14, pop: 0, felicidade: 7 },
    servico: 'educacao',
    aula: {
      resumo: 'Crianças e adolescentes têm prioridade absoluta. Educação é direito de todos e dever do Estado e da família.',
      pontos: [
        'Para o ECA (Lei 8.069/1990), criança é quem tem até 12 anos incompletos; adolescente, de 12 a 18 anos (art. 2º).',
        'Família, sociedade e poder público devem garantir, com prioridade absoluta, os direitos de crianças e adolescentes (CF, art. 227; ECA, art. 4º).',
        'A educação básica é obrigatória e gratuita dos 4 aos 17 anos (CF, art. 208, I).',
        'Todo município deve ter ao menos um Conselho Tutelar, com 5 membros escolhidos pela comunidade (ECA, art. 132).',
        'A escola deve comunicar ao Conselho Tutelar casos de maus-tratos e de faltas reiteradas dos alunos (ECA, arts. 13 e 56).',
      ],
      pratica: 'Um aluno parou de ir à aula e a família não responde? A escola aciona o Conselho Tutelar, que acompanha o caso.',
    },
    licenca: [
      { p: 'Pelo ECA, até que idade uma pessoa é considerada criança?', ops: ['Até 10 anos', 'Até 12 anos incompletos', 'Até 14 anos', 'Até 16 anos'], c: 1, exp: 'O art. 2º do ECA define criança como a pessoa até 12 anos incompletos e adolescente entre 12 e 18 anos.' },
      { p: 'Dos quantos aos quantos anos a educação básica é obrigatória?', ops: ['6 a 14 anos', '4 a 17 anos', '7 a 18 anos', '0 a 18 anos'], c: 1, exp: 'Pela CF, art. 208, I (EC 59/2009), a educação básica é obrigatória e gratuita dos 4 aos 17 anos.' },
      { p: 'Quem a escola deve avisar em caso de suspeita de maus-tratos a um aluno?', ops: ['Ninguém, é assunto da família', 'O Conselho Tutelar', 'A Receita Federal', 'O Procon'], c: 1, exp: 'O art. 56 do ECA obriga os dirigentes de escolas a comunicar ao Conselho Tutelar os casos de maus-tratos.' },
    ],
  },

  saude: {
    nome: 'Posto de Saúde', icone: '🏥', area: 'Direito à Saúde (SUS)', cor: '#0FA86A',
    custo: 260, nivel: 1,
    efeito: { renda: 0, manutencao: 16, pop: 0, felicidade: 8 },
    servico: 'saude',
    aula: {
      resumo: 'Saúde é direito de todos e dever do Estado. O SUS (Lei 8.080/1990) atende qualquer pessoa, de graça.',
      pontos: [
        'A saúde é direito de todos e dever do Estado (CF, art. 196).',
        'O SUS é universal: atende todas as pessoas, inclusive estrangeiros, sem exigir pagamento (Lei 8.080/90, art. 7º, I).',
        'O SUS é descentralizado: União, Estados e Municípios dividem as responsabilidades, e o município cuida da atenção básica.',
        'O paciente tem direito de acesso ao próprio prontuário e às informações sobre seu tratamento.',
      ],
      pratica: 'Um turista estrangeiro passou mal na cidade? O posto de saúde deve atendê-lo normalmente: o SUS é universal.',
    },
    licenca: [
      { p: 'Segundo a Constituição, a saúde é:', ops: ['Um serviço privado', 'Direito de todos e dever do Estado', 'Exclusiva de quem tem carteira assinada', 'Responsabilidade só da família'], c: 1, exp: 'É o que diz o art. 196 da Constituição Federal.' },
      { p: 'Quem pode ser atendido pelo SUS?', ops: ['Só quem contribui para o INSS', 'Só brasileiros', 'Qualquer pessoa', 'Só quem não tem plano de saúde'], c: 2, exp: 'A universalidade de acesso é princípio do SUS (Lei 8.080/90, art. 7º, I).' },
      { p: 'Qual lei organiza o Sistema Único de Saúde?', ops: ['Lei 8.080/1990', 'Lei 8.078/1990', 'Lei 9.099/1995', 'Lei 13.709/2018'], c: 0, exp: 'A Lei 8.080/90 é a Lei Orgânica da Saúde. (A 8.078/90 é o CDC — números parecidos, assuntos diferentes!)' },
    ],
  },

  parque: {
    nome: 'Parque', icone: '🌳', area: 'Direito Ambiental', cor: '#2E9E4F',
    custo: 150, nivel: 0,
    efeito: { renda: 0, manutencao: 6, pop: 0, felicidade: 6 },
    servico: 'lazer',
    aula: {
      resumo: 'Todos têm direito a um meio ambiente equilibrado, e todos — governo e sociedade — devem protegê-lo para as futuras gerações.',
      pontos: [
        'O meio ambiente ecologicamente equilibrado é bem de uso comum do povo (CF, art. 225).',
        'Quem polui deve reparar o dano, independentemente de culpa — responsabilidade objetiva (Lei 6.938/1981, art. 14, §1º).',
        'A Lei de Crimes Ambientais (Lei 9.605/1998) pune também empresas, não só pessoas físicas.',
        'As margens de rios são Áreas de Preservação Permanente (APP): no mínimo 30 metros para rios de até 10 m de largura (Código Florestal, Lei 12.651/2012, art. 4º).',
      ],
      pratica: 'Uma fábrica jogou resíduos no rio "sem querer"? Ela responde mesmo assim: no dano ambiental, não importa a culpa.',
    },
    licenca: [
      { p: 'Uma empresa poluiu um rio por acidente, sem culpa. Ela deve reparar o dano?', ops: ['Não, foi acidente', 'Sim, a responsabilidade ambiental é objetiva', 'Só se for multada antes', 'Só se o rio for federal'], c: 1, exp: 'Pela Lei 6.938/81, art. 14, §1º, o poluidor deve reparar o dano independentemente de culpa.' },
      { p: 'Empresas podem responder por crimes ambientais?', ops: ['Não, só pessoas físicas', 'Sim, pela Lei 9.605/1998 e pela CF, art. 225, §3º', 'Só multinacionais', 'Só em casos de desmatamento'], c: 1, exp: 'A Constituição (art. 225, §3º) e a Lei 9.605/98 (art. 3º) admitem a responsabilização penal da pessoa jurídica.' },
      { p: 'Qual a faixa mínima de mata a preservar na margem de um riacho com menos de 10 m de largura?', ops: ['5 metros', '15 metros', '30 metros', '100 metros'], c: 2, exp: 'O Código Florestal (art. 4º, I, "a") fixa APP de 30 metros para cursos d\'água com menos de 10 metros de largura.' },
    ],
  },

  delegacia: {
    nome: 'Delegacia', icone: '🚓', area: 'Direito Penal e Processo Penal', cor: '#5B6B8C',
    custo: 300, nivel: 2,
    efeito: { renda: 0, manutencao: 18, pop: 0, felicidade: 7 },
    servico: 'seguranca',
    aula: {
      resumo: 'Só é crime o que a lei define como crime, e mesmo o suspeito tem direitos garantidos pela Constituição.',
      pontos: [
        'Não há crime sem lei anterior que o defina, nem pena sem prévia cominação legal — princípio da legalidade (CF, art. 5º, XXXIX; Código Penal, art. 1º).',
        'Legítima defesa: não é crime repelir agressão injusta, atual ou iminente, usando moderadamente os meios necessários (CP, art. 25).',
        'O preso tem direito de permanecer calado e de ter assistência de advogado e da família (CF, art. 5º, LXIII).',
        'Quem é preso em flagrante deve ser levado a um juiz em até 24 horas — a audiência de custódia (CPP, art. 310).',
        'Ninguém será considerado culpado até o trânsito em julgado da sentença penal condenatória (CF, art. 5º, LVII).',
      ],
      pratica: 'Uma lei nova criou um crime hoje. Quem fez aquilo ontem não pode ser punido: a lei penal não retroage para prejudicar.',
    },
    licenca: [
      { p: 'Uma conduta pode ser punida como crime se não havia lei definindo-a quando foi praticada?', ops: ['Sim, se for grave', 'Não, pelo princípio da legalidade', 'Sim, se o juiz quiser', 'Só se houver flagrante'], c: 1, exp: 'CF, art. 5º, XXXIX e CP, art. 1º: não há crime sem lei anterior que o defina.' },
      { p: 'Em quanto tempo o preso em flagrante deve ser apresentado ao juiz?', ops: ['24 horas', '72 horas', '7 dias', '30 dias'], c: 0, exp: 'O art. 310 do CPP prevê a audiência de custódia em até 24 horas após a prisão.' },
      { p: 'O que é legítima defesa?', ops: ['Vingar-se de quem te ofendeu ontem', 'Repelir agressão injusta, atual ou iminente, com meios moderados', 'Defender-se com qualquer meio, sem limite', 'Um tipo de recurso no tribunal'], c: 1, exp: 'É a definição do art. 25 do Código Penal. Reagir com excesso ou depois que a agressão acabou não é legítima defesa.' },
      { p: 'Ao ser preso, a pessoa:', ops: ['É obrigada a confessar', 'Tem direito de permanecer calada', 'Perde o direito a advogado', 'Não pode avisar a família'], c: 1, exp: 'A CF, art. 5º, LXIII, garante ao preso o direito ao silêncio e à assistência da família e de advogado.' },
    ],
  },

  forum: {
    nome: 'Fórum', icone: '⚖️', area: 'Acesso à Justiça', cor: '#7B40E8',
    custo: 340, nivel: 2,
    efeito: { renda: 0, manutencao: 16, pop: 0, felicidade: 7 },
    servico: 'justica',
    aula: {
      resumo: 'Toda lesão ou ameaça a direito pode ser levada ao Judiciário — e há caminhos simples e gratuitos para isso.',
      pontos: [
        'A lei não pode impedir ninguém de levar seu problema ao Judiciário — inafastabilidade da jurisdição (CF, art. 5º, XXXV).',
        'Os Juizados Especiais Cíveis julgam causas de até 40 salários mínimos de forma simples e rápida (Lei 9.099/1995, art. 3º).',
        'Nos Juizados, em causas de até 20 salários mínimos, você pode entrar sem advogado (art. 9º).',
        'Quem não pode pagar tem direito à assistência jurídica gratuita, prestada pela Defensoria Pública (CF, arts. 5º, LXXIV e 134).',
      ],
      pratica: 'A loja não quer trocar um celular de R$ 1.500? Você pode ir sozinho ao Juizado Especial Cível e entrar com o pedido.',
    },
    licenca: [
      { p: 'Até qual valor de causa os Juizados Especiais Cíveis estaduais julgam?', ops: ['10 salários mínimos', '20 salários mínimos', '40 salários mínimos', 'Sem limite'], c: 2, exp: 'O art. 3º, I, da Lei 9.099/95 fixa o limite de 40 salários mínimos.' },
      { p: 'Em que situação é possível entrar no Juizado sem advogado?', ops: ['Nunca', 'Em causas de até 20 salários mínimos', 'Só se o réu concordar', 'Só em causas trabalhistas'], c: 1, exp: 'Pelo art. 9º da Lei 9.099/95, até 20 salários mínimos a assistência por advogado é facultativa.' },
      { p: 'Quem presta assistência jurídica gratuita a quem não pode pagar advogado?', ops: ['O Ministério Público', 'A Defensoria Pública', 'A Polícia Civil', 'O Procon'], c: 1, exp: 'A Defensoria Pública é a instituição incumbida da orientação jurídica e defesa dos necessitados (CF, art. 134).' },
    ],
  },

  camara: {
    nome: 'Câmara Municipal', icone: '🗳️', area: 'Processo Legislativo', cor: '#B8862B',
    custo: 280, nivel: 2, unico: true,
    efeito: { renda: 0, manutencao: 12, pop: 0, felicidade: 5 },
    aula: {
      resumo: 'Os vereadores fazem as leis da cidade; o prefeito as executa e pode sancionar ou vetar os projetos aprovados.',
      pontos: [
        'O município é regido por uma Lei Orgânica, votada em dois turnos e aprovada por 2/3 dos vereadores (CF, art. 29).',
        'Prefeito e vereadores têm mandato de 4 anos (CF, art. 29, I).',
        'Depois de aprovado pela Câmara, o projeto vai ao prefeito, que pode sancionar (concordar) ou vetar (discordar). O veto pode ser derrubado pelos vereadores.',
        'A Câmara também fiscaliza as contas do prefeito, com o auxílio do Tribunal de Contas (CF, art. 31).',
      ],
      pratica: 'Os vereadores aprovaram uma lei de horário do comércio? Ela só vale depois de sancionada (ou de o veto ser derrubado) e publicada.',
    },
    licenca: [
      { p: 'Qual a "constituição" de um município?', ops: ['O Código Civil', 'A Lei Orgânica Municipal', 'O Plano Diretor', 'O Regimento Interno'], c: 1, exp: 'O art. 29 da CF determina que o município se rege por lei orgânica.' },
      { p: 'O que o prefeito pode fazer com um projeto aprovado pela Câmara?', ops: ['Apenas publicar', 'Sancionar ou vetar', 'Mandar para o Senado', 'Nada, a lei já vale'], c: 1, exp: 'O chefe do Executivo participa do processo legislativo sancionando ou vetando o projeto; a Câmara pode derrubar o veto.' },
      { p: 'Quem fiscaliza as contas do prefeito?', ops: ['A Câmara, com auxílio do Tribunal de Contas', 'O próprio prefeito', 'A Polícia Federal', 'Ninguém'], c: 0, exp: 'CF, art. 31: a fiscalização do município é exercida pela Câmara, mediante controle externo, com auxílio dos Tribunais de Contas.' },
    ],
  },

  cartorio: {
    nome: 'Cartório', icone: '📜', area: 'Direito de Família e Registros', cor: '#C24B28',
    custo: 220, nivel: 2,
    efeito: { renda: 18, manutencao: 0, pop: 2, felicidade: 4 },
    aula: {
      resumo: 'Os cartórios dão segurança e publicidade a atos importantes da vida: nascimento, casamento, compra de imóveis.',
      pontos: [
        'O registro de nascimento e a primeira certidão são gratuitos para todos (Lei 9.534/1997; CF, art. 5º, LXXVI).',
        'A idade mínima para casar é 16 anos, com autorização dos pais até os 18; menores de 16 não podem casar em hipótese alguma (CC, arts. 1.517 e 1.520).',
        'A união estável é reconhecida como entidade familiar: convivência pública, contínua e duradoura com objetivo de constituir família (CC, art. 1.723).',
        'Divórcio consensual, sem filhos menores ou incapazes, pode ser feito direto no cartório, com advogado (CPC, art. 733).',
      ],
      pratica: 'Casal sem filhos menores quer se divorciar de comum acordo? Não precisa de processo: basta uma escritura no tabelionato, com advogado.',
    },
    licenca: [
      { p: 'Quanto custa o registro de nascimento?', ops: ['1 salário mínimo', 'Depende da cidade', 'É gratuito', 'R$ 100'], c: 2, exp: 'O registro civil de nascimento e a certidão de óbito são gratuitos (CF, art. 5º, LXXVI; Lei 9.534/97).' },
      { p: 'Uma pessoa de 15 anos pode se casar?', ops: ['Sim, com autorização dos pais', 'Sim, se estiver grávida', 'Não, em nenhuma hipótese', 'Sim, com autorização do juiz'], c: 2, exp: 'Desde a Lei 13.811/2019, o art. 1.520 do CC proíbe, em qualquer caso, o casamento de quem não atingiu 16 anos.' },
      { p: 'Divórcio consensual sem filhos menores pode ser feito onde?', ops: ['Só no Fórum', 'No cartório, por escritura pública, com advogado', 'Na prefeitura', 'Na igreja'], c: 1, exp: 'O art. 733 do CPC permite o divórcio consensual por escritura pública, com assistência de advogado ou defensor.' },
    ],
  },

  dados: {
    nome: 'Centro de Dados', icone: '💾', area: 'Proteção de Dados (LGPD)', cor: '#7B40E8',
    custo: 380, nivel: 3,
    efeito: { renda: 40, manutencao: 6, pop: 2, felicidade: 0 },
    aula: {
      resumo: 'A LGPD (Lei 13.709/2018) dá às pessoas controle sobre seus dados pessoais e impõe regras a quem os coleta.',
      pontos: [
        'Todo tratamento de dados precisa de uma base legal — o consentimento é uma delas, mas existem outras, como cumprir obrigação legal ou executar contrato (art. 7º).',
        'Dados sensíveis (saúde, religião, origem racial, biometria, opinião política, vida sexual...) têm proteção reforçada (art. 5º, II e art. 11).',
        'O titular pode pedir acesso, correção e eliminação dos seus dados (art. 18).',
        'Dados de crianças só podem ser tratados com consentimento específico de pelo menos um dos pais ou responsável (art. 14).',
        'A fiscalização é feita pela ANPD, e as multas podem chegar a 2% do faturamento, limitadas a R$ 50 milhões por infração (art. 52).',
      ],
      pratica: 'A farmácia pede seu CPF para dar desconto? Ela deve informar para que vai usar seus dados — e você pode pedir para ver ou apagar.',
    },
    licenca: [
      { p: 'Qual destes é um dado pessoal SENSÍVEL pela LGPD?', ops: ['Nome', 'Endereço', 'Informação sobre saúde', 'Placa do carro'], c: 2, exp: 'O art. 5º, II, lista como sensíveis dados de saúde, religião, origem racial, biometria, entre outros.' },
      { p: 'O consentimento é a única base legal para tratar dados?', ops: ['Sim, sempre', 'Não, a LGPD prevê outras bases, como cumprir obrigação legal', 'Só para empresas privadas', 'Só para dados sensíveis'], c: 1, exp: 'O art. 7º prevê dez bases legais; o consentimento é apenas uma delas.' },
      { p: 'Quem fiscaliza o cumprimento da LGPD?', ops: ['O Procon', 'A ANPD', 'A ANATEL', 'O Banco Central'], c: 1, exp: 'A Autoridade Nacional de Proteção de Dados (ANPD) é o órgão responsável.' },
    ],
  },

  terminal: {
    nome: 'Terminal de Ônibus', icone: '🚌', area: 'Trânsito, Idoso e Acessibilidade', cor: '#0D7896',
    custo: 260, nivel: 2,
    efeito: { renda: 8, manutencao: 10, pop: 0, felicidade: 6 },
    aula: {
      resumo: 'A cidade deve ser segura e acessível para todos: pedestres, idosos e pessoas com deficiência.',
      pontos: [
        'Dirigir sob influência de álcool é infração gravíssima: multa multiplicada por 10 e suspensão do direito de dirigir por 12 meses (CTB, art. 165). Recusar o bafômetro tem a mesma punição (art. 165-A).',
        'Na faixa de pedestres sem semáforo, o pedestre tem preferência (CTB, art. 70).',
        'Maiores de 65 anos têm transporte coletivo urbano gratuito (Estatuto da Pessoa Idosa, Lei 10.741/2003, art. 39).',
        'Estacionamentos devem reservar 5% das vagas a idosos (Estatuto da Pessoa Idosa, art. 41) e 2% a pessoas com deficiência (Lei Brasileira de Inclusão, Lei 13.146/2015, art. 47).',
        'Discriminar pessoa em razão de sua deficiência é crime (LBI, art. 88).',
      ],
      pratica: 'Um senhor de 66 anos quer embarcar sem pagar no ônibus urbano? É direito dele — basta apresentar documento com a idade.',
    },
    licenca: [
      { p: 'A partir de que idade o transporte coletivo urbano é gratuito?', ops: ['60 anos', '65 anos', '70 anos', '75 anos'], c: 1, exp: 'Art. 39 do Estatuto da Pessoa Idosa (Lei 10.741/2003) e art. 230, §2º, da CF.' },
      { p: 'Recusar o teste do bafômetro:', ops: ['Não gera punição', 'Tem as mesmas penalidades de dirigir alcoolizado', 'Gera só advertência', 'É crime com prisão automática'], c: 1, exp: 'O art. 165-A do CTB pune a recusa com as mesmas penalidades do art. 165: multa x10 e suspensão por 12 meses.' },
      { p: 'Qual percentual das vagas de estacionamento é reservado a pessoas com deficiência?', ops: ['1%', '2%', '5%', '10%'], c: 1, exp: 'O art. 47 da Lei Brasileira de Inclusão reserva 2% das vagas (garantida no mínimo uma). Para idosos, são 5%.' },
    ],
  },

  fazenda: {
    nome: 'Secretaria da Fazenda', icone: '💰', area: 'Direito Tributário', cor: '#9A7208',
    custo: 360, nivel: 3, unico: true,
    efeito: { renda: 0, manutencao: 10, pop: 0, felicidade: 0 },
    bonus: 'Aumenta em 20% a arrecadação de impostos da cidade.',
    aula: {
      resumo: 'Tributo só pode ser criado ou aumentado por lei, e cada ente da federação tem seus próprios impostos.',
      pontos: [
        'O município pode instituir IPTU (imóveis urbanos), ITBI (transmissão de imóveis) e ISS (serviços) (CF, art. 156).',
        'Nenhum tributo pode ser criado ou aumentado sem lei — princípio da legalidade tributária (CF, art. 150, I).',
        'Anterioridade: em regra, o tributo criado ou aumentado só pode ser cobrado no ano seguinte e após 90 dias da publicação da lei (CF, art. 150, III, "b" e "c").',
        'Templos, partidos políticos, sindicatos de trabalhadores e entidades de educação e assistência sem fins lucrativos têm imunidade de impostos sobre seu patrimônio, renda e serviços (CF, art. 150, VI).',
        'O gestor não pode gastar mais do que arrecada: a Lei de Responsabilidade Fiscal (LC 101/2000) impõe limites e transparência nas contas.',
      ],
      pratica: 'O prefeito quer aumentar o IPTU por decreto em dezembro para cobrar em janeiro? Não pode: precisa de lei e deve respeitar a anterioridade.',
    },
    licenca: [
      { p: 'Qual destes impostos é municipal?', ops: ['IPVA', 'Imposto de Renda', 'IPTU', 'ICMS'], c: 2, exp: 'IPTU, ITBI e ISS são municipais (CF, art. 156). IPVA e ICMS são estaduais; o IR é federal.' },
      { p: 'O prefeito pode aumentar um imposto por decreto?', ops: ['Sim, sempre', 'Não, é preciso lei', 'Só em ano eleitoral', 'Sim, se a Câmara não se opuser em 10 dias'], c: 1, exp: 'Princípio da legalidade tributária: CF, art. 150, I.' },
      { p: 'Uma igreja deve pagar IPTU sobre o templo?', ops: ['Sim, como todos', 'Não, templos de qualquer culto têm imunidade', 'Só metade', 'Só se tiver estacionamento'], c: 1, exp: 'O art. 150, VI, "b", da CF garante imunidade aos templos de qualquer culto (e a EC 116/2022 estendeu ao IPTU de imóveis alugados para o templo).' },
    ],
  },

  banco: {
    nome: 'Banco', icone: '🏦', area: 'Direito Bancário', cor: '#1F6F8B',
    custo: 340, nivel: 2,
    efeito: { renda: 36, manutencao: 0, pop: 0, felicidade: 1 },
    aula: {
      resumo: 'Banco também é fornecedor: o cliente é consumidor e tem a proteção do CDC.',
      pontos: [
        'O Código de Defesa do Consumidor se aplica às instituições financeiras (Súmula 297 do STJ).',
        'Bancos respondem pelos danos de fraudes praticadas por terceiros em operações bancárias, como golpes com cartão clonado — é risco da atividade (Súmula 479 do STJ).',
        'Quem cobra dívida indevida e recebe deve devolver em dobro o que foi pago a mais, salvo engano justificável (CDC, art. 42, parágrafo único).',
        'A Lei do Superendividamento (Lei 14.181/2021) permite ao consumidor endividado renegociar todas as dívidas num plano de pagamento, preservando o mínimo existencial (CDC, arts. 54-A e 104-A).',
      ],
      pratica: 'Apareceu no extrato um empréstimo que você nunca fez? O banco deve cancelar, devolver o que foi descontado e pode ter de indenizar.',
    },
    licenca: [
      { p: 'O Código de Defesa do Consumidor vale para bancos?', ops: ['Não, bancos têm lei própria e só ela vale', 'Sim, conforme a Súmula 297 do STJ', 'Só para contas-salário', 'Só para bancos públicos'], c: 1, exp: 'A Súmula 297 do STJ diz que o CDC é aplicável às instituições financeiras.' },
      { p: 'Um golpista clonou o cartão do cliente e fez compras. Em regra, quem responde?', ops: ['Só o cliente', 'O banco, pois fraude de terceiros é risco da atividade bancária', 'A loja onde a compra foi feita', 'Ninguém'], c: 1, exp: 'Súmula 479 do STJ: as instituições financeiras respondem objetivamente por danos de fraudes e delitos de terceiros no âmbito das operações bancárias.' },
      { p: 'Qual lei protege quem está com dívidas impagáveis, permitindo um plano de pagamento?', ops: ['Lei do Superendividamento (Lei 14.181/2021)', 'Lei de Falências', 'Lei do Inquilinato', 'Código Penal'], c: 0, exp: 'A Lei 14.181/2021 incluiu no CDC regras de prevenção e tratamento do superendividamento.' },
    ],
  },

  inss: {
    nome: 'Agência do INSS', icone: '🧓', area: 'Direito Previdenciário', cor: '#1F4E9A',
    custo: 300, nivel: 2,
    efeito: { renda: 0, manutencao: 14, pop: 0, felicidade: 6 },
    aula: {
      resumo: 'A Previdência protege quem contribui contra riscos como idade avançada, doença e morte; a Assistência Social ampara quem precisa, mesmo sem contribuir.',
      pontos: [
        'A Previdência Social é contributiva: quem contribui (empregado, autônomo, MEI...) tem direito a aposentadoria, auxílio por incapacidade, pensão e outros benefícios (CF, art. 201).',
        'Após a Reforma da Previdência (EC 103/2019), a aposentadoria urbana exige, em regra, 65 anos para homens e 62 para mulheres, além de tempo mínimo de contribuição (CF, art. 201, §7º, I).',
        'O auxílio por incapacidade temporária exige, em regra, 12 contribuições de carência — dispensadas em caso de acidente (Lei 8.213/1991, arts. 25 e 26).',
        'O BPC/LOAS paga 1 salário mínimo a idosos a partir de 65 anos e a pessoas com deficiência de baixa renda, mesmo sem contribuição (CF, art. 203, V; Lei 8.742/1993, art. 20).',
      ],
      pratica: 'Dona Maria tem 66 anos, nunca contribuiu e vive com renda muito baixa? Ela pode ter direito ao BPC, que é assistencial.',
    },
    licenca: [
      { p: 'Após a EC 103/2019, qual a idade mínima, em regra, para a aposentadoria urbana da mulher?', ops: ['55 anos', '60 anos', '62 anos', '65 anos'], c: 2, exp: 'CF, art. 201, §7º, I: 65 anos para homens e 62 para mulheres, com tempo mínimo de contribuição.' },
      { p: 'O BPC/LOAS exige contribuição ao INSS?', ops: ['Sim, 15 anos', 'Sim, 5 anos', 'Não, é benefício assistencial para quem tem baixa renda', 'Só para servidores públicos'], c: 2, exp: 'O BPC é assistencial (CF, art. 203, V): independe de contribuição, mas exige critérios de renda e idade ou deficiência.' },
      { p: 'Um trabalhador com 2 meses de contribuição sofreu acidente e ficou afastado. Ele precisa cumprir a carência de 12 meses?', ops: ['Sim, sempre', 'Não, em caso de acidente a carência é dispensada', 'Só se for acidente de trânsito', 'Ele não tem direito a nada'], c: 1, exp: 'O art. 26, II, da Lei 8.213/91 dispensa a carência do auxílio por incapacidade decorrente de acidente de qualquer natureza.' },
    ],
  },

  condominio: {
    nome: 'Condomínio', icone: '🏙️', area: 'Direito Condominial', cor: '#6C7A89',
    custo: 300, nivel: 1,
    efeito: { renda: 28, manutencao: 0, pop: 16, felicidade: 0 },
    aula: {
      resumo: 'No condomínio, cada um é dono da sua unidade e todos dividem as áreas comuns, seguindo o Código Civil e a convenção.',
      pontos: [
        'O condomínio edilício é regido pelo Código Civil (arts. 1.331 a 1.358), pela convenção e pelo regimento interno.',
        'A multa por atraso da taxa condominial é de no máximo 2%, mais juros (CC, art. 1.336, §1º).',
        'O síndico é eleito em assembleia, com mandato de até 2 anos, que pode ser renovado (CC, art. 1.347).',
        'O condômino com comportamento antissocial reiterado pode ser multado em até 10 vezes a taxa condominial, por deliberação da assembleia (CC, art. 1.337, parágrafo único).',
        'A convenção não pode proibir de forma genérica animais de estimação que não tragam risco ou incômodo (STJ, REsp 1.783.076/DF).',
      ],
      pratica: 'O condomínio quer cobrar 10% de multa pelo boleto atrasado? Não pode: o limite legal é 2%, mais juros.',
    },
    licenca: [
      { p: 'Qual a multa máxima por atraso na taxa de condomínio?', ops: ['2%', '10%', '20%', 'Não há limite'], c: 0, exp: 'CC, art. 1.336, §1º: multa de até 2% sobre o débito, além dos juros.' },
      { p: 'Qual o mandato máximo do síndico?', ops: ['6 meses', '1 ano', '2 anos, renovável', '5 anos'], c: 2, exp: 'CC, art. 1.347: mandato não superior a dois anos, o qual poderá renovar-se.' },
      { p: 'A convenção pode proibir qualquer animal de estimação, mesmo um gato que não incomoda ninguém?', ops: ['Sim, a convenção manda', 'Não, a proibição genérica é inválida, segundo o STJ', 'Só se o síndico quiser', 'Só em prédios novos'], c: 1, exp: 'O STJ (REsp 1.783.076/DF) entendeu que a proibição genérica de animais que não causam risco ou incômodo é desarrazoada.' },
    ],
  },

  templo: {
    nome: 'Templo', icone: '🛐', area: 'Liberdade Religiosa', cor: '#8E6CB0',
    custo: 200, nivel: 1,
    efeito: { renda: 0, manutencao: 0, pop: 0, felicidade: 6 },
    aula: {
      resumo: 'O Brasil é um Estado laico: todas as crenças são livres e o poder público não pode favorecer nem perseguir nenhuma.',
      pontos: [
        'É inviolável a liberdade de consciência e de crença, garantido o livre exercício dos cultos (CF, art. 5º, VI).',
        'O poder público não pode estabelecer cultos, subvencioná-los, embaraçar seu funcionamento ou manter com eles aliança (CF, art. 19, I).',
        'Templos de qualquer culto têm imunidade de impostos (CF, art. 150, VI, "b").',
        'O estudante pode pedir prestação alternativa quando a prova cair em dia de guarda religiosa (Lei 9.394/1996, art. 7º-A, incluído pela Lei 13.796/2019).',
        'Praticar, induzir ou incitar discriminação por religião é crime (Lei 7.716/1989, art. 20).',
      ],
      pratica: 'O prefeito quer usar dinheiro público para pintar só a igreja que ele frequenta? Não pode: o Estado é laico (CF, art. 19, I).',
    },
    licenca: [
      { p: 'O que significa dizer que o Brasil é um Estado laico?', ops: ['Que a religião é proibida', 'Que o Estado não adota nem favorece nenhuma religião, e todas são livres', 'Que existe uma religião oficial', 'Que só templos registrados podem funcionar'], c: 1, exp: 'CF, art. 19, I: é vedado ao poder público estabelecer cultos, subvencioná-los ou embaraçar seu funcionamento.' },
      { p: 'Ofender e discriminar alguém por causa de sua religião é:', ops: ['Liberdade de expressão sempre', 'Crime previsto na Lei 7.716/1989', 'Apenas falta de educação', 'Infração de trânsito'], c: 1, exp: 'O art. 20 da Lei 7.716/89 pune quem pratica, induz ou incita discriminação por religião.' },
      { p: 'Um aluno guarda o sábado por religião e a prova foi marcada nesse dia. O que a lei prevê?', ops: ['Ele perde a prova', 'Pode pedir prestação alternativa', 'A escola deve cancelar a prova para todos', 'Nada'], c: 1, exp: 'A Lei 13.796/2019 incluiu o art. 7º-A na LDB, garantindo prestação alternativa ao aluno.' },
    ],
  },

  empresa: {
    nome: 'Escritórios', icone: '🏢', area: 'Direito Empresarial', cor: '#2B6CB0',
    custo: 420, nivel: 3,
    efeito: { renda: 55, manutencao: 0, pop: 2, felicidade: 0 },
    aula: {
      resumo: 'O Direito Empresarial organiza a vida das empresas: como abrir, como os sócios respondem pelas dívidas e o que fazer numa crise.',
      pontos: [
        'Empresário é quem exerce profissionalmente atividade econômica organizada para produzir ou fazer circular bens ou serviços (CC, art. 966).',
        'É obrigatória a inscrição na Junta Comercial antes de começar a atividade (CC, art. 967).',
        'Na sociedade limitada, cada sócio responde até o valor de suas quotas; desde 2019 ela pode ter um único sócio (CC, art. 1.052).',
        'Se houver abuso — desvio de finalidade ou confusão entre o patrimônio da empresa e o dos sócios — o juiz pode atingir os bens dos sócios: é a desconsideração da personalidade jurídica (CC, art. 50).',
        'Empresa em crise pode pedir recuperação judicial para renegociar dívidas e evitar a falência (Lei 11.101/2005).',
      ],
      pratica: 'O sócio pagava a reforma da própria casa com a conta da empresa e deixou dívidas? O juiz pode alcançar os bens pessoais dele (CC, art. 50).',
    },
    licenca: [
      { p: 'Na sociedade limitada, até quanto o sócio responde pelas dívidas da empresa, em regra?', ops: ['Por todas, com todos os seus bens', 'Até o valor de suas quotas', 'Só por metade', 'Não responde por nada nunca'], c: 1, exp: 'CC, art. 1.052: a responsabilidade de cada sócio é restrita ao valor de suas quotas (todos respondem solidariamente pela integralização do capital).' },
      { p: 'Onde o empresário deve se registrar antes de começar?', ops: ['No cartório de imóveis', 'Na Junta Comercial', 'Na delegacia', 'Na Câmara Municipal'], c: 1, exp: 'CC, art. 967: é obrigatória a inscrição no Registro Público de Empresas Mercantis (Junta Comercial).' },
      { p: 'Qual instrumento ajuda a empresa em crise a negociar dívidas e continuar funcionando?', ops: ['Usucapião', 'Recuperação judicial', 'Habeas corpus', 'Mandado de segurança'], c: 1, exp: 'A recuperação judicial (Lei 11.101/2005) busca viabilizar a superação da crise e preservar a empresa e os empregos.' },
    ],
  },

  bombeiros: {
    nome: 'Bombeiros', icone: '🚒', area: 'Prevenção e Defesa Civil', cor: '#D32F2F',
    custo: 320, nivel: 2,
    efeito: { renda: 0, manutencao: 15, pop: 0, felicidade: 6 },
    servico: 'seguranca',
    bonus: 'Reduz os estragos dos temporais.',
    aula: {
      resumo: 'Prevenir é a melhor proteção: locais com público precisam de regras contra incêndio, e o município deve cuidar das áreas de risco.',
      pontos: [
        'A Lei Kiss (Lei 13.425/2017) traz normas de prevenção e combate a incêndio em estabelecimentos e locais de reunião de público, com vistoria e licenciamento.',
        'A Política Nacional de Proteção e Defesa Civil (Lei 12.608/2012) organiza prevenção, preparação, resposta e recuperação em desastres.',
        'Cabe ao município identificar e mapear as áreas de risco, fiscalizá-las e vedar novas ocupações nelas (Lei 12.608/2012, art. 8º).',
        'Deixar de prestar socorro, quando possível fazê-lo sem risco pessoal, a quem está em perigo é crime de omissão de socorro (CP, art. 135).',
      ],
      pratica: 'A boate quer abrir no sábado sem a vistoria de prevenção de incêndio? Não pode: locais de reunião de público precisam estar regularizados.',
    },
    licenca: [
      { p: 'A Lei Kiss (Lei 13.425/2017) trata de quê?', ops: ['Direito de família', 'Prevenção e combate a incêndio em locais com público', 'Imposto de renda', 'Trânsito'], c: 1, exp: 'A lei foi criada após a tragédia da boate Kiss (2013) e estabelece diretrizes de prevenção a incêndio em locais de reunião de público.' },
      { p: 'Quem deve mapear áreas de risco de deslizamento e enchente na cidade?', ops: ['Só a União', 'O município, com apoio do Estado e da União', 'As empresas privadas', 'Ninguém'], c: 1, exp: 'Lei 12.608/2012, art. 8º: compete aos municípios identificar e mapear áreas de risco e vedar novas ocupações nelas.' },
      { p: 'Ver alguém ferido e ir embora sem ajudar nem chamar socorro, podendo fazê-lo sem risco, é:', ops: ['Permitido', 'Crime de omissão de socorro', 'Só falta de educação', 'Infração administrativa leve'], c: 1, exp: 'CP, art. 135. Ligar para o socorro (192/193) já é uma forma de prestar assistência.' },
    ],
  },

  ecoponto: {
    nome: 'Ecoponto', icone: '♻️', area: 'Resíduos Sólidos', cor: '#2E9E4F',
    custo: 220, nivel: 1,
    efeito: { renda: 6, manutencao: 8, pop: 0, felicidade: 5 },
    aula: {
      resumo: 'Lixo é responsabilidade de todos: quem fabrica, quem vende, quem consome e o poder público.',
      pontos: [
        'A Política Nacional de Resíduos Sólidos (Lei 12.305/2010) cria a responsabilidade compartilhada pelo ciclo de vida dos produtos (art. 30).',
        'Logística reversa: fabricantes e comerciantes de pilhas, baterias, pneus, óleos lubrificantes, lâmpadas e eletroeletrônicos devem receber esses produtos de volta após o uso (art. 33).',
        'A ordem de prioridade é: não gerar, reduzir, reutilizar, reciclar, tratar e, por último, dar destinação final adequada (art. 9º).',
        'É proibido lançar resíduos a céu aberto — os lixões (art. 47, II) — e a lei incentiva a integração de catadores em cooperativas.',
        'Cores da coleta seletiva: azul papel, vermelho plástico, verde vidro, amarelo metal e marrom orgânico (Resolução CONAMA 275/2001).',
      ],
      pratica: 'Pilhas velhas não vão no lixo comum: devolva no comércio que vende pilhas, que é obrigado a recebê-las (logística reversa).',
    },
    licenca: [
      { p: 'Onde descartar corretamente pilhas e baterias usadas?', ops: ['No lixo comum', 'No rio', 'Nos pontos de coleta do comércio/fabricantes (logística reversa)', 'Enterrar no quintal'], c: 2, exp: 'Lei 12.305/2010, art. 33: pilhas e baterias estão sujeitas à logística reversa.' },
      { p: 'Qual a primeira prioridade na gestão de resíduos?', ops: ['Reciclar', 'Não gerar', 'Queimar', 'Aterrar'], c: 1, exp: 'Art. 9º: não geração, redução, reutilização, reciclagem, tratamento e disposição final adequada, nessa ordem.' },
      { p: 'Na coleta seletiva, o vidro vai em qual cor de lixeira?', ops: ['Azul', 'Vermelha', 'Verde', 'Amarela'], c: 2, exp: 'Resolução CONAMA 275/2001: verde para vidro (azul papel, vermelho plástico, amarelo metal, marrom orgânico).' },
    ],
  },

  cultura: {
    nome: 'Centro Cultural', icone: '🎭', area: 'Direitos Autorais', cor: '#C2185B',
    custo: 280, nivel: 2,
    efeito: { renda: 4, manutencao: 10, pop: 0, felicidade: 8 },
    aula: {
      resumo: 'Músicas, livros, filmes e fotos têm dono: o autor decide como sua obra pode ser usada — por um tempo limitado.',
      pontos: [
        'A Lei 9.610/1998 protege as obras intelectuais, como músicas, textos, filmes, fotografias e obras de arte.',
        'Os direitos patrimoniais duram toda a vida do autor e mais 70 anos, contados de 1º de janeiro do ano seguinte à sua morte; depois, a obra cai em domínio público (art. 41).',
        'Tocar músicas em locais de frequência coletiva — festas, lojas, academias, eventos públicos — exige autorização e pagamento ao ECAD (arts. 68 e 99).',
        'É livre citar trechos de obras para estudo, crítica ou polêmica, indicando o autor e a origem (art. 46, III).',
        'Paródias e paráfrases são livres, desde que não sejam reproduções da obra original nem a desacreditem (art. 47).',
      ],
      pratica: 'Quer encenar um texto de Machado de Assis, que morreu em 1908? Pode: a obra já está em domínio público.',
    },
    licenca: [
      { p: 'Por quanto tempo, após a morte do autor, a obra continua protegida?', ops: ['10 anos', '30 anos', '70 anos', 'Para sempre'], c: 2, exp: 'Lei 9.610/98, art. 41: 70 anos contados de 1º de janeiro do ano subsequente ao falecimento.' },
      { p: 'Uma festa aberta ao público vai tocar músicas de sucesso. O que é necessário?', ops: ['Nada, música é livre', 'Autorização e recolhimento ao ECAD', 'Registro na Junta Comercial', 'Autorização da polícia'], c: 1, exp: 'Arts. 68 e 99 da Lei 9.610/98: execução pública em locais de frequência coletiva depende de autorização, e a arrecadação é feita pelo ECAD.' },
      { p: 'Citar um trecho de um livro num trabalho escolar, com o nome do autor, é:', ops: ['Proibido', 'Permitido (direito de citação)', 'Crime', 'Só com autorização escrita'], c: 1, exp: 'Art. 46, III: é permitida a citação para fins de estudo, crítica ou polêmica, indicando o autor e a origem.' },
    ],
  },

  /* ── Enfeites: sem licença, baratos, ajudam a felicidade (bônus total limitado) ── */
  arvore: {
    nome: 'Árvore', icone: '🌳', area: 'Enfeite', cor: '#2E7D4F', cat: 'enfeite',
    custo: 15, nivel: 0, efeito: { renda: 0, manutencao: 0, pop: 0, felicidade: 1 },
  },
  canteiro: {
    nome: 'Canteiro de flores', icone: '🌷', area: 'Enfeite', cor: '#E86FB0', cat: 'enfeite',
    custo: 25, nivel: 0, efeito: { renda: 0, manutencao: 0, pop: 0, felicidade: 1 },
  },
  praca: {
    nome: 'Praça', icone: '⛲', area: 'Enfeite', cor: '#8D6E63', cat: 'enfeite',
    custo: 80, nivel: 0, efeito: { renda: 0, manutencao: 2, pop: 0, felicidade: 3 },
  },
  ruaLocal: {
    nome: 'Rua', icone: '🛣️', area: 'Infraestrutura', cor: '#4E5663', cat: 'enfeite',
    custo: 25, nivel: 0, efeito: { renda: 0, manutencao: 0, pop: 0, felicidade: 0 },
    bonus: 'Prédios colados na rua rendem +20%.',
  },
  /* ── Infraestrutura e saneamento ── */
  estacaoAgua: {
    nome: 'Estação de Água', icone: '💧', area: 'Saneamento: Água Potável', cor: '#1E88E5',
    custo: 300, nivel: 1,
    efeito: { renda: 0, manutencao: 12, pop: 0, felicidade: 5 },
    servico: 'agua',
    aula: {
      resumo: 'Água tratada na torneira é saneamento básico — e o Novo Marco do Saneamento fixou metas para levá-la a quase todos até 2033.',
      pontos: [
        'Saneamento básico reúne abastecimento de água, esgotamento sanitário, limpeza urbana e manejo de resíduos, e drenagem das águas da chuva (Lei 11.445/2007, art. 3º, I).',
        'O Novo Marco do Saneamento (Lei 14.026/2020) fixou a meta de garantir, até 31/12/2033, água potável a 99% da população e coleta e tratamento de esgoto a 90% (Lei 11.445/2007, art. 11-B).',
        'O município é o titular do serviço de interesse local; se uma empresa de fora da administração for prestar o serviço, é preciso contrato de concessão precedido de licitação (Lei 11.445/2007, arts. 8º e 10).',
        'A água é bem de domínio público e recurso natural limitado, dotado de valor econômico (Lei 9.433/1997, art. 1º).',
        'Concessionárias de serviços essenciais devem prestá-los de forma adequada, eficiente, segura e contínua (CDC, art. 22).',
      ],
      pratica: 'A água da torneira está saindo turva há dias? O serviço é essencial e deve ser adequado e seguro: o consumidor pode reclamar com base no CDC (art. 22).',
    },
    licenca: [
      { p: 'Qual a meta do Novo Marco do Saneamento para água potável até 2033?', ops: ['50% da população', '75% da população', '99% da população', 'Não há meta'], c: 2, exp: 'Lei 11.445/2007, art. 11-B (incluído pela Lei 14.026/2020): 99% com água potável e 90% com coleta e tratamento de esgoto até 31/12/2033.' },
      { p: 'Quem é o titular do serviço de saneamento de interesse local?', ops: ['A União', 'O município', 'O bairro', 'A empresa que instalar os canos'], c: 1, exp: 'Lei 11.445/2007, art. 8º: os municípios e o Distrito Federal são titulares dos serviços públicos de saneamento básico de interesse local.' },
      { p: 'Drenagem das águas da chuva faz parte do saneamento básico?', ops: ['Sim', 'Não, é só água e esgoto', 'Só em capitais', 'Só no verão'], c: 0, exp: 'Lei 11.445/2007, art. 3º, I, "d": drenagem e manejo das águas pluviais urbanas integram o saneamento básico.' },
    ],
  },

  esgoto: {
    nome: 'Estação de Esgoto', icone: '🚽', area: 'Saneamento: Esgoto', cor: '#6D8B3A',
    custo: 320, nivel: 1,
    efeito: { renda: 0, manutencao: 14, pop: 0, felicidade: 5 },
    servico: 'esgoto',
    aula: {
      resumo: 'Esgoto precisa ser coletado e tratado antes de voltar à natureza — isso protege a saúde e os rios.',
      pontos: [
        'Esgotamento sanitário é a coleta, o transporte, o tratamento e a destinação final adequada dos esgotos (Lei 11.445/2007, art. 3º, I, "b").',
        'Onde houver rede pública de esgoto, toda edificação deve se ligar a ela, e o usuário paga as tarifas do serviço (Lei 11.445/2007, art. 45).',
        'Enquanto não houver rede, admitem-se soluções individuais, como fossas, seguindo as normas sanitárias e ambientais (art. 45, §1º).',
        'Lançar esgoto sem tratamento em rios pode configurar crime de poluição (Lei 9.605/1998, art. 54).',
        'Meta do Novo Marco: 90% da população com coleta e tratamento de esgoto até 2033 (art. 11-B).',
      ],
      pratica: 'A rede de esgoto chegou à sua rua? A casa deve ser ligada a ela; jogar esgoto no córrego pode ser crime ambiental.',
    },
    licenca: [
      { p: 'A rede pública de esgoto chegou à rua. O morador pode continuar jogando o esgoto no córrego?', ops: ['Pode, a casa é dele', 'Não: deve ligar-se à rede, e poluir o rio pode ser crime', 'Pode, se pagar uma taxa', 'Só à noite'], c: 1, exp: 'Lei 11.445/2007, art. 45: as edificações devem se conectar à rede pública disponível. Lançar esgoto em rio pode configurar o crime do art. 54 da Lei 9.605/98.' },
      { p: 'Qual a meta de coleta e tratamento de esgoto até 2033?', ops: ['30%', '60%', '90%', '100%'], c: 2, exp: 'Lei 11.445/2007, art. 11-B: 90% da população com coleta e tratamento de esgoto até 31/12/2033.' },
      { p: 'Onde ainda não existe rede de esgoto, o que a lei admite?', ops: ['Nada, a casa deve ser demolida', 'Soluções individuais, como fossas, seguindo as normas', 'Jogar no rio', 'Enterrar o esgoto em qualquer lugar'], c: 1, exp: 'Lei 11.445/2007, art. 45, §1º: na ausência de redes públicas, são admitidas soluções individuais, observadas as normas.' },
    ],
  },

  usina: {
    nome: 'Usina Solar', icone: '🔆', area: 'Energia e Geração Distribuída', cor: '#F2B705',
    custo: 360, nivel: 2,
    efeito: { renda: 12, manutencao: 6, pop: 0, felicidade: 3 },
    servico: 'energia',
    aula: {
      resumo: 'Energia elétrica é serviço federal regulado pela ANEEL — mas hoje qualquer consumidor pode gerar a própria energia limpa.',
      pontos: [
        'Compete à União explorar os serviços de energia elétrica, diretamente ou por concessão, e legislar sobre energia (CF, arts. 21, XII, "b" e 22, IV).',
        'A ANEEL regula e fiscaliza o setor elétrico (Lei 9.427/1996).',
        'O Marco Legal da Geração Distribuída (Lei 14.300/2022) permite gerar a própria energia — como em telhados solares — e transformar o excedente em créditos na conta de luz.',
        'Energia é serviço essencial: deve ser prestada de forma adequada e contínua (CDC, art. 22; Lei 8.987/1995, art. 6º).',
        'A concessionária responde pelos danos que causar, como aparelhos queimados por oscilação na rede (CF, art. 37, §6º).',
      ],
      pratica: 'Instalou placas solares e sobrou energia no mês? O excedente vira crédito para abater nas próximas contas (Lei 14.300/2022).',
    },
    licenca: [
      { p: 'Quem regula e fiscaliza o setor de energia elétrica?', ops: ['A prefeitura', 'A ANEEL', 'O Procon', 'O Detran'], c: 1, exp: 'A Agência Nacional de Energia Elétrica foi criada pela Lei 9.427/1996 para regular e fiscalizar o setor.' },
      { p: 'O que acontece com a energia que sobra de um telhado solar?', ops: ['Se perde', 'Vira crédito para abater na conta de luz', 'Deve ser paga à concessionária', 'É proibido gerar energia em casa'], c: 1, exp: 'Pelo Sistema de Compensação de Energia Elétrica (Lei 14.300/2022), a energia injetada na rede gera créditos.' },
      { p: 'O município pode fazer uma lei fixando o preço da conta de luz?', ops: ['Sim', 'Não: legislar sobre energia é competência da União', 'Só se a Câmara aprovar por unanimidade', 'Sim, no verão'], c: 1, exp: 'CF, art. 22, IV: compete privativamente à União legislar sobre energia. As tarifas são definidas pela ANEEL.' },
    ],
  },

  iluminacao: {
    nome: 'Iluminação Pública', icone: '💡', area: 'Iluminação Pública', cor: '#FFB300',
    custo: 60, nivel: 0,
    efeito: { renda: 0, manutencao: 2, pop: 0, felicidade: 2 },
    aula: {
      resumo: 'Os postes de luz das ruas são responsabilidade do município, que pode cobrar uma contribuição para custeá-los.',
      pontos: [
        'A iluminação pública é um serviço de interesse local, a cargo do município (CF, art. 30, V).',
        'Para custeá-la, municípios podem instituir a contribuição de iluminação pública (COSIP ou CIP), que pode ser cobrada na fatura de energia (CF, art. 149-A).',
        'Esse serviço não pode ser cobrado por meio de taxa (Súmula Vinculante 41 do STF), porque beneficia a todos de forma indivisível.',
        'Ruas bem iluminadas aumentam a segurança de pedestres e motoristas.',
      ],
      pratica: 'Viu a "contribuição de iluminação pública" na sua conta de luz? Ela é constitucional (CF, art. 149-A) e paga os postes da cidade.',
    },
    licenca: [
      { p: 'O município pode criar uma "taxa de iluminação pública"?', ops: ['Sim', 'Não: a Súmula Vinculante 41 proíbe; ele pode instituir a contribuição do art. 149-A', 'Só em ano eleitoral', 'Só para comércios'], c: 1, exp: 'Súmula Vinculante 41: o serviço de iluminação pública não pode ser remunerado mediante taxa. A EC 39/2002 criou a contribuição do art. 149-A.' },
      { p: 'A contribuição de iluminação pública pode vir na conta de luz?', ops: ['Não, é ilegal', 'Sim, a Constituição permite', 'Só com autorização do STF', 'Só para empresas'], c: 1, exp: 'CF, art. 149-A, parágrafo único: é facultada a cobrança da contribuição na fatura de consumo de energia elétrica.' },
      { p: 'Quem é responsável pelos postes de luz das ruas da cidade?', ops: ['O governo federal', 'O município', 'Os moradores', 'A polícia'], c: 1, exp: 'A iluminação pública é serviço de interesse local, de responsabilidade municipal (CF, art. 30, V).' },
    ],
  },

  telecom: {
    nome: 'Torre de Telecom', icone: '📡', area: 'Internet e Telecomunicações', cor: '#5C6BC0',
    custo: 280, nivel: 2,
    efeito: { renda: 14, manutencao: 4, pop: 0, felicidade: 4 },
    aula: {
      resumo: 'Internet é essencial para a cidadania, e o Marco Civil da Internet garante direitos a quem se conecta.',
      pontos: [
        'O Marco Civil da Internet (Lei 12.965/2014) reconhece o acesso à internet como essencial ao exercício da cidadania (art. 7º).',
        'Neutralidade de rede: o provedor deve tratar todos os dados de forma isonômica, sem distinção por conteúdo, origem, destino ou aplicativo (art. 9º).',
        'O usuário tem direito à não suspensão da conexão, salvo por débito decorrente da própria utilização (art. 7º, IV).',
        'Provedores de conexão guardam os registros de conexão por 1 ano, em sigilo; a entrega depende de ordem judicial (arts. 10 e 13).',
        'A Lei Geral das Antenas (Lei 13.116/2015) simplifica o licenciamento de torres e antenas de telecomunicações.',
      ],
      pratica: 'A operadora deixou os vídeos de um aplicativo mais lentos que os de outro? Isso viola a neutralidade de rede (art. 9º).',
    },
    licenca: [
      { p: 'O que é neutralidade de rede?', ops: ['Internet grátis para todos', 'Tratar todos os dados de forma igual, sem privilegiar conteúdos ou aplicativos', 'Proibir redes sociais', 'Internet só para órgãos públicos'], c: 1, exp: 'Marco Civil da Internet, art. 9º: dever de tratamento isonômico dos pacotes de dados.' },
      { p: 'Por quanto tempo o provedor de conexão guarda os registros de conexão?', ops: ['1 mês', '1 ano', '10 anos', 'Para sempre'], c: 1, exp: 'Lei 12.965/2014, art. 13: registros de conexão mantidos sob sigilo pelo prazo de 1 ano.' },
      { p: 'A polícia pode obter os registros de conexão de alguém só pedindo à operadora?', ops: ['Sim, sempre', 'Não, em regra depende de ordem judicial', 'Sim, se for de madrugada', 'Só a Receita Federal pode'], c: 1, exp: 'Marco Civil, art. 10, §1º: a disponibilização dos registros só ocorre mediante ordem judicial.' },
    ],
  },

  piscinao: {
    nome: 'Piscinão', icone: '🌀', area: 'Drenagem Urbana', cor: '#00897B',
    custo: 300, nivel: 2,
    efeito: { renda: 0, manutencao: 10, pop: 0, felicidade: 4 },
    bonus: 'Reduz os estragos dos temporais.',
    aula: {
      resumo: 'Cidades cheias de asfalto e concreto alagam quando chove forte: a drenagem urbana é parte do saneamento.',
      pontos: [
        'Drenagem e manejo das águas da chuva fazem parte do saneamento básico (Lei 11.445/2007, art. 3º, I, "d").',
        'Piscinões (reservatórios de detenção) guardam a água da chuva forte e a liberam devagar, reduzindo enchentes.',
        'A cobrança pelo serviço de drenagem pode levar em conta a área impermeabilizada de cada lote (Lei 11.445/2007, art. 36).',
        'Preservar as margens dos rios (APP) também evita enchentes; o Código Florestal protege essas faixas (Lei 12.651/2012, art. 4º).',
        'O município deve mapear áreas de risco e ter planos de contingência para chuvas fortes (Lei 12.608/2012, art. 8º).',
      ],
      pratica: 'O shopping concretou todo o terreno e a água corre toda para a rua? A cobrança da drenagem pode ser maior para quem impermeabiliza mais (art. 36).',
    },
    licenca: [
      { p: 'A drenagem das águas da chuva faz parte do saneamento básico?', ops: ['Sim', 'Não', 'Só em cidades litorâneas', 'Só quando há enchente'], c: 0, exp: 'Lei 11.445/2007, art. 3º, I, "d".' },
      { p: 'Para que serve um piscinão?', ops: ['Para nadar', 'Para guardar a água da chuva forte e evitar enchentes', 'Para tratar esgoto', 'Para gerar energia'], c: 1, exp: 'Reservatórios de detenção amortecem o pico das chuvas, liberando a água aos poucos para rios e galerias.' },
      { p: 'A cobrança pela drenagem pode considerar o quê?', ops: ['A cor do imóvel', 'O percentual de área impermeabilizada do lote', 'A idade do dono', 'O número de janelas'], c: 1, exp: 'Lei 11.445/2007, art. 36: a cobrança deve levar em conta, em cada lote urbano, o percentual de área impermeabilizada.' },
    ],
  },

  ponteLocal: {
    nome: 'Ponte', icone: '🌉', area: 'Infraestrutura', cor: '#8D6E63',
    custo: 120, nivel: 0, efeito: { renda: 0, manutencao: 1, pop: 0, felicidade: 1 },
    bonus: 'Constrói-se sobre a água. Conta como rua para o bônus de +20%.',
  },
  lagoa: {
    nome: 'Lagoa', icone: '🏞️', area: 'Enfeite', cor: '#3FA7DE', cat: 'enfeite',
    custo: 90, nivel: 0, efeito: { renda: 0, manutencao: 1, pop: 0, felicidade: 3 },
  },
  pontoOnibus: {
    nome: 'Ponto de ônibus', icone: '🚏', area: 'Enfeite', cor: '#0D7896', cat: 'enfeite',
    custo: 30, nivel: 0, efeito: { renda: 0, manutencao: 0, pop: 0, felicidade: 1 },
  },
};

/* Categorias do menu de construção */
const CATEGORIAS = [
  { id: 'todos', nome: 'Todos', icone: '✨' },
  { id: 'moradia', nome: 'Moradia', icone: '🏠' },
  { id: 'economia', nome: 'Economia', icone: '🏪' },
  { id: 'servicos', nome: 'Serviços', icone: '🏥' },
  { id: 'governo', nome: 'Governo', icone: '⚖️' },
  { id: 'infra', nome: 'Infraestrutura', icone: '🔧' },
  { id: 'comunidade', nome: 'Comunidade', icone: '🌳' },
  { id: 'enfeite', nome: 'Enfeites', icone: '🌷' },
];
Object.entries({
  casa: 'moradia', aluguel: 'moradia', condominio: 'moradia',
  mercado: 'economia', fabrica: 'economia', banco: 'economia', empresa: 'economia', dados: 'economia',
  escola: 'servicos', saude: 'servicos', inss: 'servicos', bombeiros: 'servicos', delegacia: 'servicos', terminal: 'servicos',
  camara: 'governo', forum: 'governo', cartorio: 'governo', fazenda: 'governo', prefeitura: 'governo',
  parque: 'comunidade', ecoponto: 'comunidade', templo: 'comunidade', cultura: 'comunidade',
  estacaoAgua: 'infra', esgoto: 'infra', usina: 'infra', iluminacao: 'infra', telecom: 'infra', piscinao: 'infra', ponteLocal: 'infra', ruaLocal: 'infra',
}).forEach(([k, c]) => { PREDIOS[k].cat = c; });

/* Títulos do prefeito conforme o "Conhecimento Jurídico" acumulado */
const NIVEIS = [
  { xp: 0,   titulo: 'Estudante de Direito' },
  { xp: 60,  titulo: 'Estagiário(a)' },
  { xp: 160, titulo: 'Bacharel(a)' },
  { xp: 320, titulo: 'Advogado(a)' },
  { xp: 550, titulo: 'Juiz(a) de Direito' },
  { xp: 850, titulo: 'Desembargador(a)' },
  { xp: 1250, titulo: 'Ministro(a) do STF' },
];

/* Missões guiam o aprendizado em ordem crescente de dificuldade */
const MISSOES = [
  { id: 'm1', texto: 'Construa suas primeiras Casas', ok: s => conta(s, 'casa') >= 1, xp: 10, din: 50 },
  { id: 'm2', texto: 'Abra um Mercado (Direito do Consumidor)', ok: s => conta(s, 'mercado') >= 1, xp: 10, din: 60 },
  { id: 'm3', texto: 'Crie um Parque (Direito Ambiental)', ok: s => conta(s, 'parque') >= 1, xp: 10, din: 60 },
  { id: 'me', texto: 'Enfeite a cidade com 3 árvores, canteiros ou praças', ok: s => ['arvore', 'canteiro', 'praca'].reduce((n, k) => n + conta(s, k), 0) >= 3, xp: 10, din: 40 },
  { id: 'm4', texto: 'Resolva 3 casos de cidadãos', ok: s => s.casosResolvidos >= 3, xp: 20, din: 100 },
  { id: 'm5', texto: 'Alcance 50 habitantes', ok: s => s.pop >= 50, xp: 20, din: 100 },
  { id: 'mb', texto: 'Compre um novo bairro para expandir a cidade', ok: s => Object.keys(s.bairros || {}).length >= 2, xp: 25, din: 0 },
  { id: 'm6', texto: 'Garanta escola e posto de saúde', ok: s => conta(s, 'escola') >= 1 && conta(s, 'saude') >= 1, xp: 25, din: 150 },
  { id: 'ms', texto: 'Garanta água tratada e esgoto para a cidade', ok: s => conta(s, 'estacaoAgua') >= 1 && conta(s, 'esgoto') >= 1, xp: 30, din: 150 },
  { id: 'm7', texto: 'Instale Delegacia e Fórum', ok: s => conta(s, 'delegacia') >= 1 && conta(s, 'forum') >= 1, xp: 30, din: 150 },
  { id: 'mn', texto: 'Amplie um prédio até o nível 3', ok: s => s.mapa.some(l => l && (l.nivel || 1) >= 3), xp: 30, din: 150 },
  { id: 'ml', texto: 'Decida 3 projetos de lei da Câmara', ok: s => Object.keys(s.leis || {}).length >= 3, xp: 30, din: 100 },
  { id: 'm8', texto: 'Tenha 8 licenças jurídicas', ok: s => Object.keys(s.licencas).length >= 8, xp: 40, din: 200 },
  { id: 'm9', texto: 'Alcance 150 habitantes e felicidade 70%', ok: s => s.pop >= 150 && s.felicidade >= 70, xp: 50, din: 300 },
  { id: 'm10', texto: 'Libere todas as áreas do Direito', ok: s => Object.keys(PREDIOS).every(k => !PREDIOS[k].aula || s.licencas[k]), xp: 100, din: 500 },
  { id: 'm11', texto: 'Compre todos os bairros da cidade', ok: s => BAIRROS.every(b => (s.bairros || {})[b.id]), xp: 120, din: 0 },
];

/* Casos: dilemas que surgem a cada mês, ligados aos prédios já construídos */
const CASOS = [
  // ── Prefeitura / Administrativo ──
  { predio: 'prefeitura', titulo: 'A obra da praça', quem: '👷 Secretário de Obras',
    texto: 'Prefeito(a), precisamos reformar a praça central. Meu cunhado tem uma construtora ótima e topa fazer agora mesmo. Posso contratar direto?',
    ops: ['Pode, ele é de confiança', 'Não. É preciso abrir licitação', 'Pode, se o preço for baixo'], c: 1,
    exp: 'Obras públicas exigem licitação (Lei 14.133/2021). Contratar parente sem licitação fere a impessoalidade e a moralidade (CF, art. 37).',
    base: 'CF, art. 37; Lei 14.133/2021' },
  { predio: 'prefeitura', titulo: 'Vaga de servidor', quem: '🧑‍💼 Chefe de gabinete',
    texto: 'Precisamos de mais 5 fiscais efetivos na prefeitura. Podemos escolher pessoas indicadas pelos vereadores?',
    ops: ['Sim, é mais rápido', 'Não, cargos efetivos exigem concurso público', 'Sim, se tiverem diploma'], c: 1,
    exp: 'A investidura em cargo efetivo depende de aprovação prévia em concurso público (CF, art. 37, II). Só cargos em comissão são de livre nomeação.',
    base: 'CF, art. 37, II' },
  { predio: 'prefeitura', titulo: 'Propaganda com a cara do prefeito', quem: '📣 Assessor de comunicação',
    texto: 'Que tal colocar sua foto e seu nome em todas as placas das obras da prefeitura? Ajuda na reeleição!',
    ops: ['Ótima ideia!', 'Não pode: a publicidade oficial não pode promover autoridades', 'Só nas obras grandes'], c: 1,
    exp: 'A publicidade de atos e obras públicas deve ter caráter educativo e informativo, sem nomes, símbolos ou imagens que promovam autoridades (CF, art. 37, §1º).',
    base: 'CF, art. 37, §1º' },

  // ── Casas / Civil ──
  { predio: 'casa', titulo: 'Contrato de gaveta', quem: '👨 Seu Joaquim',
    texto: 'Comprei uma casa há 3 anos, paguei tudo e assinei um contrato particular. Agora o vendedor morreu e os filhos dizem que a casa é deles. A casa é minha?',
    ops: ['É sua, o contrato basta', 'No papel, ainda não: faltou registrar no Cartório de Imóveis. Procure regularizar (ex.: adjudicação compulsória)', 'Ninguém é dono'], c: 1,
    exp: 'A propriedade só se transfere com o registro (CC, art. 1.245). Seu Joaquim tem direitos pelo contrato e pode exigir judicialmente a transferência, mas precisa regularizar.',
    base: 'CC, art. 1.245' },
  { predio: 'casa', titulo: 'O terreno abandonado', quem: '👩 Dona Rosa',
    texto: 'Moro há 6 anos numa casinha de 120 m² num terreno que estava abandonado. Ninguém nunca reclamou e não tenho outro imóvel. Posso virar dona?',
    ops: ['Não, nunca', 'Sim, pode pedir usucapião especial urbana', 'Só depois de 20 anos'], c: 1,
    exp: 'Imóvel urbano até 250 m², moradia, 5 anos sem oposição e sem outro imóvel: usucapião especial urbana (CF, art. 183; CC, art. 1.240). Se o terreno fosse público, não poderia.',
    base: 'CF, art. 183' },
  { predio: 'casa', titulo: 'A árvore do vizinho', quem: '🧓 Sr. Antônio',
    texto: 'Os galhos da mangueira do meu vizinho invadem meu quintal. Posso cortar?',
    ops: ['Não, a árvore é dele', 'Sim, pode cortar as raízes e ramos que ultrapassam a divisa', 'Só com ordem judicial'], c: 1,
    exp: 'O art. 1.283 do Código Civil permite cortar raízes e ramos que ultrapassem a extrema do prédio, até o plano vertical divisório.',
    base: 'CC, art. 1.283' },

  // ── Aluguel ──
  { predio: 'aluguel', titulo: 'Fiador e seguro?', quem: '👩‍🦱 Carla, inquilina',
    texto: 'A imobiliária quer que eu apresente fiador E pague seguro-fiança. Isso é normal?',
    ops: ['Sim, é comum', 'Não, só pode ser exigida uma garantia', 'Só se o aluguel for alto'], c: 1,
    exp: 'É vedada mais de uma modalidade de garantia no mesmo contrato (Lei 8.245/91, art. 37, parágrafo único).',
    base: 'Lei 8.245/91, art. 37' },
  { predio: 'aluguel', titulo: 'Mudança antes do prazo', quem: '🧑 Pedro, inquilino',
    texto: 'Meu contrato é de 30 meses, mas fui transferido no trabalho depois de 10. Tenho que pagar a multa inteira?',
    ops: ['Sim, multa integral', 'Não: a multa é proporcional e, em transferência pelo empregador, é dispensada se avisar com 30 dias', 'Precisa ficar até o fim'], c: 1,
    exp: 'A multa é proporcional ao período restante (art. 4º); e o locatário fica dispensado dela se a devolução decorrer de transferência pelo empregador, avisando por escrito com 30 dias (art. 4º, parágrafo único).',
    base: 'Lei 8.245/91, art. 4º' },
  { predio: 'aluguel', titulo: 'Infiltração no teto', quem: '👵 Dona Lurdes',
    texto: 'O telhado do prédio está com problema estrutural e está chovendo dentro do meu apartamento alugado. Quem paga o conserto?',
    ops: ['A inquilina', 'O locador, pois são reparos estruturais', 'A prefeitura'], c: 1,
    exp: 'Cabe ao locador manter a forma e o destino do imóvel e pagar despesas extraordinárias, como obras na estrutura (Lei 8.245/91, art. 22).',
    base: 'Lei 8.245/91, art. 22' },

  // ── Mercado / Consumidor ──
  { predio: 'mercado', titulo: 'Preço errado na etiqueta', quem: '🛒 Lucas',
    texto: 'O leite estava por R$ 4,50 na prateleira, mas no caixa cobraram R$ 6,90. O que vale?',
    ops: ['O preço do caixa', 'O menor preço anunciado', 'A média dos dois'], c: 1,
    exp: 'A oferta vincula o fornecedor (CDC, art. 30) e, havendo divergência, o consumidor paga o menor preço (Lei 10.962/2004, art. 5º).',
    base: 'CDC, art. 30; Lei 10.962/2004' },
  { predio: 'mercado', titulo: 'Compra online', quem: '👧 Júlia',
    texto: 'Comprei uma blusa pelo site do mercado há 4 dias. Não gostei da cor. Posso devolver?',
    ops: ['Não, só se tiver defeito', 'Sim, tem até 7 dias para desistir e receber tudo de volta, incluindo frete', 'Só com troca por outro produto'], c: 1,
    exp: 'Direito de arrependimento: 7 dias para compras fora do estabelecimento, com devolução de todos os valores pagos (CDC, art. 49).',
    base: 'CDC, art. 49' },
  { predio: 'mercado', titulo: 'Cartão só acima de R$ 20', quem: '🧔 Rafael',
    texto: 'O caixa disse que só aceita cartão para compras acima de R$ 20. Pode isso?',
    ops: ['Pode, é regra da loja', 'Não pode condicionar valor mínimo se aceita cartão', 'Pode, mas só no débito'], c: 1,
    exp: 'Se o estabelecimento aceita cartão, não pode impor valor mínimo: isso é prática abusiva (CDC, art. 39, V). A loja pode, porém, oferecer preços diferentes por forma de pagamento (Lei 13.455/2017), desde que informe claramente.',
    base: 'CDC, art. 39' },
  { predio: 'mercado', titulo: 'Produto vencido', quem: '👩‍🍳 Marta',
    texto: 'Comprei iogurte vencido e passei mal. O mercado diz que a culpa é do fabricante. E agora?',
    ops: ['Só o fabricante responde', 'O mercado também responde por vender produto impróprio', 'Ninguém responde'], c: 1,
    exp: 'Produto vencido é impróprio ao consumo (CDC, art. 18, §6º, I). O comerciante responde solidariamente, e também pelo dano à saúde quando não conservou adequadamente o produto (art. 13).',
    base: 'CDC, arts. 13 e 18' },

  // ── Fábrica / Trabalho ──
  { predio: 'fabrica', titulo: 'Sem carteira assinada', quem: '👷‍♂️ Zé',
    texto: 'Trabalho na fábrica todo dia, com horário e chefe, mas não assinaram minha carteira. Tenho direitos?',
    ops: ['Não, sem carteira não há vínculo', 'Sim, há vínculo de emprego e ele pode exigir o registro e os direitos', 'Só se trabalhar há mais de 5 anos'], c: 1,
    exp: 'Presentes pessoalidade, habitualidade, subordinação e salário, há relação de emprego (CLT, art. 3º). A anotação da CTPS é obrigação do empregador (CLT, art. 29).',
    base: 'CLT, arts. 3º e 29' },
  { predio: 'fabrica', titulo: 'Almoço de 15 minutos', quem: '👩‍🏭 Sandra',
    texto: 'Trabalho 8 horas por dia, mas o gerente só deixa 15 minutos de almoço. Está certo?',
    ops: ['Está certo', 'Não: para mais de 6 horas, o intervalo mínimo é de 1 hora', 'Só nos dias de muito movimento'], c: 1,
    exp: 'Jornada acima de 6 horas exige intervalo mínimo de 1 hora (CLT, art. 71). O tempo suprimido deve ser pago com acréscimo de 50% (art. 71, §4º).',
    base: 'CLT, art. 71' },
  { predio: 'fabrica', titulo: 'O sobrinho de 13 anos', quem: '🏭 Dono da fábrica',
    texto: 'Meu sobrinho de 13 anos quer trabalhar na linha de produção nas férias. Posso contratar?',
    ops: ['Pode, é só nas férias', 'Não: abaixo de 14 anos não pode trabalhar nem como aprendiz', 'Pode, se os pais autorizarem'], c: 1,
    exp: 'É proibido qualquer trabalho a menores de 16 anos, salvo como aprendiz a partir de 14 (CF, art. 7º, XXXIII). E trabalho insalubre ou perigoso é proibido até os 18.',
    base: 'CF, art. 7º, XXXIII' },
  { predio: 'fabrica', titulo: 'Grávida demitida', quem: '🤰 Fernanda',
    texto: 'Descobri que estou grávida e fui demitida sem justa causa logo depois. A empresa pode fazer isso?',
    ops: ['Pode, a demissão é livre', 'Não: a gestante tem estabilidade desde a confirmação da gravidez até 5 meses após o parto', 'Só pode se pagar multa'], c: 1,
    exp: 'O ADCT, art. 10, II, "b", garante estabilidade à gestante. Vale mesmo que o empregador não soubesse da gravidez (Súmula 244 do TST).',
    base: 'ADCT, art. 10, II, "b"' },

  // ── Escola / ECA ──
  { predio: 'escola', titulo: 'Aluno faltando', quem: '👩‍🏫 Diretora',
    texto: 'O Miguel, de 10 anos, faltou 3 semanas seguidas e a família não atende. O que a escola faz?',
    ops: ['Nada, é problema da família', 'Comunica o Conselho Tutelar', 'Expulsa o aluno'], c: 1,
    exp: 'A escola deve comunicar ao Conselho Tutelar a reiteração de faltas injustificadas após esgotar os recursos escolares (ECA, art. 56, II).',
    base: 'ECA, art. 56' },
  { predio: 'escola', titulo: 'Sem vaga na creche', quem: '👩‍👦 Mãe de Davi',
    texto: 'Meu filho de 3 anos não conseguiu vaga na creche municipal. Disseram que é "favor" da prefeitura. É verdade?',
    ops: ['É verdade', 'Não: educação infantil em creche é direito da criança e dever do município', 'Só tem direito quem tem renda baixa'], c: 1,
    exp: 'A CF (art. 208, IV) garante educação infantil em creche e pré-escola até 5 anos. O STF (Tema 548) reconheceu que é direito exigível judicialmente.',
    base: 'CF, art. 208, IV' },
  { predio: 'escola', titulo: 'Bullying na sala', quem: '🧒 Aluna Bia',
    texto: 'Uns colegas me xingam e filmam pra rir de mim. A escola diz que é "brincadeira". Tem lei sobre isso?',
    ops: ['Não tem', 'Sim: a lei obriga escolas a prevenir e combater o bullying, e a intimidação sistemática pode ser crime', 'Só se houver agressão física'], c: 1,
    exp: 'A Lei 13.185/2015 obriga escolas a combater a intimidação sistemática, e a Lei 14.811/2024 incluiu o bullying e o cyberbullying como crimes no Código Penal (art. 146-A).',
    base: 'Lei 13.185/2015; CP, art. 146-A' },

  // ── Saúde ──
  { predio: 'saude', titulo: 'Turista doente', quem: '🧳 Turista argentino',
    texto: 'Um turista estrangeiro está com febre alta e procurou o posto. A recepção pergunta se ele pode ser atendido.',
    ops: ['Não, só brasileiros', 'Sim, o SUS é universal', 'Só se pagar'], c: 1,
    exp: 'O SUS é regido pela universalidade de acesso (Lei 8.080/90, art. 7º, I). Atender é obrigação.',
    base: 'CF, art. 196; Lei 8.080/90' },
  { predio: 'saude', titulo: 'Remédio caro', quem: '👴 Seu Benedito',
    texto: 'Preciso de um remédio que não está na lista do SUS e não posso pagar. Tenho alguma saída?',
    ops: ['Nenhuma', 'Pode pedir na Justiça, cumprindo requisitos fixados pelos tribunais (laudo, incapacidade financeira, registro na Anvisa)', 'Basta pedir na farmácia'], c: 1,
    exp: 'O STJ (Tema 106) e o STF (Temas 6 e 1.234) fixaram requisitos para obter judicialmente medicamentos fora das listas do SUS, como laudo médico fundamentado, incapacidade financeira e registro na Anvisa.',
    base: 'CF, art. 196; STJ Tema 106; STF Temas 6 e 1.234' },
  { predio: 'saude', titulo: 'Prontuário', quem: '👩 Cláudia',
    texto: 'Quero uma cópia do meu prontuário para levar a outro médico. O posto disse que o documento "é do posto". Tenho direito?',
    ops: ['Não, é sigiloso até para mim', 'Sim, o paciente tem direito de acesso ao próprio prontuário', 'Só com ordem judicial'], c: 1,
    exp: 'O paciente tem direito de acesso às suas informações de saúde (Lei 13.787/2018; LGPD, art. 18; Código de Ética Médica, art. 88).',
    base: 'LGPD, art. 18; CEM, art. 88' },

  // ── Parque / Ambiental ──
  { predio: 'parque', titulo: 'Lixo no rio', quem: '🎣 Pescador',
    texto: 'Uma empresa está despejando resíduos no rio que corta o parque. Ela diz que foi "acidente". O que fazer?',
    ops: ['Nada, foi acidente', 'Ela deve reparar o dano e pode responder administrativa e penalmente', 'Só pagar uma multa simbólica'], c: 1,
    exp: 'A responsabilidade civil ambiental é objetiva (Lei 6.938/81, art. 14, §1º); a empresa também pode sofrer sanções administrativas e penais (Lei 9.605/98).',
    base: 'CF, art. 225, §3º; Lei 6.938/81' },
  { predio: 'parque', titulo: 'Casa na beira do riacho', quem: '🏗️ Construtor',
    texto: 'Quero construir quiosques a 5 metros da margem do riacho do parque, que tem 4 metros de largura. Pode?',
    ops: ['Pode', 'Não: é Área de Preservação Permanente de no mínimo 30 metros', 'Pode, se plantar árvores'], c: 1,
    exp: 'Para cursos d\'água com menos de 10 m de largura, a APP é de 30 metros em cada margem (Lei 12.651/2012, art. 4º, I, "a").',
    base: 'Código Florestal, art. 4º' },
  { predio: 'parque', titulo: 'Maus-tratos a animais', quem: '🐕 Voluntária da ONG',
    texto: 'Encontramos um homem agredindo um cachorro no parque. É só uma questão moral?',
    ops: ['Sim, não é crime', 'Não: maus-tratos a animais é crime, com pena maior quando a vítima é cão ou gato', 'Só se o animal morrer'], c: 1,
    exp: 'O art. 32 da Lei 9.605/98 tipifica os maus-tratos; para cães e gatos, a pena é de reclusão de 2 a 5 anos (§1º-A, incluído pela Lei 14.064/2020).',
    base: 'Lei 9.605/98, art. 32' },

  // ── Delegacia / Penal ──
  { predio: 'delegacia', titulo: 'Confissão forçada', quem: '👮 Investigador',
    texto: 'O suspeito não quer falar. Posso dizer que, se ficar calado, isso prova que ele é culpado?',
    ops: ['Pode', 'Não: o silêncio é direito e não pode ser interpretado contra ele', 'Só se houver testemunha'], c: 1,
    exp: 'O preso tem direito de permanecer calado (CF, art. 5º, LXIII) e o silêncio não importa confissão nem pode prejudicar a defesa (CPP, art. 186, parágrafo único).',
    base: 'CF, art. 5º, LXIII; CPP, art. 186' },
  { predio: 'delegacia', titulo: 'Preso há 3 dias', quem: '👨‍⚖️ Advogada',
    texto: 'Meu cliente foi preso em flagrante há 3 dias e ainda não viu um juiz. Está correto?',
    ops: ['Sim, é normal', 'Não: a audiência de custódia deve ocorrer em até 24 horas', 'Pode esperar até 30 dias'], c: 1,
    exp: 'O art. 310 do CPP determina a audiência de custódia em até 24 horas após a prisão. O descumprimento sem motivo idôneo pode tornar a prisão ilegal.',
    base: 'CPP, art. 310' },
  { predio: 'delegacia', titulo: 'Assalto na padaria', quem: '🥖 Padeiro',
    texto: 'Um homem armado tentou me assaltar e eu o empurrei para longe, fazendo-o cair. Ele se machucou. Cometi crime?',
    ops: ['Sim, lesão corporal', 'Não, agi em legítima defesa', 'Depende do valor do caixa'], c: 1,
    exp: 'Repelir injusta agressão atual, usando moderadamente os meios necessários, é legítima defesa (CP, art. 25) e exclui o crime (art. 23, II).',
    base: 'CP, arts. 23 e 25' },

  // ── Fórum / Acesso à Justiça ──
  { predio: 'forum', titulo: 'Sem dinheiro para advogado', quem: '👩‍🦳 Dona Cida',
    texto: 'Uma empresa me cobrou R$ 3.000 por um serviço que nunca contratei. Não tenho dinheiro para advogado. Desisto?',
    ops: ['Desiste', 'Pode ir sozinha ao Juizado Especial (causa até 20 salários mínimos) ou procurar a Defensoria', 'Só pode reclamar no Facebook'], c: 1,
    exp: 'No Juizado Especial Cível, causas até 20 salários mínimos dispensam advogado (Lei 9.099/95, art. 9º). A Defensoria Pública também presta assistência gratuita (CF, art. 134).',
    base: 'Lei 9.099/95, art. 9º; CF, art. 134' },
  { predio: 'forum', titulo: 'Cláusula proibindo processar', quem: '📄 Empresário',
    texto: 'Coloquei no contrato que o cliente não pode processar minha empresa em hipótese alguma. Isso vale?',
    ops: ['Vale, está assinado', 'Não: ninguém pode ser impedido de buscar o Judiciário', 'Vale só para valores pequenos'], c: 1,
    exp: 'A lei não excluirá da apreciação do Poder Judiciário lesão ou ameaça a direito (CF, art. 5º, XXXV). Em contratos de consumo, essa cláusula ainda é nula pelo CDC (art. 51).',
    base: 'CF, art. 5º, XXXV' },
  { predio: 'forum', titulo: 'Acordo antes da sentença', quem: '🤝 Conciliador',
    texto: 'As duas partes de um processo querem fazer um acordo antes da sentença. É possível?',
    ops: ['Não, o juiz tem que decidir', 'Sim, a conciliação é incentivada em qualquer fase do processo', 'Só no tribunal'], c: 1,
    exp: 'O CPC estimula a solução consensual dos conflitos em qualquer momento (art. 3º, §3º), e o acordo homologado vale como sentença.',
    base: 'CPC, art. 3º, §3º' },

  // ── Câmara ──
  { predio: 'camara', titulo: 'Lei aprovada', quem: '🗳️ Presidente da Câmara',
    texto: 'Aprovamos uma lei que proíbe qualquer pessoa de criticar a prefeitura nas redes sociais. Vai sancionar?',
    ops: ['Sanciono!', 'Veto: a lei é inconstitucional por violar a liberdade de expressão', 'Sanciono só para os servidores'], c: 1,
    exp: 'A livre manifestação do pensamento é garantida (CF, art. 5º, IV e IX). O prefeito deve vetar projetos inconstitucionais.',
    base: 'CF, art. 5º, IV e IX' },
  { predio: 'camara', titulo: 'Lei sobre Direito Penal', quem: '👔 Vereador',
    texto: 'Quero criar uma lei municipal que transforma pichação em crime com pena de 10 anos de prisão. Pode?',
    ops: ['Pode, o município é autônomo', 'Não: só a União pode legislar sobre Direito Penal', 'Pode, se o prefeito sancionar'], c: 1,
    exp: 'Compete privativamente à União legislar sobre direito penal (CF, art. 22, I). O município pode, porém, criar multas administrativas em temas locais.',
    base: 'CF, art. 22, I' },
  { predio: 'camara', titulo: 'Horário do comércio', quem: '🏬 Associação comercial',
    texto: 'A Câmara quer definir o horário de funcionamento das lojas da cidade. Isso é assunto municipal?',
    ops: ['Sim, é interesse local', 'Não, só o Congresso pode', 'Só o Estado pode'], c: 0,
    exp: 'Compete ao município fixar o horário de funcionamento do comércio local (Súmula Vinculante 38 do STF; CF, art. 30, I).',
    base: 'CF, art. 30, I; Súmula Vinculante 38' },

  // ── Cartório ──
  { predio: 'cartorio', titulo: 'Certidão cobrada', quem: '👶 Pai de primeira viagem',
    texto: 'O cartório quer cobrar pelo registro de nascimento da minha filha. Tenho que pagar?',
    ops: ['Sim, é taxa normal', 'Não, o registro de nascimento e a primeira certidão são gratuitos', 'Só quem tem renda alta paga'], c: 1,
    exp: 'São gratuitos para todos o registro civil de nascimento e a primeira certidão (Lei 6.015/73, art. 30; Lei 9.534/97).',
    base: 'CF, art. 5º, LXXVI; Lei 9.534/97' },
  { predio: 'cartorio', titulo: 'Casamento aos 15', quem: '💍 Noivos',
    texto: 'Um casal quer casar; a noiva tem 15 anos e os pais concordam. O cartório pode celebrar?',
    ops: ['Pode, os pais autorizaram', 'Não: menores de 16 não podem casar em hipótese alguma', 'Pode, com autorização do juiz'], c: 1,
    exp: 'A Lei 13.811/2019 alterou o art. 1.520 do CC e proibiu, em qualquer caso, o casamento de quem não atingiu 16 anos.',
    base: 'CC, art. 1.520' },
  { predio: 'cartorio', titulo: 'Juntos há 10 anos', quem: '👫 Casal',
    texto: 'Moramos juntos há 10 anos, mas nunca casamos. Temos algum direito como família?',
    ops: ['Nenhum', 'Sim, a união estável é entidade familiar e pode ser formalizada em cartório', 'Só se tiverem filhos'], c: 1,
    exp: 'A união estável é reconhecida como entidade familiar (CF, art. 226, §3º; CC, art. 1.723) e pode ser declarada por escritura pública ou registrada no cartório.',
    base: 'CF, art. 226, §3º; CC, art. 1.723' },

  // ── Centro de Dados / LGPD ──
  { predio: 'dados', titulo: 'Venda de cadastros', quem: '💻 Gerente de TI',
    texto: 'Uma empresa quer comprar o cadastro dos clientes do nosso centro de dados (nomes, CPFs e telefones). Podemos vender?',
    ops: ['Sim, os dados são nossos', 'Não sem base legal: os titulares têm de ser informados, e a venda sem consentimento viola a LGPD', 'Sim, se for barato'], c: 1,
    exp: 'Compartilhar dados exige base legal e respeito à finalidade informada (LGPD, arts. 6º e 7º). Os dados pertencem aos titulares, não à empresa.',
    base: 'LGPD, arts. 6º e 7º' },
  { predio: 'dados', titulo: 'Vazamento', quem: '🔐 Analista de segurança',
    texto: 'Sofremos um ataque hacker e dados de saúde de clientes vazaram. Devemos esconder para evitar escândalo?',
    ops: ['Esconder', 'Comunicar à ANPD e aos titulares afetados', 'Apagar os registros do ataque'], c: 1,
    exp: 'Incidentes de segurança com risco relevante devem ser comunicados à ANPD e aos titulares (LGPD, art. 48).',
    base: 'LGPD, art. 48' },
  { predio: 'dados', titulo: 'Apague meus dados', quem: '🙋 Cliente',
    texto: 'Não quero mais ser cliente e pedi que apagassem meus dados tratados com base no meu consentimento. A empresa disse que não precisa. Quem está certo?',
    ops: ['A empresa', 'O cliente: ele pode pedir a eliminação, ressalvados os casos de guarda obrigatória por lei', 'Ninguém'], c: 1,
    exp: 'O titular pode solicitar a eliminação dos dados tratados com seu consentimento (LGPD, art. 18, VI), salvo hipóteses do art. 16, como cumprimento de obrigação legal.',
    base: 'LGPD, arts. 16 e 18' },

  // ── Terminal / Trânsito e Acessibilidade ──
  { predio: 'terminal', titulo: 'Idoso no ônibus', quem: '👴 Seu Jorge, 67 anos',
    texto: 'O motorista disse que eu preciso de um cartão especial para não pagar a passagem. É verdade?',
    ops: ['Sim, sem cartão paga', 'Não: basta apresentar documento com foto que comprove a idade', 'Só nos fins de semana'], c: 1,
    exp: 'Para maiores de 65 anos, basta apresentar documento pessoal que faça prova da idade (Estatuto da Pessoa Idosa, art. 39, §1º).',
    base: 'Lei 10.741/2003, art. 39' },
  { predio: 'terminal', titulo: 'Blitz da Lei Seca', quem: '🚔 Agente de trânsito',
    texto: 'Um motorista se recusou a soprar o bafômetro e diz que, sem o teste, não pode ser punido. Ele tem razão?',
    ops: ['Tem razão', 'Não: a recusa tem as mesmas penalidades administrativas da embriaguez', 'Só se estiver cambaleando'], c: 1,
    exp: 'O art. 165-A do CTB pune a recusa com multa (x10) e suspensão do direito de dirigir por 12 meses, mesmo sem prova da embriaguez.',
    base: 'CTB, art. 165-A' },
  { predio: 'terminal', titulo: 'Ônibus sem elevador', quem: '♿ Paulo, cadeirante',
    texto: 'Os ônibus novos que a prefeitura quer comprar não têm elevador para cadeira de rodas, mas são mais baratos. Pode comprar?',
    ops: ['Pode, economia é importante', 'Não: o transporte coletivo deve ser acessível', 'Pode, se comprar um adaptado'], c: 1,
    exp: 'A Lei Brasileira de Inclusão (Lei 13.146/2015, arts. 46 a 48) garante acessibilidade no transporte coletivo, incluindo veículos e terminais.',
    base: 'Lei 13.146/2015, art. 48' },

  // ── Fazenda / Tributário ──
  { predio: 'fazenda', titulo: 'IPTU por decreto', quem: '📊 Secretário da Fazenda',
    texto: 'O caixa está apertado. Posso aumentar o IPTU por decreto agora em dezembro e cobrar já em janeiro?',
    ops: ['Pode', 'Não: aumento de tributo exige lei e respeito à anterioridade', 'Pode, se avisar no jornal'], c: 1,
    exp: 'Tributo só pode ser aumentado por lei (CF, art. 150, I) e, em regra, só pode ser cobrado no exercício seguinte e após 90 dias da publicação (art. 150, III, "b" e "c").',
    base: 'CF, art. 150' },
  { predio: 'fazenda', titulo: 'IPTU da igreja', quem: '⛪ Pastor',
    texto: 'A prefeitura mandou cobrança de IPTU sobre o prédio do nosso templo. Temos que pagar?',
    ops: ['Sim, todos pagam', 'Não: templos de qualquer culto têm imunidade', 'Só metade do valor'], c: 1,
    exp: 'A CF, art. 150, VI, "b", proíbe instituir impostos sobre templos de qualquer culto.',
    base: 'CF, art. 150, VI, "b"' },
  { predio: 'fazenda', titulo: 'Gastar mais do que arrecada', quem: '🏦 Contador',
    texto: 'No último ano de mandato, o prefeito quer contratar despesas que só serão pagas na próxima gestão, sem dinheiro em caixa. Pode?',
    ops: ['Pode, o próximo paga', 'Não: a Lei de Responsabilidade Fiscal proíbe nos últimos 8 meses do mandato', 'Pode, se for obra'], c: 1,
    exp: 'O art. 42 da LRF (LC 101/2000) proíbe, nos dois últimos quadrimestres do mandato, contrair obrigação que não possa ser paga no mesmo período sem disponibilidade de caixa.',
    base: 'LC 101/2000, art. 42' },

  // ── Banco ──
  { predio: 'banco', titulo: 'Empréstimo fantasma', quem: '👵 Dona Zilda',
    texto: 'Apareceu um desconto de empréstimo na minha aposentadoria, mas eu nunca pedi empréstimo nenhum! O banco diz que "está no sistema". E agora?',
    ops: ['Ela tem que pagar, está no sistema', 'O banco deve cancelar, devolver o que descontou (em regra, em dobro) e pode ter de indenizar', 'Só a polícia pode resolver'], c: 1,
    exp: 'Cobrança indevida dá direito à devolução em dobro do que foi pago, salvo engano justificável (CDC, art. 42, parágrafo único). Fraude na contratação é risco do banco (Súmula 479 do STJ).',
    base: 'CDC, art. 42; Súmula 479 do STJ' },
  { predio: 'banco', titulo: 'Dívidas demais', quem: '😰 Marcos',
    texto: 'Tenho cartão, cheque especial e dois empréstimos. Se eu pagar tudo, não sobra nem para comer. Existe alguma saída legal?',
    ops: ['Não, tem que pagar tudo de uma vez', 'Pode pedir a repactuação das dívidas pela Lei do Superendividamento, preservando o mínimo existencial', 'Basta parar de pagar e esquecer'], c: 1,
    exp: 'A Lei 14.181/2021 permite ao consumidor superendividado pedir um processo de repactuação, com plano de pagamento envolvendo todos os credores (CDC, art. 104-A).',
    base: 'CDC, arts. 54-A e 104-A' },
  { predio: 'banco', titulo: 'Golpe do cartão clonado', quem: '💳 Bruno',
    texto: 'Clonaram meu cartão e fizeram compras de R$ 2.000. O banco diz que a culpa é minha. Tenho direito a algo?',
    ops: ['Não, o cartão é dele', 'Sim: em regra, o banco responde por fraudes de terceiros nas operações bancárias', 'Só se ele tiver seguro'], c: 1,
    exp: 'Súmula 479 do STJ: as instituições financeiras respondem objetivamente pelos danos gerados por fortuito interno relativo a fraudes e delitos de terceiros.',
    base: 'Súmula 479 do STJ' },

  // ── INSS ──
  { predio: 'inss', titulo: 'Nunca contribuí', quem: '👵 Dona Maria, 66 anos',
    texto: 'Trabalhei a vida toda em casa e nunca paguei INSS. Hoje vivo com quase nada. Tenho direito a algum benefício?',
    ops: ['Nenhum, porque nunca contribuiu', 'Pode ter direito ao BPC/LOAS, que é assistencial e não exige contribuição', 'Só a aposentadoria por tempo de contribuição'], c: 1,
    exp: 'O BPC garante 1 salário mínimo ao idoso com 65 anos ou mais que comprove baixa renda familiar, mesmo sem contribuir (CF, art. 203, V; Lei 8.742/93, art. 20).',
    base: 'CF, art. 203, V; Lei 8.742/1993' },
  { predio: 'inss', titulo: 'Acidente no começo', quem: '🏍️ Diego, motoboy',
    texto: 'Comecei a contribuir há 2 meses e sofri um acidente de moto. Fiquei sem poder trabalhar. Como não tenho 12 contribuições, perdi o direito?',
    ops: ['Perdeu, faltou carência', 'Não: em caso de acidente, a carência do auxílio por incapacidade é dispensada', 'Só recebe depois de 12 meses'], c: 1,
    exp: 'Lei 8.213/91, art. 26, II: independe de carência o auxílio por incapacidade decorrente de acidente de qualquer natureza.',
    base: 'Lei 8.213/1991, art. 26, II' },
  { predio: 'inss', titulo: 'Quando posso me aposentar?', quem: '👩‍🔧 Sônia, 58 anos',
    texto: 'Comecei a contribuir em 2020, depois da Reforma. Com que idade, em regra, eu poderei me aposentar?',
    ops: ['Aos 55 anos', 'Aos 62 anos, cumprido o tempo mínimo de contribuição', 'A qualquer idade'], c: 1,
    exp: 'Para quem entrou no sistema depois da EC 103/2019, a regra geral é 62 anos para mulheres e 65 para homens, com tempo mínimo de contribuição (CF, art. 201, §7º, I).',
    base: 'CF, art. 201, §7º; EC 103/2019' },

  // ── Condomínio ──
  { predio: 'condominio', titulo: 'Proibido ter gato', quem: '🐈 Luana, moradora',
    texto: 'A convenção do prédio proíbe qualquer animal. Meu gato é castrado, fica dentro de casa e não incomoda ninguém. Vou ter que me desfazer dele?',
    ops: ['Sim, a convenção manda', 'Não: proibição genérica de animais que não causam risco ou incômodo é inválida', 'Só se pagar taxa extra'], c: 1,
    exp: 'O STJ (REsp 1.783.076/DF) decidiu que a convenção não pode proibir genericamente a criação de animais que não ofereçam risco à segurança, higiene ou sossego.',
    base: 'STJ, REsp 1.783.076/DF' },
  { predio: 'condominio', titulo: 'Multa de 10%', quem: '🧾 Síndico',
    texto: 'Quero cobrar 10% de multa de quem atrasar a taxa de condomínio, para ninguém atrasar mais. Posso?',
    ops: ['Pode, a assembleia decide', 'Não: o limite legal é 2%, mais juros', 'Pode, se estiver na convenção'], c: 1,
    exp: 'CC, art. 1.336, §1º: o condômino que não pagar sua contribuição fica sujeito a juros e multa de até 2% sobre o débito.',
    base: 'CC, art. 1.336, §1º' },
  { predio: 'condominio', titulo: 'O vizinho do 302', quem: '😤 Assembleia',
    texto: 'Um morador faz festas toda madrugada, ameaça vizinhos e já foi multado várias vezes. O condomínio pode fazer algo mais?',
    ops: ['Nada, ele é dono', 'Sim: por comportamento antissocial reiterado, a assembleia pode aplicar multa de até 10 vezes a taxa condominial', 'Pode cortar a água do apartamento'], c: 1,
    exp: 'CC, art. 1.337, parágrafo único: o condômino antissocial pode ser multado em até o décuplo da contribuição, até ulterior deliberação da assembleia. Cortar água é proibido.',
    base: 'CC, art. 1.337' },

  // ── Templo ──
  { predio: 'templo', titulo: 'Reforma com dinheiro público', quem: '🧑‍💼 Assessor',
    texto: 'O prefeito frequenta o templo da praça e quer pagar a reforma dele com verba da prefeitura. Pode?',
    ops: ['Pode, é patrimônio da cidade', 'Não: o Estado é laico e não pode subvencionar cultos', 'Pode, se for em ano eleitoral'], c: 1,
    exp: 'CF, art. 19, I: é vedado ao poder público subvencionar cultos religiosos ou igrejas (ressalvada a colaboração de interesse público, na forma da lei).',
    base: 'CF, art. 19, I' },
  { predio: 'templo', titulo: 'Pichação no terreiro', quem: '🙏 Mãe Joana',
    texto: 'Picharam o muro do nosso terreiro com ofensas à nossa religião. Isso é só vandalismo?',
    ops: ['Só vandalismo, sem importância', 'É crime de discriminação religiosa, além de dano', 'É liberdade de expressão'], c: 1,
    exp: 'Praticar, induzir ou incitar discriminação ou preconceito de religião é crime (Lei 7.716/89, art. 20). A pichação também pode configurar crime de dano ou ambiental.',
    base: 'Lei 7.716/1989, art. 20' },
  { predio: 'templo', titulo: 'Prova no sábado', quem: '📚 Estudante',
    texto: 'Minha religião guarda o sábado e a prova da escola foi marcada para sábado. Vou ficar com zero?',
    ops: ['Sim, regras são regras', 'Não: a lei garante prestação alternativa, como prova em outra data', 'Só se a escola for religiosa'], c: 1,
    exp: 'LDB, art. 7º-A (Lei 13.796/2019): ao aluno é assegurado, mediante requerimento, ausentar-se de prova marcada em dia de guarda religiosa, com prestação alternativa.',
    base: 'Lei 9.394/1996, art. 7º-A' },

  // ── Escritórios / Empresarial ──
  { predio: 'empresa', titulo: 'Sócio espertinho', quem: '📉 Credor',
    texto: 'A empresa fechou devendo para todo mundo, mas o sócio usava a conta dela para pagar a casa de praia. Só posso cobrar da empresa vazia?',
    ops: ['Sim, sócio nunca responde', 'Não: havendo confusão patrimonial, o juiz pode desconsiderar a personalidade jurídica e alcançar os bens do sócio', 'Pode tomar a casa sem processo'], c: 1,
    exp: 'CC, art. 50: em caso de abuso da personalidade jurídica (desvio de finalidade ou confusão patrimonial), os efeitos de obrigações podem ser estendidos aos bens dos sócios.',
    base: 'CC, art. 50' },
  { predio: 'empresa', titulo: 'Crise na empresa', quem: '👔 Empresária',
    texto: 'Minha empresa tem 80 funcionários e está com dívidas, mas o negócio é bom. Existe alternativa à falência?',
    ops: ['Não, tem que fechar', 'Sim: pedir recuperação judicial para renegociar as dívidas', 'Demitir todos sem pagar'], c: 1,
    exp: 'A recuperação judicial (Lei 11.101/2005) busca viabilizar a superação da crise econômico-financeira, preservando a empresa, os empregos e os interesses dos credores.',
    base: 'Lei 11.101/2005, art. 47' },
  { predio: 'empresa', titulo: 'Empresa de um sócio só', quem: '💡 Thiago',
    texto: 'Quero abrir uma empresa sozinho, mas não quero arriscar meu apartamento se o negócio der errado. Preciso arrumar um sócio?',
    ops: ['Sim, limitada exige dois sócios', 'Não: desde 2019 a sociedade limitada pode ter um único sócio, com responsabilidade limitada', 'Não existe responsabilidade limitada no Brasil'], c: 1,
    exp: 'A Lei 13.874/2019 incluiu o §1º no art. 1.052 do CC: a sociedade limitada pode ser constituída por uma ou mais pessoas.',
    base: 'CC, art. 1.052, §1º' },

  // ── Bombeiros / Defesa Civil ──
  { predio: 'bombeiros', titulo: 'Boate sem vistoria', quem: '🎶 Dono da boate',
    texto: 'Vamos inaugurar a boate no sábado com 500 pessoas. A vistoria de incêndio ainda não saiu, mas é só um detalhe. Posso abrir?',
    ops: ['Pode, é só um detalhe', 'Não: locais de reunião de público precisam de prevenção de incêndio vistoriada e licenciada', 'Pode, se tiver extintor'], c: 1,
    exp: 'A Lei 13.425/2017 (Lei Kiss) exige medidas de prevenção e combate a incêndio, com vistoria e licenciamento dos locais de reunião de público.',
    base: 'Lei 13.425/2017' },
  { predio: 'bombeiros', titulo: 'Casas na encosta', quem: '⛰️ Agente da Defesa Civil',
    texto: 'Famílias estão construindo casas numa encosta que desliza quando chove forte. O que a prefeitura deve fazer?',
    ops: ['Nada, o terreno é deles', 'Mapear a área de risco, vedar novas ocupações e apoiar a realocação das famílias', 'Esperar o deslizamento'], c: 1,
    exp: 'Lei 12.608/2012, art. 8º: compete ao município identificar e mapear áreas de risco, fiscalizá-las e vedar novas ocupações, promovendo, quando necessário, a intervenção preventiva e a evacuação.',
    base: 'Lei 12.608/2012, art. 8º' },
  { predio: 'bombeiros', titulo: 'Passou direto', quem: '🚑 Testemunha',
    texto: 'Um motorista viu um ciclista caído e machucado na estrada e foi embora sem ajudar nem ligar para ninguém. Ele fez algo errado?',
    ops: ['Não, não foi ele que causou', 'Sim: omissão de socorro é crime; bastava ligar para o socorro', 'Só se conhecesse a vítima'], c: 1,
    exp: 'CP, art. 135: deixar de prestar assistência, quando possível fazê-lo sem risco pessoal, ou não pedir socorro da autoridade pública, é crime.',
    base: 'CP, art. 135' },

  // ── Ecoponto ──
  { predio: 'ecoponto', titulo: 'Pilhas velhas', quem: '🔋 Seu Raul',
    texto: 'Tenho uma caixa cheia de pilhas e baterias velhas. Posso jogar no lixo comum?',
    ops: ['Pode', 'Não: devem voltar ao comércio ou fabricante, que são obrigados a recebê-las (logística reversa)', 'Pode, se embrulhar em jornal'], c: 1,
    exp: 'Lei 12.305/2010, art. 33: pilhas e baterias estão sujeitas à logística reversa, e o comércio deve receber os produtos usados.',
    base: 'Lei 12.305/2010, art. 33' },
  { predio: 'ecoponto', titulo: 'Um lixão mais barato', quem: '🗑️ Secretário de Obras',
    texto: 'O aterro sanitário é caro. Que tal jogar o lixo da cidade num terreno afastado, a céu aberto?',
    ops: ['Boa economia!', 'Não: lixão a céu aberto é proibido pela Política Nacional de Resíduos Sólidos', 'Pode, se for longe das casas'], c: 1,
    exp: 'Lei 12.305/2010, art. 47, II: é proibido o lançamento de resíduos in natura a céu aberto. Além disso, pode configurar crime ambiental (Lei 9.605/98, art. 54).',
    base: 'Lei 12.305/2010, art. 47' },
  { predio: 'ecoponto', titulo: 'Os catadores', quem: '♻️ Cooperativa',
    texto: 'Somos catadores e queremos trabalhar com a prefeitura na coleta seletiva. A lei permite?',
    ops: ['Não, só empresas grandes', 'Sim: a lei incentiva a integração de cooperativas de catadores, inclusive com contratação dispensada de licitação', 'Só como voluntários'], c: 1,
    exp: 'A Lei 12.305/2010 prevê a integração dos catadores (art. 7º, XII), e a Lei 14.133/2021 (art. 75, IV, "j") permite contratar suas cooperativas com dispensa de licitação.',
    base: 'Lei 12.305/2010, art. 7º; Lei 14.133/2021, art. 75' },

  // ── Centro Cultural ──
  { predio: 'cultura', titulo: 'Música na festa da cidade', quem: '🎤 Produtor cultural',
    texto: 'A prefeitura vai fazer um show gratuito na praça com músicas famosas. Como é de graça, não precisa pagar nada de direito autoral, certo?',
    ops: ['Certo, evento gratuito é livre', 'Errado: execução pública de músicas exige autorização e recolhimento ao ECAD, mesmo em evento gratuito', 'Só paga se tiver mais de mil pessoas'], c: 1,
    exp: 'Lei 9.610/98, arts. 68 e 99: a execução pública em locais de frequência coletiva depende de autorização; o STJ entende que isso vale mesmo sem cobrança de ingresso.',
    base: 'Lei 9.610/1998, art. 68' },
  { predio: 'cultura', titulo: 'Machado de Assis no palco', quem: '🎭 Grupo de teatro',
    texto: 'Queremos encenar "Dom Casmurro", de Machado de Assis, que morreu em 1908. Precisamos pagar direitos autorais?',
    ops: ['Sim, para os herdeiros', 'Não: a obra já está em domínio público', 'Sim, para o governo'], c: 1,
    exp: 'Os direitos patrimoniais duram 70 anos após 1º de janeiro do ano seguinte à morte do autor (art. 41). As obras de Machado de Assis estão em domínio público.',
    base: 'Lei 9.610/1998, art. 41' },
  { predio: 'cultura', titulo: 'Foto da internet', quem: '📸 Fotógrafa',
    texto: 'O Centro Cultural usou uma foto minha da internet no cartaz da exposição, sem pedir e sem dar crédito. Isso é permitido?',
    ops: ['Sim, estava na internet', 'Não: usar a foto exige autorização da autora, e o crédito é obrigatório', 'Sim, se for para cultura'], c: 1,
    exp: 'A fotografia é obra protegida (Lei 9.610/98, art. 7º, VII). Depende de autorização prévia do autor a reprodução da obra (art. 29), e o nome do autor deve ser indicado (art. 79, §1º).',
    base: 'Lei 9.610/1998, arts. 7º, 29 e 79' },
  // ── Estação de Água ──
  { predio: 'estacaoAgua', titulo: 'Contrato sem licitação', quem: '📋 Secretário de Obras',
    texto: 'Uma empresa estadual quer assumir o abastecimento de água da cidade com um contrato assinado direto, sem licitação. Podemos fazer assim?',
    ops: ['Pode, é empresa pública', 'Não: após o Novo Marco, quem não integra a administração municipal precisa de concessão precedida de licitação', 'Pode, se o prazo for curto'], c: 1,
    exp: 'Lei 11.445/2007, art. 10 (redação da Lei 14.026/2020): a prestação por entidade que não integre a administração do titular depende de contrato de concessão, mediante prévia licitação; novos contratos de programa ficaram vedados.',
    base: 'Lei 11.445/2007, art. 10' },
  { predio: 'estacaoAgua', titulo: 'Água turva', quem: '🚰 Dona Célia',
    texto: 'Há uma semana a água da minha torneira sai amarelada e com cheiro forte. A empresa diz que "é normal". Tenho algum direito?',
    ops: ['Não, água é assim mesmo', 'Sim: o serviço essencial deve ser adequado e seguro, e ela pode reclamar e pedir reparação', 'Só se ficar doente'], c: 1,
    exp: 'CDC, art. 22: órgãos públicos e concessionárias são obrigados a fornecer serviços adequados, eficientes, seguros e, quanto aos essenciais, contínuos — e respondem pelos danos.',
    base: 'CDC, art. 22' },
  { predio: 'estacaoAgua', titulo: 'Corte por conta antiga', quem: '💸 Seu Valdir',
    texto: 'Estou em dia com as contas atuais, mas a empresa quer cortar minha água por uma dívida de três anos atrás. Pode?',
    ops: ['Pode cortar quando quiser', 'Não: o corte, com aviso prévio, só cabe por débito atual; dívida antiga deve ser cobrada pelos meios comuns', 'Pode, sem aviso'], c: 1,
    exp: 'Lei 8.987/1995, art. 6º, §3º, II, admite a interrupção por inadimplemento com aviso prévio; o STJ entende que isso vale para débitos atuais, não para dívidas pretéritas.',
    base: 'Lei 8.987/1995, art. 6º, §3º; jurisprudência do STJ' },

  // ── Estação de Esgoto ──
  { predio: 'esgoto', titulo: 'Esgoto no córrego', quem: '🏚️ Morador',
    texto: 'A rede de esgoto já passa na minha rua, mas não quero pagar a ligação. Continuo jogando o esgoto no córrego, que é mais barato. Algum problema?',
    ops: ['Nenhum', 'Sim: com rede disponível ele deve se ligar a ela, e poluir o córrego pode ser crime', 'Só se o vizinho reclamar'], c: 1,
    exp: 'Lei 11.445/2007, art. 45: toda edificação permanente urbana deve se conectar às redes públicas disponíveis. A poluição de recursos hídricos pode configurar o crime do art. 54 da Lei 9.605/98.',
    base: 'Lei 11.445/2007, art. 45; Lei 9.605/1998, art. 54' },
  { predio: 'esgoto', titulo: 'Efluente da indústria', quem: '🐟 Pescador',
    texto: 'Uma indústria está despejando água suja e espumosa no rio, e os peixes estão morrendo. O que a lei diz?',
    ops: ['Nada, é só água', 'É poluição: pode ser crime, a empresa deve reparar o dano e pode ser multada', 'Só a prefeitura pode reclamar'], c: 1,
    exp: 'Causar poluição que resulte em mortandade de animais é crime (Lei 9.605/98, art. 54), e a responsabilidade pela reparação é objetiva (Lei 6.938/81, art. 14, §1º).',
    base: 'Lei 9.605/1998, art. 54; Lei 6.938/1981' },
  { predio: 'esgoto', titulo: 'Bairro sem rede', quem: '🏡 Associação de moradores',
    texto: 'No nosso bairro ainda não chegou rede de esgoto. Usar fossa séptica é ilegal?',
    ops: ['É ilegal', 'Não: na falta de rede, soluções individuais são admitidas, seguindo as normas', 'Só com autorização do STF'], c: 1,
    exp: 'Lei 11.445/2007, art. 45, §1º: na ausência de redes públicas, são admitidas soluções individuais de esgotamento sanitário, observadas as normas.',
    base: 'Lei 11.445/2007, art. 45, §1º' },

  // ── Usina Solar ──
  { predio: 'usina', titulo: 'Sobrou energia', quem: '☀️ Dona Lúcia',
    texto: 'Coloquei placas solares no telhado e este mês produzi mais energia do que gastei. Perdi o que sobrou?',
    ops: ['Perdeu', 'Não: o excedente vira crédito para abater nas próximas contas', 'Ela precisa pagar pelo excesso'], c: 1,
    exp: 'Pelo Sistema de Compensação de Energia Elétrica da Lei 14.300/2022, a energia injetada na rede gera créditos para o consumidor.',
    base: 'Lei 14.300/2022' },
  { predio: 'usina', titulo: 'Lei da conta de luz', quem: '🗳️ Vereador',
    texto: 'Quero aprovar uma lei municipal que reduz pela metade a tarifa de energia da cidade. Vai dar certo?',
    ops: ['Vai, o município é autônomo', 'Não: legislar sobre energia é competência da União, e as tarifas são da ANEEL', 'Vai, se o prefeito sancionar'], c: 1,
    exp: 'CF, art. 22, IV: compete privativamente à União legislar sobre energia. A regulação tarifária cabe à ANEEL (Lei 9.427/1996).',
    base: 'CF, art. 22, IV' },
  { predio: 'usina', titulo: 'Geladeira queimada', quem: '🧊 Seu Otávio',
    texto: 'Uma queda de energia seguida de pico queimou minha geladeira. A distribuidora diz que não tem nada com isso. Tem?',
    ops: ['Não tem', 'Tem: a concessionária responde objetivamente pelos danos causados aos usuários', 'Só se ele provar culpa de um funcionário'], c: 1,
    exp: 'As prestadoras de serviço público respondem pelos danos que seus agentes causarem a terceiros, independentemente de culpa (CF, art. 37, §6º; CDC, art. 22, parágrafo único).',
    base: 'CF, art. 37, §6º' },

  // ── Iluminação Pública ──
  { predio: 'iluminacao', titulo: 'Taxa de iluminação', quem: '🧾 Secretário da Fazenda',
    texto: 'Para pagar os postes novos, que tal criarmos uma "taxa de iluminação pública"?',
    ops: ['Ótima ideia', 'Não pode ser taxa (Súmula Vinculante 41); o município pode instituir a contribuição do art. 149-A', 'Pode, se for baixa'], c: 1,
    exp: 'Súmula Vinculante 41 do STF: o serviço de iluminação pública não pode ser remunerado mediante taxa. A Constituição prevê a contribuição de iluminação pública (art. 149-A).',
    base: 'Súmula Vinculante 41; CF, art. 149-A' },
  { predio: 'iluminacao', titulo: 'Rua escura', quem: '🌑 Moradora',
    texto: 'Minha rua está sem luz há meses e tenho medo de voltar à noite. A quem devo pedir solução?',
    ops: ['À polícia federal', 'À prefeitura, responsável pela iluminação pública', 'Aos vizinhos'], c: 1,
    exp: 'A iluminação pública é serviço de interesse local, a cargo do município (CF, art. 30, V), custeado pela contribuição do art. 149-A.',
    base: 'CF, arts. 30, V e 149-A' },
  { predio: 'iluminacao', titulo: 'Cobrança na conta de luz', quem: '💡 Consumidor',
    texto: 'Veio na minha conta de luz uma "contribuição de iluminação pública". Isso não é ilegal?',
    ops: ['É ilegal', 'É permitido: a Constituição autoriza cobrá-la na fatura de energia', 'Só vale para comércios'], c: 1,
    exp: 'CF, art. 149-A, parágrafo único: é facultada a cobrança da contribuição na fatura de consumo de energia elétrica.',
    base: 'CF, art. 149-A' },

  // ── Torre de Telecom ──
  { predio: 'telecom', titulo: 'Vídeo lento de propósito', quem: '📶 Usuária',
    texto: 'Minha operadora deixa os vídeos de um aplicativo concorrente bem mais lentos que os do aplicativo dela. Pode isso?',
    ops: ['Pode, a rede é dela', 'Não: viola a neutralidade de rede do Marco Civil', 'Pode, se estiver no contrato'], c: 1,
    exp: 'Marco Civil da Internet, art. 9º: o responsável pela transmissão deve tratar de forma isonômica quaisquer pacotes de dados, sem distinção por conteúdo, origem, destino, serviço ou aplicação.',
    base: 'Lei 12.965/2014, art. 9º' },
  { predio: 'telecom', titulo: 'Registros sem ordem', quem: '🕵️ Investigador',
    texto: 'Quero que a operadora me entregue agora os registros de conexão de um suspeito, sem passar pelo juiz. Ela é obrigada?',
    ops: ['Sim, é obrigada', 'Não: em regra, os registros só são entregues com ordem judicial', 'Sim, se for urgente'], c: 1,
    exp: 'Marco Civil, art. 10, §1º: o provedor só é obrigado a disponibilizar os registros mediante ordem judicial.',
    base: 'Lei 12.965/2014, art. 10' },
  { predio: 'telecom', titulo: 'Internet cortada', quem: '💻 Estudante',
    texto: 'Estou com as contas de internet em dia, mas a operadora suspendeu minha conexão "para manutenção do cadastro". Pode?',
    ops: ['Pode', 'Não: o usuário tem direito à não suspensão, salvo por débito da própria utilização', 'Pode, uma vez por mês'], c: 1,
    exp: 'Marco Civil, art. 7º, IV: é direito do usuário a não suspensão da conexão, salvo por débito diretamente decorrente de sua utilização.',
    base: 'Lei 12.965/2014, art. 7º, IV' },

  // ── Piscinão ──
  { predio: 'piscinao', titulo: 'Rua que sempre alaga', quem: '☔ Comerciante',
    texto: 'Toda chuva forte a minha rua vira um rio e a loja alaga. Isso é problema só meu?',
    ops: ['Só dele', 'Não: drenagem urbana é saneamento básico e responsabilidade do município', 'É problema do governo federal'], c: 1,
    exp: 'Lei 11.445/2007, art. 3º, I, "d": drenagem e manejo das águas pluviais integram o saneamento básico, de titularidade municipal (art. 8º).',
    base: 'Lei 11.445/2007, arts. 3º e 8º' },
  { predio: 'piscinao', titulo: 'Shopping todo concretado', quem: '🏬 Gerente do shopping',
    texto: 'A cobrança de drenagem do shopping veio maior que a das casas. É justo cobrar diferente?',
    ops: ['Não, todos pagam igual', 'Sim: a cobrança pode considerar o percentual de área impermeabilizada do lote', 'Só se o shopping concordar'], c: 1,
    exp: 'Lei 11.445/2007, art. 36: a cobrança pela drenagem deve levar em conta, em cada lote urbano, o percentual de área impermeabilizada.',
    base: 'Lei 11.445/2007, art. 36' },
  { predio: 'piscinao', titulo: 'Prédios na beira do rio', quem: '🏗️ Construtora',
    texto: 'Queremos aterrar a margem do córrego para construir um estacionamento. Isso não ajuda a cidade a crescer?',
    ops: ['Ajuda, pode fazer', 'Não: a margem é Área de Preservação Permanente, e ocupá-la agrava as enchentes', 'Pode, se plantar grama'], c: 1,
    exp: 'Código Florestal (Lei 12.651/2012, art. 4º): as faixas marginais de cursos d\'água são APP. Ocupá-las é ilegal e impermeabiliza áreas que absorvem a chuva.',
    base: 'Lei 12.651/2012, art. 4º' },
];

/* Projetos de lei: chegam à Prefeitura quando há Câmara Municipal. O jogador sanciona
   ou veta; leis inconstitucionais sancionadas acabam derrubadas no STF. */
const PROJETOS_LEI = [
  { id: 'horario', titulo: 'Horário do comércio', autor: 'Vereadora Marta',
    texto: 'Fixa o horário de funcionamento das lojas da cidade, com abertura aos domingos das 9h às 14h.',
    constitucional: true, efeito: { renda: .04 },
    exp: 'Compete ao município fixar o horário de funcionamento do comércio local (Súmula Vinculante 38 do STF).', base: 'Súmula Vinculante 38; CF, art. 30, I' },
  { id: 'fila', titulo: 'Lei da Fila no Banco', autor: 'Vereador Paulo',
    texto: 'Obriga as agências bancárias da cidade a atender o cliente em até 20 minutos de fila.',
    constitucional: true, efeito: { fel: 3 },
    exp: 'O STF reconheceu que o município pode legislar sobre o tempo máximo de espera em filas de agências bancárias, por ser assunto de interesse local (RE 610.221, Tema 272).', base: 'CF, art. 30, I; STF, Tema 272' },
  { id: 'apps', titulo: 'Proibição de aplicativos de transporte', autor: 'Vereador Ademir',
    texto: 'Proíbe motoristas de aplicativo de transportar passageiros na cidade, para proteger os táxis.',
    constitucional: false,
    exp: 'O STF decidiu que proibir ou restringir de forma desproporcional o transporte por aplicativo viola a livre iniciativa e a livre concorrência (ADPF 449 e RE 1.054.110, Tema 967).', base: 'CF, art. 170; STF, Tema 967' },
  { id: 'estacionamento', titulo: 'Estacionamento grátis no shopping', autor: 'Vereadora Kelly',
    texto: 'Obriga shoppings e supermercados a oferecer estacionamento gratuito aos clientes.',
    constitucional: false,
    exp: 'Leis locais que impõem gratuidade em estacionamentos privados invadem a competência da União para legislar sobre direito civil e já foram derrubadas pelo STF (CF, art. 22, I).', base: 'CF, art. 22, I' },
  { id: 'iptuverde', titulo: 'IPTU Verde', autor: 'Vereador Jonas',
    texto: 'Dá desconto no IPTU para imóveis com árvores na calçada, energia solar ou captação de água da chuva.',
    constitucional: true, efeito: { fel: 2, renda: -.02 },
    exp: 'O IPTU é imposto municipal (CF, art. 156, I), e benefícios fiscais podem ser concedidos por lei específica (CF, art. 150, §6º), inclusive com finalidade ambiental.', base: 'CF, arts. 150, §6º e 156, I' },
  { id: 'silencio', titulo: 'Lei do Silêncio', autor: 'Vereadora Rosa',
    texto: 'Limita o volume de som em bares e festas depois das 22h, com multa para quem descumprir.',
    constitucional: true, efeito: { fel: 3 },
    exp: 'Controlar a poluição sonora é assunto de interesse local e de proteção ambiental, de competência do município (CF, arts. 23, VI e 30, I).', base: 'CF, arts. 23, VI e 30, I' },
  { id: 'prisao', titulo: 'Prisão por jogar lixo na rua', autor: 'Vereador Rubens',
    texto: 'Cria pena de 2 anos de prisão para quem jogar lixo na rua.',
    constitucional: false,
    exp: 'Só a União pode legislar sobre direito penal (CF, art. 22, I). O município pode, porém, aplicar multas administrativas.', base: 'CF, art. 22, I' },
  { id: 'mandato', titulo: 'Mandato de 6 anos', autor: 'Vereador Clóvis',
    texto: 'Aumenta o mandato do prefeito e dos vereadores para 6 anos.',
    constitucional: false,
    exp: 'A Constituição fixa mandato de 4 anos para prefeito, vice e vereadores (CF, art. 29, I). Lei municipal não pode mudar isso.', base: 'CF, art. 29, I' },
  { id: 'rampas', titulo: 'Acessibilidade nos prédios públicos', autor: 'Vereadora Beatriz',
    texto: 'Exige rampas, piso tátil e banheiros adaptados em todos os prédios públicos municipais em até 2 anos.',
    constitucional: true, efeito: { fel: 3 },
    exp: 'A acessibilidade é dever do poder público (CF, arts. 227, §2º e 244; Lei 13.146/2015), e o município pode regulamentar seus próprios prédios.', base: 'CF, art. 244; Lei 13.146/2015' },
];

/* Impostos municipais ajustáveis no Orçamento (alíquotas em %) */
const IMPOSTOS = {
  iptu: { nome: 'IPTU', descricao: 'Imposto sobre a propriedade de imóveis urbanos — incide sobre casas, prédios e condomínios.',
    min: .5, max: 3, padrao: 1, passo: .25 },
  iss: { nome: 'ISS', descricao: 'Imposto sobre serviços — incide sobre comércio, empresas e demais atividades.',
    min: 2, max: 5, padrao: 3, passo: .5 },
};
const RESIDENCIAIS = ['casa', 'aluguel', 'condominio'];

/* Moradores: nomes e profissões para os cidadãos da cidade */
const NOMES_F = ['Maria', 'Ana', 'Francisca', 'Juliana', 'Patrícia', 'Aline', 'Camila', 'Fernanda', 'Beatriz', 'Larissa', 'Rosa', 'Cida', 'Luana', 'Tereza', 'Débora', 'Sônia', 'Valentina', 'Helena'];
const NOMES_M = ['José', 'João', 'Antônio', 'Francisco', 'Carlos', 'Paulo', 'Pedro', 'Lucas', 'Rafael', 'Marcos', 'Diego', 'Benedito', 'Raimundo', 'Thiago', 'Bruno', 'Gabriel', 'Miguel', 'Arthur'];
const SOBRENOMES = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Araújo', 'Barbosa'];
const PROFISSOES = ['professor(a)', 'enfermeiro(a)', 'motorista de aplicativo', 'comerciante', 'pedreiro(a)', 'advogado(a)', 'programador(a)', 'cozinheiro(a)',
  'auxiliar administrativo', 'vendedor(a)', 'eletricista', 'cabeleireiro(a)', 'agricultor(a) urbano', 'motoboy', 'servidor(a) público', 'diarista', 'mecânico(a)', 'artista'];
/* Direitos lembrados na ficha de cada morador, conforme a fase da vida */
const DIREITOS_PERFIL = [
  { ate: 11, texto: 'Como criança, tem prioridade absoluta na proteção dos seus direitos (CF, art. 227; ECA, art. 4º).' },
  { ate: 17, texto: 'Adolescente: só pode trabalhar como aprendiz a partir dos 14 anos e nunca em atividade perigosa ou noturna (CF, art. 7º, XXXIII).' },
  { ate: 59, texto: 'Se trabalha com carteira assinada, tem jornada de até 8h diárias e 44h semanais, férias com 1/3 a mais e FGTS (CF, art. 7º).' },
  { ate: 64, texto: 'A partir dos 60 anos é pessoa idosa e tem atendimento prioritário (Estatuto da Pessoa Idosa, art. 3º).' },
  { ate: 200, texto: 'Com 65 anos ou mais, tem transporte coletivo urbano gratuito (Estatuto da Pessoa Idosa, art. 39).' },
];

/* Eventos especiais do calendário e do clima: cada um traz uma dica de lei */
const EVENTOS = {
  carnaval: { titulo: '🎊 Carnaval na cidade!', texto: 'Os blocos tomaram as ruas e a cidade está animada.',
    dica: 'Reuniões pacíficas em locais públicos não precisam de autorização, apenas de aviso prévio à autoridade (CF, art. 5º, XVI).' },
  junina: { titulo: '🎉 Festa Junina na praça!', texto: 'Quadrilha, quentão e fogueira: a felicidade subiu.',
    dica: 'Tocar músicas em festa pública exige autorização e pagamento ao ECAD, mesmo sem ingresso (Lei 9.610/1998, art. 68).' },
  eleicao: { titulo: '🗳️ Eleições municipais!', texto: 'A cidade foi às urnas para escolher prefeito(a) e vereadores.',
    dica: 'Prefeitos podem ser reeleitos para um único período subsequente (CF, art. 14, §5º). O voto é obrigatório dos 18 aos 70 anos e facultativo para analfabetos, maiores de 70 e jovens de 16 e 17 anos (CF, art. 14, §1º).' },
  temporal: { titulo: '⛈️ Temporal!', texto: 'Uma chuva forte alagou ruas e derrubou árvores.',
    dica: 'O município deve mapear áreas de risco e manter planos de contingência da Defesa Civil (Lei 12.608/2012, art. 8º).' },
  auditoria: { titulo: '🔎 Auditoria do Tribunal de Contas', texto: 'Os auditores analisaram as contas da prefeitura.',
    dica: 'A Câmara Municipal julga as contas do prefeito com parecer prévio do Tribunal de Contas, que só deixa de prevalecer por 2/3 dos vereadores (CF, art. 31, §2º).' },
};

/* Bairros: áreas de expansão. Só o Centro começa liberado; os demais precisam
   ser comprados quando o caixa juntar o valor. Cada compra ensina Direito Urbanístico.
   r0..r1 / c0..c1 = linhas e colunas (inclusive) do mapa 20×14. */
const BAIRROS = [
  { id: 'centro', nome: 'Centro', icone: '🏛️', preco: 0, r0: 7, r1: 15, c0: 9, c1: 18 },
  { id: 'oeste', nome: 'Bairro Oeste', icone: '🏡', preco: 600, r0: 7, r1: 15, c0: 6, c1: 8,
    lei: {
      titulo: 'Plano Diretor',
      pontos: [
        'O Plano Diretor é a lei municipal que organiza o crescimento da cidade: onde pode haver casas, comércio, indústria e áreas verdes.',
        'Ele é obrigatório para cidades com mais de 20 mil habitantes (CF, art. 182, §1º) e deve ser revisto pelo menos a cada 10 anos (Estatuto da Cidade, Lei 10.257/2001, art. 40, §3º).',
        'A população deve participar da sua elaboração, com audiências públicas (Estatuto da Cidade, art. 40, §4º).',
      ],
      base: 'CF, art. 182; Lei 10.257/2001',
    } },
  { id: 'norte', nome: 'Vila Norte', icone: '🏘️', preco: 900, r0: 5, r1: 6, c0: 6, c1: 18,
    lei: {
      titulo: 'Desapropriação',
      pontos: [
        'O poder público pode tomar um imóvel particular por necessidade ou utilidade pública, ou por interesse social — é a desapropriação.',
        'O dono deve receber justa e prévia indenização em dinheiro (CF, art. 5º, XXIV), salvo as exceções da própria Constituição.',
        'As regras do procedimento estão no Decreto-Lei 3.365/1941, e o dono pode discutir o valor na Justiça.',
      ],
      base: 'CF, art. 5º, XXIV; DL 3.365/1941',
    } },
  { id: 'sul', nome: 'Jardim Sul', icone: '🌻', preco: 1300, r0: 16, r1: 18, c0: 6, c1: 18,
    lei: {
      titulo: 'Loteamento e parcelamento do solo',
      pontos: [
        'Dividir uma gleba em lotes com abertura de ruas é loteamento, e depende de aprovação da prefeitura (Lei 6.766/1979, art. 12).',
        'Em regra, cada lote deve ter no mínimo 125 m² e 5 metros de frente (Lei 6.766/1979, art. 4º, II).',
        'Vender lotes de loteamento não aprovado — o "loteamento clandestino" — é crime (Lei 6.766/1979, art. 50).',
      ],
      base: 'Lei 6.766/1979',
    } },
  { id: 'rio', nome: 'Beira-Rio', icone: '🌊', preco: 2200, r0: 5, r1: 18, c0: 19, c1: 25,
    lei: {
      titulo: 'Função social da propriedade urbana',
      pontos: [
        'A propriedade urbana cumpre sua função social quando atende às exigências do Plano Diretor (CF, art. 182, §2º).',
        'Terreno vazio ou subutilizado pode ser obrigado a ser parcelado ou edificado; se o dono não cumprir, paga IPTU progressivo no tempo (CF, art. 182, §4º).',
        'O IPTU progressivo pode chegar a 15% do valor do imóvel, por até 5 anos, e depois cabe desapropriação paga com títulos da dívida pública (Estatuto da Cidade, arts. 7º e 8º).',
      ],
      base: 'CF, art. 182, §4º; Lei 10.257/2001',
    } },
  { id: 'chacaras', nome: 'Chácaras do Oeste', icone: '🐄', preco: 3000, r0: 5, r1: 18, c0: 0, c1: 5,
    lei: {
      titulo: 'Zona urbana e zona rural: IPTU ou ITR?',
      pontos: [
        'Quem define a zona urbana é a lei municipal. Nela o imóvel paga IPTU, imposto do Município (CF, art. 156, I); na zona rural paga ITR, imposto da União (CF, art. 153, VI).',
        'Para cobrar IPTU, a área precisa ter pelo menos dois melhoramentos públicos, como calçamento, água, esgoto, iluminação ou escola a até 3 km (CTN, art. 32, §1º).',
        'Sítio usado de verdade para agricultura ou pecuária continua pagando ITR, mesmo dentro da zona urbana (DL 57/1966, art. 15; STJ, REsp 1.112.646).',
      ],
      base: 'CF, arts. 153, VI, e 156, I; CTN, art. 32',
    } },
  { id: 'serra', nome: 'Serra Norte', icone: '⛰️', preco: 4200, r0: 0, r1: 4, c0: 0, c1: 31,
    lei: {
      titulo: 'Áreas protegidas e mananciais',
      pontos: [
        'A Serra tem nascentes e represas que abastecem a cidade. O Município pode criar uma unidade de conservação, como um parque natural ou uma Área de Proteção Ambiental (Lei 9.985/2000, o SNUC).',
        'Em volta de nascentes, a faixa de 50 metros é Área de Preservação Permanente (Código Florestal, Lei 12.651/2012, art. 4º, IV).',
        'Ocupar ou desmatar área protegida sem autorização é infração e pode ser crime ambiental (Lei 9.605/1998, arts. 38 e 40).',
      ],
      base: 'Lei 9.985/2000; Lei 12.651/2012, art. 4º',
    } },
  { id: 'industrial', nome: 'Distrito Industrial', icone: '🏭', preco: 5500, r0: 5, r1: 18, c0: 26, c1: 31,
    lei: {
      titulo: 'Estudo de Impacto de Vizinhança e licenciamento',
      pontos: [
        'Empreendimentos que mudam a vida do bairro, como trânsito, barulho e valor dos imóveis, dependem do Estudo de Impacto de Vizinhança, o EIV (Estatuto da Cidade, arts. 36 a 38).',
        'Atividades que podem poluir precisam de licença ambiental: prévia, de instalação e de operação (Resolução CONAMA 237/1997).',
        'O Município licencia as atividades de impacto local, conforme a Lei Complementar 140/2011 (art. 9º, XIV).',
      ],
      base: 'Lei 10.257/2001, arts. 36–38; LC 140/2011',
    } },
  { id: 'esperanca', nome: 'Vila Esperança', icone: '🏚️', preco: 7000, r0: 19, r1: 23, c0: 0, c1: 31,
    lei: {
      titulo: 'Regularização fundiária (Reurb)',
      pontos: [
        'Muitas famílias moram em núcleos informais, sem escritura. A Reurb transforma essas áreas em bairros regulares, com registro em nome dos moradores (Lei 13.465/2017).',
        'Na Reurb de interesse social (Reurb-S), para a população de baixa renda, o registro e as obras básicas não custam nada aos moradores (Lei 13.465/2017, arts. 13 e 33).',
        'O título dado aos moradores é a legitimação fundiária ou a de posse, registradas no Cartório de Imóveis (Lei 13.465/2017, arts. 23 e 25).',
      ],
      base: 'Lei 13.465/2017',
    } },
];

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function bairroDe(i) {
  const r = Math.floor(i / LARGURA), c = i % LARGURA;
  return BAIRROS.find(b => r >= b.r0 && r <= b.r1 && c >= b.c0 && c <= b.c1) || BAIRROS[0];
}

function conta(s, tipo) {
  let n = 0;
  for (const t of s.mapa) if (t && t.tipo === tipo) n++;
  return n;
}
