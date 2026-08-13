/* ============================================================
   Store — persistencia local (localStorage), sem servidor.
   Guarda historico de simulados, estatisticas por questao,
   deck de revisao (Leitner) e preferencias.
   ============================================================ */
(function (w) {
  'use strict';

  var KEY = 'certifa.data.v1';
  var MAX_HISTORY = 60;

  var EMPTY = {
    version: 1,
    prefs: { examLang: 'es', transLang: 'pt', strict: true, shuffle: true, unseen: true, hideCount: false },
    history: [],   // {id,ts,score,total,pct,pass,seconds,lang,byModule:{mod:[ok,total]}}
    seen: {},      // questionId -> {n, ok, wrong, lastTs}
    deck: {},      // questionId -> {box:1..5, due:ts, streak:n}
    articles: {}   // "FFAR art. 15(2)" -> {ok, wrong}
  };

  var available = (function () {
    try {
      var k = '__certifa_probe__';
      localStorage.setItem(k, '1');
      localStorage.removeItem(k);
      return true;
    } catch (e) { return false; }
  })();

  var mem = null;

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function load() {
    if (mem) return mem;
    if (!available) { mem = clone(EMPTY); return mem; }
    try {
      var raw = localStorage.getItem(KEY);
      mem = raw ? JSON.parse(raw) : clone(EMPTY);
    } catch (e) { mem = clone(EMPTY); }
    // preenche chaves ausentes de versoes antigas
    Object.keys(EMPTY).forEach(function (k) {
      if (mem[k] === undefined) mem[k] = clone(EMPTY[k]);
    });
    Object.keys(EMPTY.prefs).forEach(function (k) {
      if (mem.prefs[k] === undefined) mem.prefs[k] = EMPTY.prefs[k];
    });
    return mem;
  }

  function save() {
    if (!available) return;
    try { localStorage.setItem(KEY, JSON.stringify(load())); }
    catch (e) {
      // cota estourada: descarta historico antigo e tenta de novo
      var d = load();
      d.history = d.history.slice(0, 10);
      try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e2) { /* desiste */ }
    }
  }

  /* ---------- Preferencias ---------- */
  function prefs() { return load().prefs; }
  function setPref(k, v) { load().prefs[k] = v; save(); }

  /* ---------- Registro de respostas ---------- */
  // Intervalos Leitner em dias por caixa
  var BOX_DAYS = [0, 1, 3, 7, 16, 35];

  function recordAnswer(q, isRight) {
    var d = load();
    var s = d.seen[q.id] || { n: 0, ok: 0, wrong: 0, lastTs: 0 };
    s.n++; if (isRight) s.ok++; else s.wrong++;
    s.lastTs = Date.now();
    d.seen[q.id] = s;

    (q.articles || []).forEach(function (a) {
      var st = d.articles[a] || { ok: 0, wrong: 0 };
      if (isRight) st.ok++; else st.wrong++;
      d.articles[a] = st;
    });

    var card = d.deck[q.id];
    if (isRight) {
      if (card) {
        card.streak = (card.streak || 0) + 1;
        if (card.streak >= 2) { delete d.deck[q.id]; }
        else {
          card.box = Math.min(5, (card.box || 1) + 1);
          card.due = Date.now() + BOX_DAYS[card.box] * 864e5;
        }
      }
    } else {
      card = card || { box: 1, streak: 0 };
      card.box = 1; card.streak = 0;
      card.due = Date.now() + BOX_DAYS[1] * 864e5;
      d.deck[q.id] = card;
    }
  }

  /* ---------- Deck ---------- */
  function deckDue() {
    var d = load(), now = Date.now(), out = [];
    Object.keys(d.deck).forEach(function (id) {
      if ((d.deck[id].due || 0) <= now) out.push(id);
    });
    return out;
  }
  function deckAll() { return Object.keys(load().deck); }
  function deckAdd(ids) {
    var d = load(), now = Date.now();
    ids.forEach(function (id) {
      if (!d.deck[id]) d.deck[id] = { box: 1, streak: 0, due: now };
    });
    save();
  }
  function deckClear() { load().deck = {}; save(); }
  function masteredCount() {
    var d = load(), n = 0;
    Object.keys(d.seen).forEach(function (id) {
      var s = d.seen[id];
      if (!d.deck[id] && s.ok > 0 && s.ok >= s.wrong) n++;
    });
    return n;
  }

  /* ---------- Historico ---------- */
  function addAttempt(a) {
    var d = load();
    d.history.unshift(a);
    if (d.history.length > MAX_HISTORY) d.history.length = MAX_HISTORY;
    save();
  }
  function history() { return load().history; }

  function seenIds() { return Object.keys(load().seen); }
  function seenOf(id) { return load().seen[id] || null; }

  /* ---------- Agregados ---------- */
  function moduleStats() {
    var d = load(), out = {};
    d.history.forEach(function (h) {
      Object.keys(h.byModule || {}).forEach(function (m) {
        var r = out[m] || [0, 0];
        r[0] += h.byModule[m][0]; r[1] += h.byModule[m][1];
        out[m] = r;
      });
    });
    return out;
  }

  function weakArticles(limit) {
    var d = load(), rows = [];
    Object.keys(d.articles).forEach(function (a) {
      var s = d.articles[a], tot = s.ok + s.wrong;
      if (tot >= 2 && s.wrong > 0) rows.push({ article: a, wrong: s.wrong, total: tot, rate: s.wrong / tot });
    });
    rows.sort(function (x, y) { return (y.rate - x.rate) || (y.wrong - x.wrong); });
    return rows.slice(0, limit || 14);
  }

  function readiness() {
    var h = history();
    if (!h.length) return null;
    var recent = h.slice(0, 5);
    var avg = recent.reduce(function (s, r) { return s + r.pct; }, 0) / recent.length;
    // penaliza pouca amostra
    var confidence = Math.min(1, recent.length / 3);
    return Math.round(avg * confidence + (avg * (1 - confidence) * 0.72));
  }

  /* ---------- Export / import / reset ---------- */
  function exportJSON() { return JSON.stringify(load(), null, 2); }

  function importJSON(text) {
    var obj = JSON.parse(text);
    if (!obj || typeof obj !== 'object' || obj.version !== 1) throw new Error('formato');
    mem = obj;
    Object.keys(EMPTY).forEach(function (k) { if (mem[k] === undefined) mem[k] = clone(EMPTY[k]); });
    save();
  }

  function reset() {
    mem = clone(EMPTY);
    if (available) { try { localStorage.removeItem(KEY); } catch (e) { /* noop */ } }
  }

  w.Store = {
    available: available,
    prefs: prefs, setPref: setPref,
    recordAnswer: recordAnswer, save: save,
    deckDue: deckDue, deckAll: deckAll, deckAdd: deckAdd, deckClear: deckClear, masteredCount: masteredCount,
    addAttempt: addAttempt, history: history,
    seenIds: seenIds, seenOf: seenOf,
    moduleStats: moduleStats, weakArticles: weakArticles, readiness: readiness,
    exportJSON: exportJSON, importJSON: importJSON, reset: reset
  };
})(window);
