/* ============================================================
   Engine — montagem do simulado, correcao e cronometro.

   Fidelidade ao exame oficial da FIFA:
     · 20 questoes, 60 minutos, nota de corte 75% (15/20)
     · cada questao vale 5% e so pontua se TOTALMENTE correta
     · em branco / parcialmente correta / incorreta = zero
     · uma ou mais alternativas podem estar corretas
   ============================================================ */
(function (w) {
  'use strict';

  var EXAM = {
    QUESTIONS: 20,
    MINUTES: 60,
    PASS_PCT: 75,
    PASS_SCORE: 15,
    WEIGHT_PER_Q: 5
  };

  /* Peso alvo por modulo. Aproxima a distribuicao divulgada
     para o exame: ~40% FFAR, ~30% RSTP, ~30% demais regulamentos. */
  var MODULE_WEIGHT = {
    ffar: 0.40,
    rstp: 0.30,
    statutes: 0.10,
    disciplinary: 0.07,
    ethics: 0.06,
    tribunal: 0.04,
    clearinghouse: 0.03
  };

  var MODULES = Object.keys(MODULE_WEIGHT);

  /* ---------- utilidades ---------- */
  function shuffle(arr) {
    var a = arr.slice(), i, j, t;
    for (i = a.length - 1; i > 0; i--) {
      j = Math.floor(Math.random() * (i + 1));
      t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function bank() { return (w.CERTIFA_BANK || []); }

  function byModule() {
    var m = {};
    bank().forEach(function (q) { (m[q.module] = m[q.module] || []).push(q); });
    return m;
  }

  /* Ordena um pool priorizando questoes ineditas e depois as mais erradas. */
  function prioritise(pool, preferUnseen) {
    if (!preferUnseen) return shuffle(pool);
    var fresh = [], known = [];
    pool.forEach(function (q) {
      var s = w.Store ? w.Store.seenOf(q.id) : null;
      if (!s) fresh.push(q); else known.push({ q: q, score: (s.wrong + 1) / (s.n + 1), n: s.n });
    });
    known.sort(function (a, b) { return (b.score - a.score) || (a.n - b.n); });
    return shuffle(fresh).concat(known.map(function (k) { return k.q; }));
  }

  /**
   * Monta uma prova de 20 questoes respeitando o peso por modulo.
   * Se algum modulo nao tiver questoes suficientes, redistribui o que faltar.
   */
  function buildExam(opts) {
    opts = opts || {};
    var total = opts.total || EXAM.QUESTIONS;
    var pools = byModule();
    var quotas = {}, assigned = 0, rests = [];

    /* Alocacao por maior resto (Hare), com desempate aleatorio.
       Sem isso um modulo de 3% nunca cairia numa prova de 20 questoes
       (0,03 x 20 = 0,6 -> piso zero). Com o resto sorteado, ele aparece
       em cerca de 60% das provas — que e exatamente o peso pretendido. */
    MODULES.forEach(function (m) {
      var ideal = MODULE_WEIGHT[m] * total;
      var have = (pools[m] || []).length;
      quotas[m] = Math.min(Math.floor(ideal), have);
      assigned += quotas[m];
      if (quotas[m] < have) rests.push({ m: m, r: ideal - Math.floor(ideal) });
    });

    rests.sort(function (a, b) { return (b.r - a.r) || (Math.random() - 0.5); });
    var ri = 0, guard = 0;
    while (assigned < total && rests.length && guard++ < 500) {
      var cand = rests[ri % rests.length];
      if (quotas[cand.m] < (pools[cand.m] || []).length) { quotas[cand.m]++; assigned++; }
      ri++;
      if (ri > rests.length * 40) break; // banco esgotado
    }

    // Se ainda faltar (banco pequeno), completa com quem tiver sobra
    var order = MODULES.slice().sort(function (a, b) { return MODULE_WEIGHT[b] - MODULE_WEIGHT[a]; });
    guard = 0;
    while (assigned < total && guard++ < 500) {
      var progressed = false;
      for (var i = 0; i < order.length && assigned < total; i++) {
        var m2 = order[i];
        if (quotas[m2] < (pools[m2] || []).length) { quotas[m2]++; assigned++; progressed = true; }
      }
      if (!progressed) break;
    }

    var picked = [];
    MODULES.forEach(function (m) {
      if (!quotas[m]) return;
      picked = picked.concat(prioritise(pools[m] || [], opts.preferUnseen).slice(0, quotas[m]));
    });

    // Embaralha a ordem final, mas evita duas questoes seguidas do mesmo artigo
    picked = shuffle(picked);
    for (var k = 1; k < picked.length; k++) {
      if (picked[k].articles[0] === picked[k - 1].articles[0]) {
        for (var j = k + 1; j < picked.length; j++) {
          if (picked[j].articles[0] !== picked[k - 1].articles[0]) {
            var tmp = picked[k]; picked[k] = picked[j]; picked[j] = tmp;
            break;
          }
        }
      }
    }
    return picked;
  }

  /**
   * Prepara a "visao" de uma questao: ordem das alternativas (embaralhada ou nao)
   * e o mapeamento entre indice exibido e indice original.
   */
  function makeView(q, shuffleOpts) {
    var n = q.i18n.pt.options.length;
    var order = [];
    for (var i = 0; i < n; i++) order.push(i);
    if (shuffleOpts) order = shuffle(order);
    var correctView = [];
    order.forEach(function (orig, viewIdx) {
      if (q.correct.indexOf(orig) !== -1) correctView.push(viewIdx);
    });
    correctView.sort(function (a, b) { return a - b; });
    return { id: q.id, q: q, order: order, correctView: correctView };
  }

  /** Corrige uma questao. selecao = array de indices EXIBIDOS. */
  function gradeOne(view, selection) {
    var sel = (selection || []).slice().sort(function (a, b) { return a - b; });
    var cor = view.correctView;
    if (!sel.length) return { state: 'blank', right: false, hits: 0, misses: cor.length, falsePos: 0 };
    var hits = 0, falsePos = 0;
    sel.forEach(function (i) { if (cor.indexOf(i) !== -1) hits++; else falsePos++; });
    var misses = cor.length - hits;
    var right = (misses === 0 && falsePos === 0);
    return {
      state: right ? 'right' : (hits > 0 ? 'partial' : 'wrong'),
      right: right, hits: hits, misses: misses, falsePos: falsePos
    };
  }

  /** Corrige a prova inteira e devolve o boletim. */
  function gradeExam(views, answers, seconds, lang) {
    var perQuestion = [], score = 0, blanks = 0, partial = 0;
    var byMod = {};

    views.forEach(function (v, i) {
      var g = gradeOne(v, answers[i]);
      if (g.right) score++;
      if (g.state === 'blank') blanks++;
      if (g.state === 'partial') partial++;

      var m = v.q.module;
      byMod[m] = byMod[m] || [0, 0];
      byMod[m][1]++;
      if (g.right) byMod[m][0]++;

      perQuestion.push({ index: i, view: v, selection: (answers[i] || []).slice(), grade: g });
    });

    var pct = Math.round((score / views.length) * 100);
    return {
      score: score,
      total: views.length,
      pct: pct,
      pass: score >= Math.ceil(views.length * EXAM.PASS_PCT / 100),
      needed: Math.max(0, Math.ceil(views.length * EXAM.PASS_PCT / 100) - score),
      blanks: blanks,
      partial: partial,
      seconds: seconds,
      lang: lang,
      byModule: byMod,
      perQuestion: perQuestion,
      ts: Date.now()
    };
  }

  /* ---------- Cronometro ---------- */
  function Timer(totalSeconds, onTick, onEnd) {
    this.total = totalSeconds;
    this.onTick = onTick;
    this.onEnd = onEnd;
    this.startedAt = 0;
    this.handle = null;
    this.ended = false;
  }
  Timer.prototype.start = function () {
    var self = this;
    this.startedAt = Date.now();
    this.ended = false;
    var tick = function () {
      var left = self.total - Math.floor((Date.now() - self.startedAt) / 1000);
      if (left <= 0) {
        self.stop();
        self.ended = true;
        if (self.onTick) self.onTick(0);
        if (self.onEnd) self.onEnd();
        return;
      }
      if (self.onTick) self.onTick(left);
    };
    tick();
    // 250ms mantem o relogio correto mesmo se a aba for suspensa (usa Date.now)
    this.handle = setInterval(tick, 250);
  };
  Timer.prototype.stop = function () {
    if (this.handle) { clearInterval(this.handle); this.handle = null; }
  };
  Timer.prototype.elapsed = function () {
    return Math.min(this.total, Math.floor((Date.now() - this.startedAt) / 1000));
  };

  function fmtClock(sec) {
    sec = Math.max(0, sec | 0);
    var m = Math.floor(sec / 60), s = sec % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  w.Engine = {
    EXAM: EXAM,
    MODULES: MODULES,
    MODULE_WEIGHT: MODULE_WEIGHT,
    bank: bank,
    byModule: byModule,
    buildExam: buildExam,
    makeView: makeView,
    gradeOne: gradeOne,
    gradeExam: gradeExam,
    shuffle: shuffle,
    prioritise: prioritise,
    Timer: Timer,
    fmtClock: fmtClock
  };
})(window);
