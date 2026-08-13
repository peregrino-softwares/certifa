/* ============================================================
   App — roteamento, renderizacao e fluxo do simulado.
   ============================================================ */
(function (w, d) {
  'use strict';

  var $ = function (s, r) { return (r || d).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };
  var el = function (id) { return d.getElementById(id); };
  var T = function (k, v) { return w.I18N.t(k, v); };

  function esc(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
  }
  var LETTER = 'ABCDEF';

  /* ============================================================
     Documentos oficiais — usados na aba Documentos e nas citacoes
     ============================================================ */
  var DOCS = [
    { mod: 'ffar', weight: 40, edition: 'Jan 2025',
      url: 'https://digitalhub.fifa.com/m/1e7b741fa0fae779/original/FIFA-Football-Agent-Regulations.pdf',
      topics: { pt: ['Elegibilidade, exame e licenca', 'Contrato de representacao e exclusividade', 'Representacao de menores', 'Comissao e teto do art. 15', 'Divulgacao e jurisdicao'],
                es: ['Elegibilidad, examen y licencia', 'Contrato de representacion y exclusividad', 'Representacion de menores', 'Comision y tope del art. 15', 'Divulgacion y jurisdiccion'],
                en: ['Eligibility, exam and licence', 'Representation agreement and exclusivity', 'Representation of minors', 'Service fee and the art. 15 cap', 'Disclosure and jurisdiction'],
                fr: ['Eligibilite, examen et licence', 'Contrat de representation et exclusivite', 'Representation des mineurs', 'Commission et plafond de l art. 15', 'Publication et competence'] } },
    { mod: 'rstp', weight: 30, edition: '2025',
      url: 'https://digitalhub.fifa.com/m/696d877ea35ca761/original/Regulations-on-the-Status-and-Transfer-of-Players-January-2025-edition.pdf',
      topics: { pt: ['Status do jogador e registro', 'Periodos de registro e CTI', 'Estabilidade contratual (art. 13-17)', 'Protecao de menores (art. 19)', 'Anexo 4 e Anexo 5: formacao e solidariedade'],
                es: ['Estatus del jugador y registro', 'Periodos de inscripcion y CTI', 'Estabilidad contractual (art. 13-17)', 'Proteccion de menores (art. 19)', 'Anexo 4 y Anexo 5: formacion y solidaridad'],
                en: ['Player status and registration', 'Registration periods and ITC', 'Contractual stability (art. 13-17)', 'Protection of minors (art. 19)', 'Annexe 4 and 5: training and solidarity'],
                fr: ['Statut du joueur et enregistrement', 'Periodes d enregistrement et CIT', 'Stabilite contractuelle (art. 13-17)', 'Protection des mineurs (art. 19)', 'Annexes 4 et 5 : formation et solidarite'] } },
    { mod: 'statutes', weight: 10, edition: '2024',
      url: 'https://digitalhub.fifa.com/m/16d1f7349fa19ade/original/FIFA-Statutes-2024.pdf',
      topics: { pt: ['Objetivos e estrutura da FIFA', 'Congresso, Conselho e orgaos judiciais', 'Membros e confederacoes', 'Arbitragem e CAS'],
                es: ['Objetivos y estructura de la FIFA', 'Congreso, Consejo y organos judiciales', 'Miembros y confederaciones', 'Arbitraje y TAS'],
                en: ['FIFA objectives and structure', 'Congress, Council and judicial bodies', 'Members and confederations', 'Arbitration and CAS'],
                fr: ['Objectifs et structure de la FIFA', 'Congres, Conseil et organes judiciaires', 'Membres et confederations', 'Arbitrage et TAS'] } },
    { mod: 'disciplinary', weight: 7, edition: 'Set 2025',
      url: 'https://digitalhub.fifa.com/m/6094262690de769/original/FIFA-Disciplinary-Code-2025.pdf',
      topics: { pt: ['Ambito e sancoes', 'Prescricao', 'Nao cumprimento de decisoes', 'Falsificacao e manipulacao'],
                es: ['Ambito y sanciones', 'Prescripcion', 'Incumplimiento de decisiones', 'Falsificacion y manipulacion'],
                en: ['Scope and sanctions', 'Limitation periods', 'Failure to comply with decisions', 'Forgery and manipulation'],
                fr: ['Champ et sanctions', 'Prescription', 'Inexecution des decisions', 'Falsification et manipulation'] } },
    { mod: 'ethics', weight: 6, edition: '2023',
      url: 'https://digitalhub.fifa.com/m/4f048486c1f7293c/original/FIFA-Code-of-Ethics-2023.pdf',
      topics: { pt: ['Conflito de interesses', 'Presentes e beneficios', 'Suborno e corrupcao', 'Dever de denunciar'],
                es: ['Conflicto de intereses', 'Regalos y beneficios', 'Soborno y corrupcion', 'Deber de denunciar'],
                en: ['Conflicts of interest', 'Gifts and benefits', 'Bribery and corruption', 'Duty to report'],
                fr: ['Conflits d interets', 'Cadeaux et avantages', 'Corruption', 'Obligation de signaler'] } },
    { mod: 'tribunal', weight: 4, edition: 'Jan 2025',
      url: 'https://digitalhub.fifa.com/m/64099da6c2ca3a6d/original/Procedural-Rules-Governing-the-Football-Tribunal-January-2025-edition.pdf',
      topics: { pt: ['Camaras e competencia', 'Prazos e comunicacoes', 'Provas e decisoes', 'Custas e recurso ao CAS'],
                es: ['Camaras y competencia', 'Plazos y comunicaciones', 'Pruebas y decisiones', 'Costas y recurso al TAS'],
                en: ['Chambers and jurisdiction', 'Time limits and communications', 'Evidence and decisions', 'Costs and appeal to CAS'],
                fr: ['Chambres et competence', 'Delais et communications', 'Preuves et decisions', 'Frais et appel au TAS'] } },
    { mod: 'clearinghouse', weight: 3, edition: 'Jan 2025',
      url: 'https://digitalhub.fifa.com/m/7c9e9c5185db9eb6/original/FIFA-Clearing-House-Regulations-January-2025-edition.pdf',
      topics: { pt: ['Passaporte Eletronico do Jogador', 'Allocation Statement', 'Fluxo de pagamento das recompensas de formacao'],
                es: ['Pasaporte Electronico del Jugador', 'Allocation Statement', 'Flujo de pago de recompensas de formacion'],
                en: ['Electronic Player Passport', 'Allocation Statement', 'Training rewards payment flow'],
                fr: ['Passeport electronique du joueur', 'Allocation Statement', 'Flux de paiement des recompenses de formation'] } }
  ];
  var DOC_BY_MOD = {};
  DOCS.forEach(function (x) { DOC_BY_MOD[x.mod] = x; });

  /* ════════════════════════════════════════════════════════════
     CONFIGURACAO DE PAGAMENTO — preencha antes de publicar.

     Escolha UM dos caminhos:

     A) VENDA AUTOMATICA (recomendado). Cadastre o produto numa plataforma que
        entregue "chave de licenca" sozinha por e-mail (Gumroad, Hotmart, Kiwify,
        Lemon Squeezy). Voce cola no painel dela os codigos gerados por
        `python _ferramentas/publicar.py --novas 50`, e ela faz o resto: cobra em
        cartao e PayPal e entrega o codigo na hora, sem voce fazer nada.
        Basta preencher `linkVenda`.

     B) PAYPAL DIRETO. Preencha `paypalMe` com seu usuario do PayPal. O visitante
        paga (com saldo ou cartao, sem precisar de conta) e voce envia o codigo
        manualmente por e-mail depois de conferir o recebimento.

     `email` aparece para o cliente falar com voce e deve estar sempre preenchido.
     ════════════════════════════════════════════════════════════ */
  var PAGAMENTO = {
    email: 'contato@exemplo.com',   // seu e-mail de suporte — sempre preencha

    /* BRASIL — conta InfinitePay.
       A InfinitePay cobra em REAIS e so atende venda dentro do Brasil
       ("o portador do cartao precisa ter CPF"). Aceita Pix, credito e debito.
       Crie um Link de Pagamento no app da InfinitePay e cole a URL aqui. */
    brasil: {
      ativo: false,
      link: '',                     // ex.: 'https://pag.ae/xxxxxxx'
      preco: 'R$ 110',              // como voce quer que apareça no site
      metodos: 'Pix · cartao de credito · debito'
    },

    /* FORA DO BRASIL — a InfinitePay nao cobre. Use Gumroad, Kiwify,
       Lemon Squeezy ou PayPal. Se a plataforma entregar "license key"
       sozinha, cole ali os codigos gerados por publicar.py e a entrega
       vira automatica. */
    internacional: {
      ativo: false,
      link: '',                     // ex.: 'https://seunome.gumroad.com/l/certifa'
      preco: 'US$ 20',
      metodos: 'PayPal · credit card'
    },

    /* Entrega do codigo. 'manual' mostra ao comprador que voce envia por e-mail
       depois de conferir o pagamento; 'automatica' some com esse aviso. */
    entrega: 'manual'
  };

  /* ════════════════════════════════════════════════════════════
     PROVA SOCIAL — só preencha com dado REAL e comprovável.

     Número de aprovação, percentual, depoimento: tudo aqui vira alegação
     publicitária. Se for questionado, o ônus de provar é do anunciante
     (CDC, art. 37). Enquanto não houver aluno e dado apurado, deixe vazio:
     a seção simplesmente não aparece, e o site se sustenta nas afirmações
     verificáveis do bloco "Por que confiar".

     Exemplo de preenchimento correto, depois que existir base:
       numeros: [{ valor: '312', rotulo: 'alunos desde março de 2027' }]
       depoimentos: [{ texto: '...', autor: 'Nome', detalhe: 'aprovado em 04/2027' }]
     ════════════════════════════════════════════════════════════ */
  var PROVA_SOCIAL = {
    numeros: [],
    depoimentos: []
  };

  /* Rotas que exigem licenca. Somente a inicial fica publica. */
  var ROTAS_PROTEGIDAS = ['setup', 'exam', 'result', 'study', 'review', 'stats', 'docs'];

  /* Janelas de exame conhecidas. Edite aqui quando a FIFA publicar novas datas. */
  var EXAM_WINDOWS = [
    { from: '2026-04-28', to: '2026-05-07', label: '2026 · 1a edicao', confirmed: true }
  ];
  var FIFA_AGENTS_URL = 'https://inside.fifa.com/transfer-system/agents/how-to-become-a-licenced-football-agent';

  /* ============================================================
     Estado de execucao
     ============================================================ */
  var S = {
    route: 'home',
    views: [],        // views do simulado corrente
    answers: [],      // array de arrays de indices exibidos
    flags: [],        // booleans
    timer: null,
    running: false,
    result: null,
    examLang: 'es',
    transLang: 'pt',
    hideCount: false,
    reviewFilter: 'all',
    study: { views: [], answers: [], checked: [], module: 'all', qty: 10 }
  };

  /* ============================================================
     Utilidades de interface
     ============================================================ */
  var toastTimer = null;
  function toast(msg) {
    var t = el('toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 3200);
  }

  function modal(title, bodyHTML, actions) {
    var m = el('modal');
    el('modalTitle').textContent = title;
    el('modalBody').innerHTML = bodyHTML;
    var box = el('modalActions');
    box.innerHTML = '';
    (actions || []).forEach(function (a) {
      var b = d.createElement('button');
      b.className = 'btn ' + (a.kind || 'btn--ghost');
      b.textContent = a.label;
      b.addEventListener('click', function () { closeModal(); if (a.onClick) a.onClick(); });
      box.appendChild(b);
    });
    m.hidden = false;
    var first = box.querySelector('button');
    if (first) first.focus();
  }
  function closeModal() { el('modal').hidden = true; }

  function fmtDur(sec) {
    var m = Math.floor(sec / 60), s = sec % 60;
    return m + 'min ' + (s < 10 ? '0' : '') + s + 's';
  }
  function fmtDate(ts) {
    try { return new Date(ts).toLocaleDateString(w.I18N.tag(w.I18N.lang), { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch (e) { return new Date(ts).toISOString().slice(0, 10); }
  }
  function modName(m) { return T('mod.' + m); }

  /* ============================================================
     Roteamento
     ============================================================ */
  var ROUTES = {
    '': 'home', '/': 'home',
    '/simulado': 'setup', '/prova': 'exam', '/resultado': 'result',
    '/estudo': 'study', '/revisao': 'review', '/estatisticas': 'stats', '/documentos': 'docs'
  };

  function go(hash) { w.location.hash = hash; }

  function router() {
    var raw = (w.location.hash || '#/').replace(/^#/, '');
    var route = ROUTES[raw] || 'home';

    // trava a saida durante o simulado
    if (S.running && route !== 'exam') {
      modal(T('exam.confirmTitle'), '<p>' + esc(T('exam.leaveWarn')) + '</p>', [
        { label: T('exam.goBack'), kind: 'btn--outline', onClick: function () { go('/prova'); } },
        { label: T('exam.submitNow'), kind: 'btn--primary', onClick: function () { submitExam(false); } }
      ]);
      go('/prova');
      return;
    }
    // porteiro: sem licenca, so a inicial abre
    if (ROTAS_PROTEGIDAS.indexOf(route) !== -1 && !w.Access.liberado) {
      route = 'locked';
    } else {
      if (route === 'exam' && !S.views.length) route = 'setup';
      if (route === 'result' && !S.result) route = 'home';
    }

    S.route = route;
    $$('.view').forEach(function (v) { v.hidden = true; });
    var node = el('view-' + route);
    if (node) node.hidden = false;

    $$('.mainnav a').forEach(function (a) {
      var r = a.getAttribute('data-route');
      a.classList.toggle('is-active',
        r === route || (route === 'setup' && r === 'exam') || (route === 'result' && r === 'exam'));
      a.classList.toggle('is-locked',
        ROTAS_PROTEGIDAS.indexOf(r) !== -1 && !w.Access.liberado);
    });
    el('mainnav').classList.remove('is-open');
    el('burger').setAttribute('aria-expanded', 'false');
    el('exambar').hidden = (route !== 'exam');
    renderCarimbo();
    el('calcFab').hidden = (route === 'home' || route === 'docs');

    if (route === 'home') renderHome();
    if (route === 'setup') renderSetup();
    if (route === 'result') renderResult();
    if (route === 'study') renderStudyIntro();
    if (route === 'review') renderReview();
    if (route === 'stats') renderStats();
    if (route === 'docs') renderDocs();

    if (route !== 'exam') w.scrollTo({ top: 0, behavior: 'auto' });
  }

  /* ============================================================
     HOME
     ============================================================ */
  function renderHome() {
    var liberado = w.Access.liberado;
    $$('[data-preco]').forEach(function (n) {
      n.textContent = T(n.getAttribute('data-preco'), { preco: precoPrincipal() });
    });

    el('licBarOn').hidden = !liberado;
    el('homePanel').hidden = !liberado;
    if (liberado) {
      var cod = w.Access.codigoSalvo();
      el('licBarCode').textContent = cod ? T('lic.code', { codigo: cod }) : '';
    }

    renderPagamento();
    renderConfianca();
    renderDemo();
    renderFaq();
    el('bankCount').textContent = liberado ? w.Engine.bank().length : w.Access.totalQuestoes;

    if (!liberado) return;   // o painel do aluno so existe com licenca
    renderPainelAluno();
  }

  /* ---------- preco exibido ---------- */
  function pix() {
    var p = w.CERTIFA_PIX;
    return (p && p.ativo && p.brcode) ? p : null;
  }

  function metodosAtivos() {
    var out = [];
    if (pix()) out.push({ id: 'pix', cfg: { preco: pix().valorFmt } });
    if (PAGAMENTO.brasil && PAGAMENTO.brasil.ativo && PAGAMENTO.brasil.link)
      out.push({ id: 'brasil', cfg: PAGAMENTO.brasil });
    if (PAGAMENTO.internacional && PAGAMENTO.internacional.ativo && PAGAMENTO.internacional.link)
      out.push({ id: 'internacional', cfg: PAGAMENTO.internacional });
    return out;
  }

  function precoPrincipal() {
    var m = metodosAtivos();
    if (m.length) return m[0].cfg.preco;
    return (PAGAMENTO.internacional && PAGAMENTO.internacional.preco) || 'US$ 20';
  }

  /* ---------- copiar para a area de transferencia ---------- */
  function copiar(texto) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(texto);
    }
    // navegadores antigos ou contexto sem permissao
    return new Promise(function (ok, falha) {
      var ta = d.createElement('textarea');
      ta.value = texto;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
      d.body.appendChild(ta);
      ta.select();
      var deu = false;
      try { deu = d.execCommand('copy'); } catch (e) { deu = false; }
      d.body.removeChild(ta);
      deu ? ok() : falha(new Error('copia'));
    });
  }

  /* ---------- bloco de pagamento por Pix ---------- */
  function blocoPix() {
    var P = pix();
    if (!P) return '';

    var comprovante = '';
    if (P.whatsapp) {
      var msg = encodeURIComponent(T('pix.msgWhats', { valor: P.valorFmt }));
      comprovante = '<a class="paybtn paybtn--zap" target="_blank" rel="noopener" ' +
        'href="https://wa.me/' + esc(P.whatsapp) + '?text=' + msg + '">' +
        '<span class="paybtn__main">' + esc(T('pix.sendWhats')) + '</span></a>';
    } else {
      comprovante = '<a class="paybtn paybtn--mail" href="mailto:' + esc(PAGAMENTO.email) +
        '?subject=' + encodeURIComponent(T('pix.mailSubject')) + '">' +
        '<span class="paybtn__main">' + esc(T('pix.sendMail')) + '</span></a>';
    }

    return '<div class="pixbox">' +
      '<div class="pixbox__head">' +
        '<span class="pixbox__tag">Pix</span>' +
        '<div><b>' + esc(P.valorFmt) + '</b>' +
        (P.banco ? '<small>' + esc(T('pix.at', { banco: P.banco })) + '</small>' : '') + '</div>' +
      '</div>' +

      // QR de pagamento nao pode ser lazy: o comprador precisa dele na hora em que abre o bloco.
      (P.qr ? '<div class="pixbox__qr"><img src="' + esc(P.qr) + '" alt="' + esc(T('pix.qrAlt')) + '" ' +
              'width="220" height="220" decoding="async" fetchpriority="high"></div>' : '') +

      '<div class="pixbox__copy">' +
        '<label for="pixCode">' + esc(T('pix.copyLabel')) + '</label>' +
        '<div class="pixbox__row">' +
          '<input type="text" id="pixCode" readonly value="' + esc(P.brcode) + '">' +
          '<button type="button" class="btn btn--primary btn--sm" id="pixCopy">' +
            esc(T('pix.copy')) + '</button>' +
        '</div>' +
      '</div>' +

      '<ol class="pixsteps">' +
        '<li>' + esc(T('pix.step1', { valor: P.valorFmt })) + '</li>' +
        '<li>' + esc(T('pix.step2')) + '</li>' +
        '<li>' + esc(T('pix.step3')) + '</li>' +
      '</ol>' +

      comprovante +
      '<p class="pixbox__who">' + esc(T('pix.who', { nome: P.nome })) + '</p>' +
    '</div>';
  }

  function renderPreco() {
    var tag = $('.price__tag');
    if (!tag) return;
    var ativos = metodosAtivos();
    var html = '';
    if (ativos.length > 1) {
      html = ativos.map(function (m) {
        return '<span class="price__alt"><b>' + esc(m.cfg.preco) + '</b>' +
               '<small>' + esc(T('price.' + m.id)) + '</small></span>';
      }).join('');
      tag.classList.add('price__tag--duplo');
    } else {
      html = '<b>' + esc(precoPrincipal()) + '</b><small>' + esc(T('price.once')) + '</small>';
      tag.classList.remove('price__tag--duplo');
    }
    tag.innerHTML = html;
  }

  /* ---------- area de pagamento ---------- */
  function renderPagamento() {
    var box = el('payArea');
    if (!box) return;
    var ativos = metodosAtivos();
    var html = '';

    if (!ativos.length) {
      html = '<div class="payconf"><strong>' + esc(T('pay.configTitle')) + '</strong><br>' +
             esc(T('pay.configBodyPix')) + ' <code>_ferramentas/publicar.py</code></div>';
    } else {
      ativos.forEach(function (m) {
        if (m.id === 'pix') { html += blocoPix(); return; }
        html += '<a class="paybtn paybtn--' + m.id + '" href="' + esc(m.cfg.link) + '" ' +
                'target="_blank" rel="noopener">' +
                '<span class="paybtn__main">' + esc(T('pay.' + m.id)) + ' · ' + esc(m.cfg.preco) + '</span>' +
                '<small>' + esc(m.cfg.metodos || '') + '</small></a>';
      });
    }

    // Com Pix os passos ja explicam a entrega; o aviso generico viraria repeticao.
    if (!pix()) {
      html += '<p class="paynote">' +
        esc(T(PAGAMENTO.entrega === 'manual' ? 'pay.manual' : 'pay.auto', { email: PAGAMENTO.email })) +
      '</p>';
    }
    box.innerHTML = html;

    var btn = el('pixCopy');
    if (btn) {
      btn.addEventListener('click', function () {
        var campo = el('pixCode');
        campo.select();
        copiar(campo.value).then(function () {
          btn.textContent = T('pix.copied');
          toast(T('pix.copied'));
          setTimeout(function () { btn.textContent = T('pix.copy'); }, 2500);
        }).catch(function () {
          toast(T('pix.copyFail'));
        });
      });
    }
    renderPreco();
  }

  /* ---------- credibilidade e prova social ---------- */
  function renderConfianca() {
    var box = el('trustList');
    if (box) {
      var itens = [
        ['trust.1t', T('trust.1d', { n: 8 })],
        ['trust.2t', T('trust.2d', { q: w.Access.totalQuestoes, a: 238 })],
        ['trust.3t', T('trust.3d')],
        ['trust.4t', T('trust.4d')]
      ];
      box.innerHTML = itens.map(function (it) {
        return '<article class="trust"><h3>' + esc(T(it[0])) + '</h3><p>' + esc(it[1]) + '</p></article>';
      }).join('');
    }

    // Só aparece quando houver dado real cadastrado em PROVA_SOCIAL.
    var sec = el('socialProof');
    if (!sec) return;
    var temNumeros = PROVA_SOCIAL.numeros && PROVA_SOCIAL.numeros.length;
    var temDep = PROVA_SOCIAL.depoimentos && PROVA_SOCIAL.depoimentos.length;
    if (!temNumeros && !temDep) { sec.hidden = true; return; }

    sec.hidden = false;
    var h = '<h2 class="section-title">' + esc(T('home.socialTitle')) + '</h2>';
    if (temNumeros) {
      h += '<div class="grid grid--4">' + PROVA_SOCIAL.numeros.map(function (n) {
        return '<div class="tile"><b>' + esc(n.valor) + '</b><span>' + esc(n.rotulo) + '</span></div>';
      }).join('') + '</div>';
    }
    if (temDep) {
      h += '<div class="grid grid--2" style="margin-top:14px">' + PROVA_SOCIAL.depoimentos.map(function (dp) {
        return '<blockquote class="depo"><p>' + esc(dp.texto) + '</p>' +
               '<footer><b>' + esc(dp.autor) + '</b>' +
               (dp.detalhe ? '<span>' + esc(dp.detalhe) + '</span>' : '') + '</footer></blockquote>';
      }).join('') + '</div>';
    }
    sec.innerHTML = h;
  }

  /* ---------- carimbo do titular da licenca ---------- */
  function renderCarimbo() {
    var alvo = el('licStamp');
    if (!alvo) return;
    var t = w.Access.titular;
    if (!w.Access.liberado || !t || !(t.nome || t.email)) { alvo.hidden = true; return; }
    alvo.hidden = false;
    alvo.textContent = T('lic.stamp', { nome: t.nome || t.email, email: t.email || '' });
  }

  /* ---------- 3 questoes fixas de demonstracao ---------- */
  var demoViews = null, demoRespostas = [], demoConferidas = [];

  function renderDemo() {
    var box = el('demoList');
    if (!box) return;
    var banco = w.CERTIFA_DEMO || [];
    if (!banco.length) { box.innerHTML = ''; return; }

    if (!demoViews) {
      // ordem fixa das alternativas: a demonstracao e sempre igual para todo mundo
      demoViews = banco.map(function (q) { return w.Engine.makeView(q, false); });
      demoRespostas = demoViews.map(function () { return []; });
      demoConferidas = demoViews.map(function () { return false; });
    }

    var langAntes = S.examLang, transAntes = S.transLang, hideAntes = S.hideCount;
    S.examLang = w.I18N.lang;                     // demonstracao no idioma da interface
    S.transLang = 'off';
    S.hideCount = false;

    box.innerHTML = demoViews.map(function (v, i) {
      if (demoConferidas[i]) {
        var g = w.Engine.gradeOne(v, demoRespostas[i]);
        return renderQuestionReview({ view: v, index: i, selection: demoRespostas[i], grade: g }, 'study');
      }
      return renderQuestionExam(v, i, demoRespostas[i]).replace(
        '</article>',
        '<div class="rowbtns"><button type="button" class="btn btn--primary btn--sm js-demo-check" data-i="' + i + '">' +
        esc(T('study.check')) + '</button></div></article>'
      );
    }).join('');

    S.examLang = langAntes; S.transLang = transAntes; S.hideCount = hideAntes;
  }

  /* ---------- perguntas frequentes ---------- */
  function renderFaq() {
    var box = el('faqList');
    if (!box) return;
    var html = '';
    for (var i = 1; i <= 6; i++) {
      html += '<details><summary>' + esc(T('faq.q' + i)) + '</summary><p>' + esc(T('faq.a' + i)) + '</p></details>';
    }
    box.innerHTML = html;
  }

  /* ---------- painel do aluno (so com licenca) ---------- */
  function renderPainelAluno() {
    var r = w.Store.readiness();
    var gv = el('readinessVal'), gp = el('gaugePath'), gh = el('readinessHint');
    if (r === null) {
      gv.textContent = '—';
      gp.style.strokeDashoffset = 157;
      gh.textContent = T('home.readinessHint');
    } else {
      gv.textContent = r + '%';
      gp.style.strokeDashoffset = 157 - (157 * Math.min(100, r) / 100);
      gp.style.stroke = r >= 75 ? 'var(--ok)' : (r >= 60 ? 'var(--warn)' : 'var(--bad)');
      gh.textContent = r >= 75 ? T('home.readinessOk') : (r >= 60 ? T('home.readinessMid') : T('home.readinessLow'));
    }

    renderCountdown();

    // ultimas tentativas
    var hist = w.Store.history().slice(0, 4);
    var ul = el('lastAttempts');
    if (!hist.length) {
      ul.innerHTML = '<li class="muted small">' + esc(T('home.noAttempts')) + '</li>';
    } else {
      ul.innerHTML = hist.map(function (h) {
        return '<li><span class="muted small">' + esc(fmtDate(h.ts)) + '</span>' +
          '<b>' + h.score + '/' + h.total + '</b>' +
          '<span class="tagres ' + (h.pass ? 'tagres--pass' : 'tagres--fail') + '">' +
          esc(h.pass ? T('result.pass') : T('result.fail')) + '</span></li>';
      }).join('');
    }

    renderModuleBars(el('moduleBars'), true);
    el('bankCount').textContent = w.Engine.bank().length;
  }

  function renderCountdown() {
    var box = el('countdown'), lab = el('countdownLabel');
    var now = Date.now();
    var next = null;
    EXAM_WINDOWS.forEach(function (x) {
      var to = Date.parse(x.to + 'T23:59:59Z');
      if (to >= now && !next) next = x;
    });
    if (!next) {
      box.innerHTML = '<span data-unit="?">—</span>';
      lab.innerHTML = '<a href="' + FIFA_AGENTS_URL + '" target="_blank" rel="noopener">FIFA.com →</a>';
      return;
    }
    var from = Date.parse(next.from + 'T09:00:00Z');
    if (now >= from) {
      box.innerHTML = '<span data-unit="">' + esc(T('cd.open')) + '</span>';
      lab.textContent = next.label;
      return;
    }
    var diff = Math.max(0, from - now);
    var days = Math.floor(diff / 864e5);
    var hours = Math.floor(diff / 36e5) % 24;
    var mins = Math.floor(diff / 6e4) % 60;
    box.innerHTML =
      '<span data-unit="' + esc(T('unit.d')) + '">' + days + '</span>' +
      '<span data-unit="' + esc(T('unit.h')) + '">' + hours + '</span>' +
      '<span data-unit="' + esc(T('unit.m')) + '">' + mins + '</span>';
    lab.textContent = next.label + (next.confirmed ? '' : ' *');
  }

  function renderModuleBars(target, useCoverage) {
    var stats = w.Store.moduleStats();
    var pools = w.Engine.byModule();
    target.innerHTML = w.Engine.MODULES.map(function (m) {
      var s = stats[m] || [0, 0];
      var pct = s[1] ? Math.round(s[0] / s[1] * 100) : null;
      var cls = pct === null ? '' : (pct >= 75 ? '' : (pct >= 55 ? 'is-mid' : 'is-low'));
      var pool = (pools[m] || []).length;
      var weight = Math.round(w.Engine.MODULE_WEIGHT[m] * 100);
      return '<div class="modbar">' +
        '<div class="modbar__name">' + esc(modName(m)) +
          '<small>' + weight + '% · ' + pool + ' ' + esc(T('common.questions')) + '</small></div>' +
        '<div class="modbar__track"><i class="modbar__fill ' + cls + '" style="width:' + (pct === null ? 0 : pct) + '%"></i></div>' +
        '<div class="modbar__val">' + (pct === null ? '—' : pct + '%') +
          (useCoverage && s[1] ? ' <span class="muted">(' + s[0] + '/' + s[1] + ')</span>' : '') + '</div>' +
      '</div>';
    }).join('');
  }

  /* ============================================================
     SETUP
     ============================================================ */
  function renderSetup() {
    var p = w.Store.prefs();
    S.examLang = p.examLang; S.transLang = p.transLang;
    $$('#examLangChips button').forEach(function (b) {
      b.classList.toggle('is-on', b.getAttribute('data-examlang') === p.examLang);
    });
    $$('#transLangChips button').forEach(function (b) {
      b.classList.toggle('is-on', b.getAttribute('data-translang') === p.transLang);
    });
    el('optStrict').checked = !!p.strict;
    el('optShuffle').checked = !!p.shuffle;
    el('optUnseen').checked = !!p.unseen;
    el('optHideCount').checked = !!p.hideCount;
  }

  /* ============================================================
     RENDERIZACAO DE QUESTAO
     mode: 'exam' | 'review' | 'study'
     ============================================================ */
  function optionCountBadge(view) {
    if (S.hideCount) return T('exam.selectMulti');
    var n = view.correctView.length;
    if (n === 1) return T('exam.selectOne');
    return T('exam.selectN', { n: n });
  }

  function questionHeader(view, i, mode, grade) {
    var q = view.q;
    var badges =
      '<span class="badge badge--mod">' + esc(modName(q.module)) + '</span>' +
      '<span class="badge badge--multi">' + esc(optionCountBadge(view)) + '</span>' +
      '<span class="badge badge--d' + q.difficulty + '">' + esc(T('diff.' + q.difficulty)) + '</span>';

    if (mode === 'review' && grade) {
      var vc = grade.state === 'right' ? 'right' : (grade.state === 'blank' ? 'blank' : 'wrong');
      var vt = grade.state === 'right' ? 'result.verdictRight'
             : (grade.state === 'blank' ? 'result.verdictBlank' : 'result.verdictWrong');
      badges = '<span class="verdict verdict--' + vc + '">' + esc(T(vt)) + '</span>' + badges;
    }

    var tools = '';
    if (mode === 'exam') {
      tools = '<div class="q__tools">' +
        (S.transLang !== 'off' && S.transLang !== S.examLang
          ? '<button type="button" class="qtool js-trans" data-i="' + i + '">⇄ ' + esc(T('exam.translate')) + '</button>' : '') +
        '<button type="button" class="qtool js-flag" data-i="' + i + '">⚑ ' + esc(T('exam.flag')) + '</button>' +
      '</div>';
    } else if (mode === 'study') {
      tools = '<div class="q__tools">' +
        (S.transLang !== 'off' && S.transLang !== S.examLang
          ? '<button type="button" class="qtool js-trans" data-i="' + i + '">⇄ ' + esc(T('exam.translate')) + '</button>' : '') +
      '</div>';
    }

    return '<div class="q__head">' +
      '<span class="q__num">' + (i + 1) + '</span>' +
      '<span class="q__badges">' + badges + '</span>' + tools + '</div>';
  }

  function transPanel(view) {
    if (S.transLang === 'off' || S.transLang === S.examLang) return '';
    var b = view.q.i18n[S.transLang];
    if (!b) return '';
    var lis = view.order.map(function (orig, vi) {
      return '<li><b>' + LETTER[vi] + '</b><span>' + esc(b.options[orig]) + '</span></li>';
    }).join('');
    return '<div class="trans" hidden>' +
      '<div class="trans__label">' + esc(w.I18N.label(S.transLang)) + '</div>' +
      '<p class="trans__stem">' + esc(b.stem) + '</p>' +
      '<ul class="trans__opts">' + lis + '</ul></div>';
  }

  function renderQuestionExam(view, i, selection) {
    var b = view.q.i18n[S.examLang] || view.q.i18n.pt;
    var opts = view.order.map(function (orig, vi) {
      var checked = (selection || []).indexOf(vi) !== -1 ? ' checked' : '';
      return '<li><label class="opt">' +
        '<input type="checkbox" name="q' + i + '" value="' + vi + '"' + checked + '>' +
        '<span class="opt__box"></span>' +
        '<span class="opt__key">' + LETTER[vi] + '</span>' +
        '<span class="opt__text">' + esc(b.options[orig]) + '</span>' +
      '</label></li>';
    }).join('');
    return '<article class="q" id="q' + i + '" data-i="' + i + '">' +
      questionHeader(view, i, 'exam') +
      '<div class="q__stem">' + esc(b.stem) + '</div>' +
      '<ul class="opts">' + opts + '</ul>' +
      transPanel(view) +
    '</article>';
  }

  function citations(q) {
    var doc = DOC_BY_MOD[q.module];
    var arts = (q.articles || []).map(function (a) {
      return doc
        ? '<a href="' + esc(doc.url) + '" target="_blank" rel="noopener">' + esc(a) + ' ↗</a>'
        : '<span>' + esc(a) + '</span>';
    }).join('');
    return '<div class="cite">' + arts + '<span>' + esc(q.sourceDoc) + '</span></div>';
  }

  function renderQuestionReview(item, mode) {
    var view = item.view, i = item.index, grade = item.grade;
    var q = view.q;
    var lang = (mode === 'study') ? S.examLang : S.examLang;
    var b = q.i18n[lang] || q.i18n.pt;
    var sel = item.selection || [];

    var rows = view.order.map(function (orig, vi) {
      var isCorrect = view.correctView.indexOf(vi) !== -1;
      var picked = sel.indexOf(vi) !== -1;
      var cls, mark, tag = '';
      if (isCorrect && picked) { cls = 'ropt--correct'; mark = '✓'; tag = '<span class="ropt__tag ropt__tag--you">' + esc(T('result.yourAnswer')) + '</span>'; }
      else if (isCorrect && !picked) { cls = 'ropt--missed'; mark = '✓'; tag = '<span class="ropt__tag ropt__tag--missed">' + esc(T('result.missed')) + '</span>'; }
      else if (!isCorrect && picked) { cls = 'ropt--wrong'; mark = '✕'; tag = '<span class="ropt__tag ropt__tag--you">' + esc(T('result.yourAnswer')) + '</span>'; }
      else { cls = 'ropt--neutral'; mark = '·'; }
      return '<div class="ropt ' + cls + '">' +
        '<span class="ropt__mark">' + mark + '</span>' +
        '<div class="ropt__body">' +
          '<div class="ropt__text"><b>' + LETTER[vi] + '.</b> ' + esc(b.options[orig]) + tag + '</div>' +
          '<div class="ropt__why">' + esc(b.why[orig]) + '</div>' +
        '</div></div>';
    }).join('');

    var stateCls = grade.state === 'right' ? 'is-right' : (grade.state === 'blank' ? 'is-blank' : 'is-wrong');

    return '<article class="q ' + stateCls + '" data-state="' + grade.state + '" data-i="' + i + '">' +
      questionHeader(view, i, 'review', grade) +
      '<div class="q__stem">' + esc(b.stem) + '</div>' +
      rows +
      '<div class="explain">' +
        '<h5>' + esc(T('result.whyTitle')) + '</h5>' +
        '<p>' + esc(b.explain) + '</p>' +
        '<h5>' + esc(T('result.sourceTitle')) + '</h5>' +
        citations(q) +
      '</div>' +
      transPanelReview(view) +
    '</article>';
  }

  function transPanelReview(view) {
    if (S.transLang === 'off' || S.transLang === S.examLang) return '';
    var b = view.q.i18n[S.transLang];
    if (!b) return '';
    return '<div class="trans">' +
      '<div class="trans__label">' + esc(w.I18N.label(S.transLang)) + '</div>' +
      '<p class="trans__stem">' + esc(b.stem) + '</p>' +
      '<p class="trans__stem"><em>' + esc(b.explain) + '</em></p></div>';
  }

  /* ============================================================
     SIMULADO
     ============================================================ */
  function beginExam() {
    var p = w.Store.prefs();
    S.examLang = p.examLang;
    S.transLang = p.transLang;
    S.hideCount = !!p.hideCount;

    var picked = w.Engine.buildExam({ total: w.Engine.EXAM.QUESTIONS, preferUnseen: !!p.unseen });
    if (picked.length < 5) { toast(T('toast.bankEmpty')); return; }

    S.views = picked.map(function (q) { return w.Engine.makeView(q, !!p.shuffle); });
    S.answers = S.views.map(function () { return []; });
    S.flags = S.views.map(function () { return false; });
    S.result = null;
    S.running = true;

    var form = el('examForm');
    form.innerHTML = S.views.map(function (v, i) { return renderQuestionExam(v, i, []); }).join('');
    buildNav();
    updateProgress();

    S.timer = new w.Engine.Timer(w.Engine.EXAM.MINUTES * 60, tickClock, function () {
      submitExam(true);
    });
    S.timer.start();

    w.addEventListener('beforeunload', beforeUnload);
    go('/prova');
    w.scrollTo({ top: 0 });
  }

  function beforeUnload(e) {
    if (!S.running) return;
    e.preventDefault();
    e.returnValue = '';
    return '';
  }

  function tickClock(left) {
    el('clockText').textContent = w.Engine.fmtClock(left);
    var c = el('clock');
    c.classList.toggle('is-warn', left <= 600 && left > 300);
    c.classList.toggle('is-crit', left <= 300);
  }

  function buildNav() {
    el('qnav').innerHTML = S.views.map(function (v, i) {
      return '<button type="button" data-goto="' + i + '" aria-label="' + (i + 1) + '">' + (i + 1) + '</button>';
    }).join('');
  }

  function updateProgress() {
    var answered = S.answers.filter(function (a) { return a.length; }).length;
    var flagged = S.flags.filter(Boolean).length;
    el('answeredPill').textContent = answered + '/' + S.views.length;
    var fp = el('flagPill');
    fp.hidden = !flagged; fp.textContent = String(flagged);
    el('examProgress').style.width = (answered / S.views.length * 100) + '%';
    $$('#qnav button').forEach(function (b, i) {
      b.classList.toggle('is-done', S.answers[i].length > 0);
      b.classList.toggle('is-flag', !!S.flags[i]);
    });
  }

  function submitExam(auto) {
    if (!S.running) return;
    var doIt = function () {
      S.running = false;
      w.removeEventListener('beforeunload', beforeUnload);
      var secs = S.timer ? S.timer.elapsed() : 0;
      if (S.timer) S.timer.stop();

      S.result = w.Engine.gradeExam(S.views, S.answers, secs, S.examLang);
      S.result.perQuestion.forEach(function (item) {
        w.Store.recordAnswer(item.view.q, item.grade.right);
      });
      w.Store.addAttempt({
        ts: S.result.ts, score: S.result.score, total: S.result.total, pct: S.result.pct,
        pass: S.result.pass, seconds: secs, lang: S.examLang, byModule: S.result.byModule
      });
      w.Store.save();
      S.views = []; S.answers = []; S.flags = [];
      go('/resultado');
    };

    if (auto) {
      doIt();
      modal(T('exam.timeUpTitle'), '<p>' + esc(T('exam.timeUpBody')) + '</p>',
        [{ label: T('common.close'), kind: 'btn--primary' }]);
      return;
    }

    var blank = S.answers.filter(function (a) { return !a.length; }).length;
    var flagged = S.flags.filter(Boolean).length;
    var body = '<p>' + esc(blank ? T('exam.confirmBlank', { n: blank }) : T('exam.confirmAll')) + '</p>';
    if (flagged) body += '<p>' + esc(T('exam.confirmFlag', { n: flagged })) + '</p>';
    modal(T('exam.confirmTitle'), body, [
      { label: T('exam.goBack'), kind: 'btn--outline' },
      { label: T('exam.submitNow'), kind: 'btn--primary', onClick: doIt }
    ]);
  }

  /* ============================================================
     RESULTADO
     ============================================================ */
  function renderResult() {
    var r = S.result;
    if (!r) return;
    var circ = 2 * Math.PI * 65;
    var head = el('resultHead');
    head.innerHTML =
      '<div class="scorering ' + (r.pass ? '' : 'is-fail') + '">' +
        '<svg viewBox="0 0 150 150"><circle class="ring-bg" cx="75" cy="75" r="65"></circle>' +
        '<circle class="ring-fg" cx="75" cy="75" r="65" style="stroke-dasharray:' + circ + ';stroke-dashoffset:' + circ + '"></circle></svg>' +
        '<div class="scorering__mid"><b>' + r.score + '</b><small>/ ' + r.total + '</small></div>' +
      '</div>' +
      '<div>' +
        '<h1 class="result-verdict ' + (r.pass ? 'is-pass' : 'is-fail') + '">' +
          esc(r.pass ? T('result.pass') : T('result.fail')) + '</h1>' +
        '<p class="lede">' + esc(r.pass ? T('result.passMsg') : T('result.failMsg', { n: r.needed })) + '</p>' +
        '<dl class="result-meta">' +
          '<div><dt>%</dt><dd>' + r.pct + '%</dd></div>' +
          '<div><dt>' + esc(T('result.time')) + '</dt><dd>' + esc(fmtDur(r.seconds)) + '</dd></div>' +
          '<div><dt>' + esc(T('result.blank')) + '</dt><dd>' + r.blanks + '</dd></div>' +
          '<div><dt>' + esc(T('result.partial')) + '</dt><dd>' + r.partial + '</dd></div>' +
          '<div><dt>' + esc(T('result.lang')) + '</dt><dd>' + esc(w.I18N.label(r.lang)) + '</dd></div>' +
        '</dl>' +
        (r.partial ? '<p class="microcopy">' + esc(T('result.partialNote')) + '</p>' : '') +
      '</div>';

    // anima o anel
    requestAnimationFrame(function () {
      var ring = head.querySelector('.ring-fg');
      if (ring) ring.style.strokeDashoffset = String(circ - circ * r.score / r.total);
    });

    var charts = el('resultCharts');
    charts.innerHTML = '<div class="card"><h3>' + esc(T('result.byModule')) + '</h3><div class="modules" id="resModules"></div></div>';
    var rm = el('resModules');
    rm.innerHTML = Object.keys(r.byModule).map(function (m) {
      var s = r.byModule[m], pct = Math.round(s[0] / s[1] * 100);
      var cls = pct >= 75 ? '' : (pct >= 55 ? 'is-mid' : 'is-low');
      return '<div class="modbar"><div class="modbar__name">' + esc(modName(m)) + '</div>' +
        '<div class="modbar__track"><i class="modbar__fill ' + cls + '" style="width:' + pct + '%"></i></div>' +
        '<div class="modbar__val">' + s[0] + '/' + s[1] + '</div></div>';
    }).join('');

    renderReviewList();
  }

  function renderReviewList() {
    var r = S.result;
    var list = r.perQuestion.filter(function (it) {
      if (S.reviewFilter === 'all') return true;
      if (S.reviewFilter === 'right') return it.grade.state === 'right';
      if (S.reviewFilter === 'blank') return it.grade.state === 'blank';
      return it.grade.state === 'wrong' || it.grade.state === 'partial';
    });
    el('reviewList').innerHTML = list.map(function (it) { return renderQuestionReview(it, 'review'); }).join('');
  }

  /* ============================================================
     ESTUDO
     ============================================================ */
  function renderStudyIntro() {
    el('studyRunner').hidden = true;
    el('studyRunner').innerHTML = '';
    $$('#view-study .narrow').forEach(function (n) { n.hidden = false; });

    var pools = w.Engine.byModule();
    var box = el('studyModules');
    if (!box.childElementCount) {
      box.innerHTML = '<button type="button" data-smod="all" class="is-on">' + esc(T('study.allModules')) + '</button>' +
        w.Engine.MODULES.map(function (m) {
          return '<button type="button" data-smod="' + m + '">' + esc(modName(m)) +
            ' <span class="muted">(' + ((pools[m] || []).length) + ')</span></button>';
        }).join('');
    } else {
      $$('#studyModules button').forEach(function (b) {
        b.classList.toggle('is-on', b.getAttribute('data-smod') === S.study.module);
      });
    }
  }

  function startStudy(ids) {
    var p = w.Store.prefs();
    S.examLang = p.examLang; S.transLang = p.transLang; S.hideCount = !!p.hideCount;

    var pool;
    if (ids) {
      var map = {};
      w.Engine.bank().forEach(function (q) { map[q.id] = q; });
      pool = ids.map(function (i) { return map[i]; }).filter(Boolean);
    } else {
      pool = S.study.module === 'all'
        ? w.Engine.bank().slice()
        : (w.Engine.byModule()[S.study.module] || []);
      pool = w.Engine.prioritise(pool, true);
      if (S.study.qty) pool = pool.slice(0, S.study.qty);
    }
    if (!pool.length) { toast(T('study.empty')); return; }

    S.study.views = pool.map(function (q) { return w.Engine.makeView(q, !!p.shuffle); });
    S.study.answers = S.study.views.map(function () { return []; });
    S.study.checked = S.study.views.map(function () { return false; });
    return true;
  }

  function renderStudyRunner(container) {
    container.hidden = false;
    container.innerHTML = S.study.views.map(function (v, i) {
      if (S.study.checked[i]) {
        var grade = w.Engine.gradeOne(v, S.study.answers[i]);
        return renderQuestionReview({ view: v, index: i, selection: S.study.answers[i], grade: grade }, 'study');
      }
      return renderQuestionExam(v, i, S.study.answers[i]).replace(
        '</article>',
        '<div class="rowbtns"><button type="button" class="btn btn--primary btn--sm js-check" data-i="' + i + '">' +
        esc(T('study.check')) + '</button></div></article>'
      );
    }).join('');
  }

  /* ============================================================
     DECK DE REVISAO
     ============================================================ */
  function renderReview() {
    el('deckRunner').hidden = true;
    el('deckRunner').innerHTML = '';
    $$('#view-review .narrow').forEach(function (n) { n.hidden = false; });

    var due = w.Store.deckDue().length;
    var all = w.Store.deckAll().length;
    el('deckStats').innerHTML =
      '<div><b>' + due + '</b><span>' + esc(T('review.due')) + '</span></div>' +
      '<div><b>' + all + '</b><span>' + esc(T('review.total')) + '</span></div>' +
      '<div><b>' + w.Store.masteredCount() + '</b><span>' + esc(T('review.mastered')) + '</span></div>';
    el('startDeck').disabled = !all;
  }

  /* ============================================================
     ESTATISTICAS
     ============================================================ */
  function renderStats() {
    var h = w.Store.history();
    var attempts = h.length;
    var avg = attempts ? Math.round(h.reduce(function (s, r) { return s + r.pct; }, 0) / attempts) : 0;
    var best = attempts ? Math.max.apply(null, h.map(function (r) { return r.pct; })) : 0;
    var passRate = attempts ? Math.round(h.filter(function (r) { return r.pass; }).length / attempts * 100) : 0;

    el('statTiles').innerHTML = [
      ['stats.attempts', attempts],
      ['stats.avg', avg + '%'],
      ['stats.best', best + '%'],
      ['stats.passRate', passRate + '%']
    ].map(function (t) {
      return '<div class="tile"><b>' + esc(t[1]) + '</b><span>' + esc(T(t[0])) + '</span></div>';
    }).join('');

    renderModuleBars(el('statModules'), true);

    var tb = $('#historyTable tbody');
    if (!attempts) {
      tb.innerHTML = '<tr><td colspan="6" class="muted small">' + esc(T('stats.noHistory')) + '</td></tr>';
    } else {
      tb.innerHTML = h.map(function (r) {
        return '<tr><td>' + esc(fmtDate(r.ts)) + '</td><td>' + r.score + '/' + r.total + '</td>' +
          '<td>' + r.pct + '%</td><td>' + esc(fmtDur(r.seconds)) + '</td>' +
          '<td>' + esc(w.I18N.label(r.lang)) + '</td>' +
          '<td><span class="tagres ' + (r.pass ? 'tagres--pass' : 'tagres--fail') + '">' +
          esc(r.pass ? T('result.pass') : T('result.fail')) + '</span></td></tr>';
      }).join('');
    }

    var weak = w.Store.weakArticles(16);
    el('weakArticles').innerHTML = weak.length
      ? weak.map(function (x) {
          return '<span>' + esc(x.article) + ' <b>' + x.wrong + '/' + x.total + '</b></span>';
        }).join('')
      : '<span class="muted small">' + esc(T('stats.weakEmpty')) + '</span>';
  }

  /* ============================================================
     DOCUMENTOS
     ============================================================ */
  function renderDocs() {
    var L = w.I18N.lang;
    el('docsGrid').innerHTML = DOCS.map(function (x) {
      var topics = (x.topics[L] || x.topics.en).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('');
      return '<article class="card doccard">' +
        '<div class="doccard__top"><h3>' + esc(modName(x.mod)) + '</h3>' +
          '<span class="doccard__w">' + x.weight + '% ' + esc(T('docs.weight')) + '</span></div>' +
        '<p class="muted small">' + esc(x.edition) + '</p>' +
        '<ul>' + topics + '</ul>' +
        '<a class="btn btn--outline btn--sm" href="' + esc(x.url) + '" target="_blank" rel="noopener">' +
          esc(T('docs.open')) + ' ↗</a>' +
      '</article>';
    }).join('');
  }

  /* ============================================================
     TEMA
     ============================================================ */
  function initTheme() {
    var saved = null;
    try { saved = localStorage.getItem('certifa.theme'); } catch (e) { /* noop */ }
    if (saved === 'dark' || saved === 'light') d.documentElement.setAttribute('data-theme', saved);
    else d.documentElement.removeAttribute('data-theme');

    el('themeBtn').addEventListener('click', function () {
      var cur = d.documentElement.getAttribute('data-theme');
      var sysDark = w.matchMedia && w.matchMedia('(prefers-color-scheme: dark)').matches;
      var next = cur ? (cur === 'dark' ? 'light' : 'dark') : (sysDark ? 'light' : 'dark');
      d.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('certifa.theme', next); } catch (e) { /* noop */ }
    });
  }

  /* ============================================================
     EVENTOS
     ============================================================ */
  function wire() {
    // idioma da interface
    $$('[data-uilang]').forEach(function (b) {
      b.addEventListener('click', function () {
        w.I18N.set(b.getAttribute('data-uilang'));
      });
    });
    d.addEventListener('i18n:change', function () {
      $$('[data-uilang]').forEach(function (b) {
        b.classList.toggle('is-on', b.getAttribute('data-uilang') === w.I18N.lang);
      });
      router();
    });

    el('burger').addEventListener('click', function () {
      var open = el('mainnav').classList.toggle('is-open');
      el('burger').setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    /* ---------- acesso: liberar, sair, demonstracao ---------- */
    el('codeForm').addEventListener('submit', function (e) {
      e.preventDefault();
      submeterCodigo();
    });
    el('codeInput').addEventListener('input', function () {
      // formata enquanto digita: CTF-XXXX-XXXX-XXXX
      var pos = this.selectionStart, antes = this.value.length;
      this.value = w.Access.formatar(this.value);
      if (pos === antes) this.setSelectionRange(this.value.length, this.value.length);
      msgCodigo('', null);
    });
    el('licLogout').addEventListener('click', function () {
      w.Access.sair();
      toast(T('lic.logout'));
      go('/');
      router();
    });
    el('demoList').addEventListener('click', function (e) {
      var b = e.target.closest('.js-demo-check');
      if (!b) return;
      var i = parseInt(b.getAttribute('data-i'), 10);
      demoConferidas[i] = true;
      renderDemo();
      var node = el('demoList').querySelector('[data-i="' + i + '"]');
      if (node) node.scrollIntoView({ behavior: 'auto', block: 'center' });
    });
    el('demoList').addEventListener('change', function (e) {
      if (!e.target.matches('input[type=checkbox]')) return;
      var card = e.target.closest('.q');
      var i = parseInt(card.getAttribute('data-i'), 10);
      demoRespostas[i] = $$('input:checked', card)
        .map(function (n) { return parseInt(n.value, 10); })
        .sort(function (a, b) { return a - b; });
    });
    d.addEventListener('acesso:mudou', function () { router(); });

    // setup
    $$('#examLangChips button').forEach(function (b) {
      b.addEventListener('click', function () {
        w.Store.setPref('examLang', b.getAttribute('data-examlang'));
        renderSetup();
      });
    });
    $$('#transLangChips button').forEach(function (b) {
      b.addEventListener('click', function () {
        w.Store.setPref('transLang', b.getAttribute('data-translang'));
        renderSetup();
      });
    });
    [['optStrict', 'strict'], ['optShuffle', 'shuffle'], ['optUnseen', 'unseen'], ['optHideCount', 'hideCount']]
      .forEach(function (pair) {
        el(pair[0]).addEventListener('change', function () { w.Store.setPref(pair[1], this.checked); });
      });
    el('beginExam').addEventListener('click', beginExam);

    // simulado — marcacao de alternativas
    el('examForm').addEventListener('change', function (e) {
      var input = e.target;
      if (!input.matches('input[type=checkbox]')) return;
      var card = input.closest('.q');
      var i = parseInt(card.getAttribute('data-i'), 10);
      var vals = $$('input:checked', card).map(function (n) { return parseInt(n.value, 10); });
      vals.sort(function (a, b) { return a - b; });
      S.answers[i] = vals;
      updateProgress();
    });

    el('examForm').addEventListener('click', function (e) {
      var flag = e.target.closest('.js-flag');
      if (flag) {
        var fi = parseInt(flag.getAttribute('data-i'), 10);
        S.flags[fi] = !S.flags[fi];
        flag.classList.toggle('is-on', S.flags[fi]);
        el('q' + fi).classList.toggle('is-flagged', S.flags[fi]);
        updateProgress();
        return;
      }
      var tr = e.target.closest('.js-trans');
      if (tr) {
        var card = tr.closest('.q');
        var panel = $('.trans', card);
        if (panel) { panel.hidden = !panel.hidden; tr.classList.toggle('is-on-t', !panel.hidden); }
      }
    });

    el('qnav').addEventListener('click', function (e) {
      var b = e.target.closest('[data-goto]');
      if (!b) return;
      var node = el('q' + b.getAttribute('data-goto'));
      if (node) node.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (w.innerWidth <= 1080) el('examSide').classList.remove('is-open');
    });

    el('navToggle').addEventListener('click', function () {
      el('examSide').classList.toggle('is-open');
    });
    el('submitExam').addEventListener('click', function () { submitExam(false); });
    el('submitExam2').addEventListener('click', function () { submitExam(false); });

    // resultado
    $$('#reviewFilter button').forEach(function (b) {
      b.addEventListener('click', function () {
        $$('#reviewFilter button').forEach(function (x) { x.classList.remove('is-on'); });
        b.classList.add('is-on');
        S.reviewFilter = b.getAttribute('data-filter');
        renderReviewList();
      });
    });
    el('retryExam').addEventListener('click', function () { go('/simulado'); });
    el('addToDeck').addEventListener('click', function () {
      if (!S.result) return;
      var ids = S.result.perQuestion
        .filter(function (it) { return !it.grade.right; })
        .map(function (it) { return it.view.q.id; });
      w.Store.deckAdd(ids);
      toast(T('result.deckAdded', { n: ids.length }));
    });

    el('reviewList').addEventListener('click', function (e) {
      var tr = e.target.closest('.js-trans');
      if (!tr) return;
      var panel = $('.trans', tr.closest('.q'));
      if (panel) panel.hidden = !panel.hidden;
    });

    // estudo
    el('studyModules').addEventListener('click', function (e) {
      var b = e.target.closest('[data-smod]');
      if (!b) return;
      S.study.module = b.getAttribute('data-smod');
      $$('#studyModules button').forEach(function (x) { x.classList.remove('is-on'); });
      b.classList.add('is-on');
    });
    $$('#studyQty button').forEach(function (b) {
      b.addEventListener('click', function () {
        S.study.qty = parseInt(b.getAttribute('data-qty'), 10);
        $$('#studyQty button').forEach(function (x) { x.classList.remove('is-on'); });
        b.classList.add('is-on');
      });
    });
    el('startStudy').addEventListener('click', function () {
      if (!startStudy(null)) return;
      $$('#view-study .narrow').forEach(function (n) { n.hidden = true; });
      renderStudyRunner(el('studyRunner'));
      w.scrollTo({ top: 0 });
    });

    ['studyRunner', 'deckRunner'].forEach(function (id) {
      var container = el(id);
      container.addEventListener('change', function (e) {
        if (!e.target.matches('input[type=checkbox]')) return;
        var card = e.target.closest('.q');
        var i = parseInt(card.getAttribute('data-i'), 10);
        S.study.answers[i] = $$('input:checked', card)
          .map(function (n) { return parseInt(n.value, 10); })
          .sort(function (a, b) { return a - b; });
      });
      container.addEventListener('click', function (e) {
        var chk = e.target.closest('.js-check');
        if (chk) {
          var i = parseInt(chk.getAttribute('data-i'), 10);
          S.study.checked[i] = true;
          var v = S.study.views[i];
          var g = w.Engine.gradeOne(v, S.study.answers[i]);
          w.Store.recordAnswer(v.q, g.right);
          w.Store.save();
          renderStudyRunner(container);
          var node = container.querySelector('[data-i="' + i + '"]');
          if (node) node.scrollIntoView({ behavior: 'auto', block: 'center' });
          return;
        }
        var tr = e.target.closest('.js-trans');
        if (tr) {
          var panel = $('.trans', tr.closest('.q'));
          if (panel) { panel.hidden = !panel.hidden; tr.classList.toggle('is-on-t', !panel.hidden); }
        }
      });
    });

    // deck
    el('startDeck').addEventListener('click', function () {
      var due = w.Store.deckDue();
      var ids = due.length ? due : w.Store.deckAll();
      if (!ids.length) {
        modal(T('review.emptyTitle'), '<p>' + esc(T('review.emptyBody')) + '</p>',
          [{ label: T('common.close'), kind: 'btn--primary' }]);
        return;
      }
      if (!startStudy(ids)) return;
      $$('#view-review .narrow').forEach(function (n) { n.hidden = true; });
      renderStudyRunner(el('deckRunner'));
      w.scrollTo({ top: 0 });
    });
    el('clearDeck').addEventListener('click', function () {
      w.Store.deckClear(); renderReview(); toast(T('review.cleared'));
    });

    // estatisticas
    el('exportData').addEventListener('click', function () {
      var blob = new Blob([w.Store.exportJSON()], { type: 'application/json' });
      var a = d.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'certifa-progresso.json';
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
      toast(T('stats.exported'));
    });
    el('importData').addEventListener('change', function () {
      var f = this.files && this.files[0];
      if (!f) return;
      var fr = new FileReader();
      fr.onload = function () {
        try { w.Store.importJSON(String(fr.result)); renderStats(); toast(T('stats.imported')); }
        catch (e) { toast(T('stats.importError')); }
      };
      fr.readAsText(f);
      this.value = '';
    });
    el('resetData').addEventListener('click', function () {
      modal(T('stats.resetTitle'), '<p>' + esc(T('stats.resetBody')) + '</p>', [
        { label: T('common.cancel'), kind: 'btn--outline' },
        { label: T('stats.reset'), kind: 'btn--primary', onClick: function () { w.Store.reset(); renderStats(); } }
      ]);
    });

    // modal: fecha no ESC e no clique fora
    el('modal').addEventListener('click', function (e) { if (e.target === this) closeModal(); });
    d.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !el('modal').hidden) closeModal();
    });

    w.addEventListener('hashchange', router);
  }

  /* ---------- liberar acesso pelo codigo ---------- */
  function msgCodigo(texto, tipo) {
    var m = el('codeMsg');
    if (!texto) { m.hidden = true; m.textContent = ''; return; }
    m.hidden = false;
    m.textContent = texto;
    m.className = 'codemsg codemsg--' + (tipo || 'info');
  }

  function submeterCodigo() {
    var campo = el('codeInput'), botao = el('codeSubmit');
    var codigo = campo.value;

    if (!w.Access.temCripto) { msgCodigo(T('code.noCrypto'), 'erro'); return; }
    if (w.Access.canonizar(codigo).length < 15) { msgCodigo(T('code.short'), 'erro'); return; }

    botao.disabled = true;
    msgCodigo(T('code.checking'), 'info');

    w.Access.desbloquear(codigo).then(function (questoes) {
      msgCodigo(T('code.ok', { n: questoes.length }), 'ok');
      campo.value = '';
      botao.disabled = false;
      w.scrollTo({ top: 0, behavior: 'smooth' });
    }).catch(function (err) {
      botao.disabled = false;
      var m = String(err && err.message);
      if (m === 'sem-cripto') msgCodigo(T('code.noCrypto'), 'erro');
      else if (m === 'sem-licencas') msgCodigo(T('code.noLicenses'), 'erro');
      else if (m === 'codigo-invalido') msgCodigo(T('code.invalid'), 'erro');
      else msgCodigo(T('code.error'), 'erro');
    });
  }

  /* ============================================================
     BOOT
     ============================================================ */
  function boot() {
    w.I18N.init();
    initTheme();
    w.Calc.init();
    wire();

    var p = w.Store.prefs();
    S.examLang = p.examLang; S.transLang = p.transLang; S.hideCount = !!p.hideCount;

    $$('[data-uilang]').forEach(function (b) {
      b.classList.toggle('is-on', b.getAttribute('data-uilang') === w.I18N.lang);
    });
    el('bankCount').textContent = w.Access.totalQuestoes;

    // tenta retomar uma licenca ja liberada neste navegador antes de decidir a rota
    w.Access.retomar().catch(function () { return false; }).then(function () {
      router();
    });

    setInterval(function () {
      if (S.route === 'home' && w.Access.liberado) renderCountdown();
    }, 30000);

    if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
      navigator.serviceWorker.register('sw.js').catch(function () { /* offline opcional */ });
    }
  }

  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window, document);
