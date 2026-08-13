/* ============================================================
   Access — controle de acesso e decifragem do banco de questoes.

   O banco publicado (data/questions.enc.js) e um bloco cifrado. Sem uma
   licenca valida nao existe caminho para le-lo: a chave do conteudo nao esta
   em lugar nenhum do site, ela e reconstruida a partir do codigo do cliente.

   Cadeia de derivacao (espelha _ferramentas/publicar.py):

     codigo do cliente
        -> canonizar (maiusculas, so alfanumerico)
        -> SHA-256("certifa:lookup|" + codigo)  ..... localiza a licenca
        -> PBKDF2-SHA256(codigo, salt, 210000)  ..... chave derivada (dk)
        -> SHA-256(dk + "certifa:wrap"/"certifa:wmac")
        -> confere HMAC e decifra a chave do conteudo
        -> SHA-256(chave + "certifa:enc"/"certifa:mac")
        -> confere HMAC e decifra o banco

   Precisa de contexto seguro (https ou localhost) porque usa crypto.subtle.
   ============================================================ */
(function (w, d) {
  'use strict';

  var LS_KEY = 'certifa.licenca.v1';
  var subtle = (w.crypto && w.crypto.subtle) || null;

  var estado = {
    liberado: false,
    licenca: null,     // identificador curto (look) da licenca em uso
    titular: null,     // {nome, email} do comprador, quando a licenca e nominal
    motivo: null       // 'sem-cripto' | 'codigo-invalido' | 'pacote-invalido'
  };

  /* ---------- base64 <-> bytes ---------- */
  function deB64(s) {
    var bin = atob(s), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function paraB64(bytes) {
    var s = '', b = new Uint8Array(bytes);
    for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return btoa(s);
  }
  function hex(bytes) {
    var b = new Uint8Array(bytes), s = '';
    for (var i = 0; i < b.length; i++) s += b[i].toString(16).padStart(2, '0');
    return s;
  }
  function concat(a, b) {
    var out = new Uint8Array(a.length + b.length);
    out.set(a, 0); out.set(b, a.length);
    return out;
  }
  function texto(s) { return new TextEncoder().encode(s); }

  /* ---------- primitivas ---------- */
  function sha256(bytes) {
    return subtle.digest('SHA-256', bytes).then(function (b) { return new Uint8Array(b); });
  }

  function pbkdf2(senhaBytes, salt, iteracoes) {
    return subtle.importKey('raw', senhaBytes, 'PBKDF2', false, ['deriveBits'])
      .then(function (k) {
        return subtle.deriveBits(
          { name: 'PBKDF2', salt: salt, iterations: iteracoes, hash: 'SHA-256' }, k, 256);
      })
      .then(function (b) { return new Uint8Array(b); });
  }

  function hmacConfere(chave, dados, macEsperado) {
    return subtle.importKey('raw', chave, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
      .then(function (k) { return subtle.verify('HMAC', k, macEsperado, dados); });
  }

  function aesCtr(chave, iv, dados) {
    return subtle.importKey('raw', chave, 'AES-CTR', false, ['decrypt'])
      .then(function (k) {
        return subtle.decrypt({ name: 'AES-CTR', counter: iv, length: 128 }, k, dados);
      })
      .then(function (b) { return new Uint8Array(b); });
  }

  /* ---------- normalizacao do codigo ---------- */
  function canonizar(codigo) {
    return String(codigo || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  }
  function formatar(codigo) {
    var c = canonizar(codigo);
    if (c.indexOf('CTF') !== 0) return c;
    var corpo = c.slice(3), partes = [];
    for (var i = 0; i < corpo.length; i += 4) partes.push(corpo.slice(i, i + 4));
    return 'CTF-' + partes.join('-');
  }

  /* ---------- abrir o banco com a chave do conteudo ---------- */
  function abrirBanco(contentKey) {
    var pacote = w.CERTIFA_ENC;
    if (!pacote) return Promise.reject(new Error('pacote-ausente'));
    var iv = deB64(pacote.iv), ct = deB64(pacote.ct), mac = deB64(pacote.mac);

    return Promise.all([
      sha256(concat(contentKey, texto('certifa:enc'))),
      sha256(concat(contentKey, texto('certifa:mac')))
    ]).then(function (ks) {
      return hmacConfere(ks[1], concat(iv, ct), mac).then(function (ok) {
        if (!ok) throw new Error('pacote-invalido');
        return aesCtr(ks[0], iv, ct);
      });
    }).then(function (claro) {
      var questoes = JSON.parse(new TextDecoder().decode(claro));
      if (!Array.isArray(questoes) || !questoes.length) throw new Error('pacote-invalido');
      w.CERTIFA_BANK = questoes;
      return questoes;
    });
  }

  /* ---------- dados do titular (licenca nominal) ---------- */
  function abrirTitular(entrada, chaves) {
    if (!entrada.t) return Promise.resolve(null);
    var iv = deB64(entrada.t.iv), ct = deB64(entrada.t.ct), mac = deB64(entrada.t.mac);
    return hmacConfere(chaves[1], concat(iv, ct), mac).then(function (ok) {
      if (!ok) return null;
      return aesCtr(chaves[0], iv, ct).then(function (claro) {
        try {
          var o = JSON.parse(new TextDecoder().decode(claro));
          return { nome: o.n || '', email: o.e || '' };
        } catch (e) { return null; }
      });
    }).catch(function () { return null; });
  }

  /* ---------- desbloquear com um codigo ---------- */
  function desbloquear(codigoDigitado) {
    if (!subtle) {
      estado.motivo = 'sem-cripto';
      return Promise.reject(new Error('sem-cripto'));
    }
    var codigo = canonizar(codigoDigitado);
    if (codigo.length < 8) return Promise.reject(new Error('codigo-invalido'));

    var lic = w.CERTIFA_LIC;
    if (!lic || !lic.entries || !lic.entries.length) return Promise.reject(new Error('sem-licencas'));

    return sha256(texto('certifa:lookup|' + codigo)).then(function (h) {
      var look = hex(h).slice(0, 16);
      var entrada = null;
      for (var i = 0; i < lic.entries.length; i++) {
        if (lic.entries[i].look === look) { entrada = lic.entries[i]; break; }
      }
      // Codigo desconhecido ou licenca revogada caem no mesmo lugar, de proposito:
      // nao entregamos ao visitante a informacao de qual dos dois aconteceu.
      if (!entrada) throw new Error('codigo-invalido');

      return pbkdf2(texto(codigo), deB64(entrada.salt), lic.iter || 210000)
        .then(function (dk) {
          return Promise.all([
            sha256(concat(dk, texto('certifa:wrap'))),
            sha256(concat(dk, texto('certifa:wmac')))
          ]);
        })
        .then(function (ks) {
          var iv = deB64(entrada.iv), embrulhada = deB64(entrada.k), mac = deB64(entrada.mac);
          return hmacConfere(ks[1], concat(iv, embrulhada), mac).then(function (ok) {
            if (!ok) throw new Error('codigo-invalido');
            return aesCtr(ks[0], iv, embrulhada).then(function (ck) { return [ck, ks]; });
          });
        })
        .then(function (r) {
          var contentKey = r[0], chaves = r[1];
          return abrirTitular(entrada, chaves).then(function (titular) {
            return abrirBanco(contentKey).then(function (questoes) {
              try {
                localStorage.setItem(LS_KEY, JSON.stringify({
                  look: entrada.look, ck: paraB64(contentKey),
                  codigo: formatar(codigo), titular: titular
                }));
              } catch (e) { /* navegador sem storage: vale so nesta sessao */ }
              estado.liberado = true;
              estado.licenca = entrada.look;
              estado.titular = titular;
              estado.motivo = null;
              d.dispatchEvent(new CustomEvent('acesso:mudou', { detail: { liberado: true } }));
              return questoes;
            });
          });
        });
    });
  }

  /* ---------- retomar sessao ja liberada ---------- */
  function retomar() {
    if (!subtle) { estado.motivo = 'sem-cripto'; return Promise.resolve(false); }
    var salvo;
    try { salvo = JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch (e) { salvo = null; }
    if (!salvo || !salvo.ck) return Promise.resolve(false);

    // a licenca ainda consta na lista publicada? se foi revogada, some daqui.
    var lic = w.CERTIFA_LIC, aindaVale = false;
    if (lic && lic.entries) {
      for (var i = 0; i < lic.entries.length; i++) {
        if (lic.entries[i].look === salvo.look) { aindaVale = true; break; }
      }
    }
    if (!aindaVale) { sair(); return Promise.resolve(false); }

    return abrirBanco(deB64(salvo.ck)).then(function () {
      estado.liberado = true;
      estado.licenca = salvo.look;
      estado.titular = salvo.titular || null;
      return true;
    }).catch(function () { sair(); return false; });
  }

  function sair() {
    try { localStorage.removeItem(LS_KEY); } catch (e) { /* noop */ }
    estado.liberado = false;
    estado.licenca = null;
    estado.titular = null;
    w.CERTIFA_BANK = [];
    d.dispatchEvent(new CustomEvent('acesso:mudou', { detail: { liberado: false } }));
  }

  function codigoSalvo() {
    try { return (JSON.parse(localStorage.getItem(LS_KEY) || 'null') || {}).codigo || null; }
    catch (e) { return null; }
  }

  w.Access = {
    get liberado() { return estado.liberado; },
    get titular() { return estado.titular; },
    get motivo() { return estado.motivo; },
    get temCripto() { return !!subtle; },
    get totalQuestoes() { return (w.CERTIFA_ENC && w.CERTIFA_ENC.n) || 0; },
    canonizar: canonizar,
    formatar: formatar,
    desbloquear: desbloquear,
    retomar: retomar,
    sair: sair,
    codigoSalvo: codigoSalvo
  };
})(window, document);
