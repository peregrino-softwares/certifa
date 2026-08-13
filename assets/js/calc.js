/* ============================================================
   Calculadora — tres modos:
     1. Padrao          : aritmetica com fita de historico
     2. Comissao        : teto do art. 15 FFAR (faixa progressiva)
     3. Solidariedade   : Anexo 5 do RSTP (5% distribuido por idade)
   ============================================================ */
(function (w, d) {
  'use strict';

  var el = function (id) { return d.getElementById(id); };
  var T = function (k, v) { return w.I18N ? w.I18N.t(k, v) : k; };

  /* ---------- formatacao ---------- */
  function nf(n, dec) {
    if (!isFinite(n)) return '—';
    var loc = w.I18N ? w.I18N.tag(w.I18N.lang) : 'pt-BR';
    try {
      return n.toLocaleString(loc, {
        minimumFractionDigits: dec === undefined ? 2 : dec,
        maximumFractionDigits: dec === undefined ? 2 : dec
      });
    } catch (e) { return n.toFixed(dec === undefined ? 2 : dec); }
  }
  function usd(n) { return 'USD ' + nf(n, 2); }
  function num(id) { var v = parseFloat((el(id) || {}).value); return isFinite(v) ? v : 0; }

  /* ============================================================
     1. Calculadora padrao
     ============================================================ */
  var calc = {
    acc: null,      // acumulador
    op: null,       // operador pendente
    entry: '0',     // digitacao atual
    fresh: true,    // proximo digito recomeca a entrada
    tape: ''
  };

  function screenSet(txt) {
    var s = el('calcScreen'); if (s) s.textContent = txt;
  }
  function tapeSet(txt) {
    var s = el('calcTape'); if (s) s.textContent = txt;
  }
  function render() {
    var v = parseFloat(calc.entry);
    screenSet(calc.entry === '' || isNaN(v) ? calc.entry || '0'
      : (calc.entry.slice(-1) === '.' ? calc.entry : nf(v, countDec(calc.entry))));
    tapeSet(calc.tape);
  }
  function countDec(s) {
    var i = String(s).indexOf('.');
    return i === -1 ? 0 : Math.min(8, String(s).length - i - 1);
  }
  function applyOp(a, op, b) {
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '*': return a * b;
      case '/': return b === 0 ? NaN : a / b;
      default: return b;
    }
  }
  var OPSYM = { '+': '+', '-': '−', '*': '×', '/': '÷' };

  function press(k) {
    var v = parseFloat(calc.entry) || 0;

    if (/^[0-9]$/.test(k)) {
      calc.entry = (calc.fresh || calc.entry === '0') ? k : calc.entry + k;
      calc.fresh = false;
    } else if (k === '.') {
      if (calc.fresh) { calc.entry = '0.'; calc.fresh = false; }
      else if (calc.entry.indexOf('.') === -1) calc.entry += '.';
    } else if (k === 'C') {
      calc.acc = null; calc.op = null; calc.entry = '0'; calc.fresh = true; calc.tape = '';
    } else if (k === 'back') {
      if (!calc.fresh) {
        calc.entry = calc.entry.length > 1 ? calc.entry.slice(0, -1) : '0';
        if (calc.entry === '-' || calc.entry === '') calc.entry = '0';
      }
    } else if (k === 'neg') {
      calc.entry = (calc.entry.charAt(0) === '-') ? calc.entry.slice(1) : '-' + calc.entry;
    } else if (k === '%') {
      /* Comportamento de calculadora comum:
           200000 x 5 %  =  ->  10.000   (o % vira fator 0,05)
           200    + 10 %  =  ->  220     (o % vira parcela do acumulador)
           5 %               ->  0,05    (sem operacao pendente) */
      var pct;
      if (calc.op === '+' || calc.op === '-') pct = (calc.acc || 0) * v / 100;
      else pct = v / 100;
      calc.entry = String(pct);
      calc.fresh = false;
    } else if (k === '+' || k === '-' || k === '*' || k === '/') {
      if (calc.op !== null && !calc.fresh) {
        calc.acc = applyOp(calc.acc, calc.op, v);
        calc.entry = String(calc.acc);
      } else if (calc.acc === null) {
        calc.acc = v;
      }
      calc.op = k;
      calc.fresh = true;
      calc.tape = nf(calc.acc, countDec(String(calc.acc))) + ' ' + OPSYM[k];
    } else if (k === '=') {
      if (calc.op !== null && calc.acc !== null) {
        var res = applyOp(calc.acc, calc.op, v);
        calc.tape = nf(calc.acc, countDec(String(calc.acc))) + ' ' + OPSYM[calc.op] + ' ' +
                    nf(v, countDec(String(v))) + ' =';
        calc.acc = null; calc.op = null;
        calc.entry = isFinite(res) ? String(res) : 'Erro';
        calc.fresh = true;
      }
    }
    render();
  }

  /* ============================================================
     2. Teto de comissao — FFAR art. 15
     Faixa progressiva sobre a remuneracao ANUAL:
       · ate USD 200.000 .......... percentual cheio
       · sobre o excedente ........ percentual reduzido
     Representacao unica (jogador OU entidade contratante): 5% / 3%
     Dupla representacao permitida ..........................: 10% / 6%
     Entidade cedente: 10% da compensacao de transferencia (sem faixa)
     ============================================================ */
  var THRESHOLD = 200000;
  var TIERS = {
    single: { low: 0.05, high: 0.03 },
    dual:   { low: 0.10, high: 0.06 }
  };

  function feeCap(remun, mode) {
    var t = TIERS[mode] || TIERS.single;
    var low = Math.min(remun, THRESHOLD) * t.low;
    var high = Math.max(0, remun - THRESHOLD) * t.high;
    return {
      low: low, high: high, total: low + high,
      lowPct: t.low * 100, highPct: t.high * 100,
      lowBase: Math.min(remun, THRESHOLD), highBase: Math.max(0, remun - THRESHOLD)
    };
  }

  function renderFee() {
    var out = el('feeOut'); if (!out) return;
    var mode = (el('feeRep') || {}).value || 'single';
    var wrap = el('feeTransferWrap');
    if (wrap) wrap.hidden = (mode !== 'releasing');

    if (mode === 'releasing') {
      var tc = num('feeTransfer');
      var cap = tc * 0.10;
      out.innerHTML =
        '<span class="big">' + usd(cap) + '</span>' +
        '<table><tr><td>' + esc(T('calc.transferFee')) + '</td><td>' + usd(tc) + '</td></tr>' +
        '<tr><td>10%</td><td>' + usd(cap) + '</td></tr></table>';
      return;
    }

    var remun = num('feeRemun');
    var years = Math.max(1, Math.round(num('feeYears')) || 1);
    var r = feeCap(remun, mode);
    out.innerHTML =
      '<span class="big">' + usd(r.total) + '</span>' +
      '<div class="small">' + esc(T('calc.capPerYear')) + '</div>' +
      '<table>' +
        '<tr><td>' + esc(T('calc.tier1')) + ' · ' + nf(r.lowPct, 0) + '%</td><td>' + usd(r.low) + '</td></tr>' +
        '<tr><td>' + esc(T('calc.tier2')) + ' · ' + nf(r.highPct, 0) + '%</td><td>' + usd(r.high) + '</td></tr>' +
        '<tr><td><b>' + esc(T('calc.capContract')) + ' (' + years + '×)</b></td><td><b>' + usd(r.total * years) + '</b></td></tr>' +
      '</table>';
  }

  /* ============================================================
     3. Mecanismo de solidariedade — RSTP, Anexo 5
     5% da compensacao formam o bolo. Distribuicao por ano civil:
       12, 13, 14, 15 anos -> 5% do bolo cada  (= 0,25% do total)
       16 a 23 anos ........ -> 10% do bolo cada (= 0,50% do total)
     ============================================================ */
  function solShare(age) { return (age >= 12 && age <= 15) ? 0.05 : (age >= 16 && age <= 23 ? 0.10 : 0); }

  function buildSolYears() {
    var box = el('solYearsBox'); if (!box || box.childElementCount) return;
    var html = '';
    for (var a = 12; a <= 23; a++) {
      html += '<label><input type="checkbox" data-age="' + a + '">' + a +
              '<small>' + (a <= 15 ? '.25' : '.50') + '%</small></label>';
    }
    box.innerHTML = html;
    box.addEventListener('change', renderSol);
  }

  function renderSol() {
    var out = el('solOut'); if (!out) return;
    var comp = num('solComp');
    var pool = comp * 0.05;
    var ages = [];
    d.querySelectorAll('#solYearsBox input:checked').forEach(function (i) {
      ages.push(parseInt(i.getAttribute('data-age'), 10));
    });
    if (!ages.length) {
      out.innerHTML = '<span class="big">' + usd(0) + '</span><div class="small">' + esc(T('calc.selectYears')) + '</div>';
      return;
    }
    ages.sort(function (a, b) { return a - b; });
    var rows = '', due = 0;
    ages.forEach(function (a) {
      var v = pool * solShare(a);
      due += v;
      rows += '<tr><td>' + a + ' ' + (a <= 15 ? '(0,25%)' : '(0,50%)') + '</td><td>' + usd(v) + '</td></tr>';
    });
    out.innerHTML =
      '<span class="big">' + usd(due) + '</span>' +
      '<div class="small">' + esc(T('calc.solTotal')) + '</div>' +
      '<table>' + rows +
      '<tr><td><b>' + esc(T('calc.solPool')) + '</b></td><td><b>' + usd(pool) + '</b></td></tr></table>';
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /* ============================================================
     Ligacoes de interface
     ============================================================ */
  function show(on) {
    var c = el('calc'); if (!c) return;
    c.hidden = !on;
    if (on) { buildSolYears(); render(); renderFee(); renderSol(); }
  }
  function toggle() { var c = el('calc'); show(!!(c && c.hidden)); }

  function tab(name) {
    d.querySelectorAll('[data-calctab]').forEach(function (b) {
      b.classList.toggle('is-on', b.getAttribute('data-calctab') === name);
    });
    d.querySelectorAll('.calc__pane').forEach(function (p) {
      p.hidden = p.getAttribute('data-pane') !== name;
    });
    if (name === 'fee') renderFee();
    if (name === 'sol') { buildSolYears(); renderSol(); }
  }

  function init() {
    d.querySelectorAll('.calc__keys [data-k]').forEach(function (b) {
      b.addEventListener('click', function () { press(b.getAttribute('data-k')); });
    });
    d.querySelectorAll('[data-calctab]').forEach(function (b) {
      b.addEventListener('click', function () { tab(b.getAttribute('data-calctab')); });
    });
    ['feeRemun', 'feeYears', 'feeRep', 'feeTransfer'].forEach(function (id) {
      var n = el(id); if (n) n.addEventListener('input', renderFee);
      if (n && n.tagName === 'SELECT') n.addEventListener('change', renderFee);
    });
    var sc = el('solComp'); if (sc) sc.addEventListener('input', renderSol);

    var close = el('calcClose'); if (close) close.addEventListener('click', function () { show(false); });
    var fab = el('calcFab'); if (fab) fab.addEventListener('click', toggle);
    var tgl = el('calcToggle'); if (tgl) tgl.addEventListener('click', toggle);

    // teclado numerico enquanto a calculadora esta aberta
    d.addEventListener('keydown', function (e) {
      var c = el('calc');
      if (!c || c.hidden) return;
      var t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return;
      var k = e.key;
      if (/^[0-9]$/.test(k)) { press(k); e.preventDefault(); }
      else if (k === '.' || k === ',') { press('.'); e.preventDefault(); }
      else if ('+-*/'.indexOf(k) !== -1) { press(k); e.preventDefault(); }
      else if (k === 'Enter' || k === '=') { press('='); e.preventDefault(); }
      else if (k === 'Backspace') { press('back'); e.preventDefault(); }
      else if (k === 'Escape') { show(false); }
      else if (k === '%') { press('%'); e.preventDefault(); }
    });

    d.addEventListener('i18n:change', function () { render(); renderFee(); renderSol(); });
    render();
  }

  w.Calc = { init: init, show: show, toggle: toggle, feeCap: feeCap, solShare: solShare };
})(window, document);
