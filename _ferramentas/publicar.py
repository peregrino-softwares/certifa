# -*- coding: utf-8 -*-
"""
Empacota o site para publicacao: cifra o banco de questoes e emite licencas.

    python _ferramentas/publicar.py               reconstroi os arquivos publicados
    python _ferramentas/publicar.py --novas 10    emite 10 codigos novos
    python _ferramentas/publicar.py --novas 1 --nota "maria@email.com"
    python _ferramentas/publicar.py --listar      mostra os codigos emitidos
    python _ferramentas/publicar.py --revogar CTF-AAAA-BBBB-CCCC

O QUE VAI PARA O GITHUB (cifrado, seguro de publicar):
    data/questions.enc.js   banco de questoes cifrado com AES-256-CTR
    data/licencas.js        so hashes e chaves embrulhadas — nao contem nenhum codigo
    data/demo.js            as 3 questoes de demonstracao, em texto puro (de proposito)

O QUE FICA SO NA SUA MAQUINA (nunca publique):
    _ferramentas/chave-mestra.json   chave do conteudo + todos os codigos emitidos
    _pesquisa/                       banco em texto puro

Perder `chave-mestra.json` significa perder o acesso ao proprio conteudo publicado
e ter de reemitir todos os codigos. Faca copia de seguranca dela.
"""
import argparse, base64, glob, hashlib, hmac, json, os, re, secrets, sys, datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import aes  # noqa: E402
import pix  # noqa: E402

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BANK = os.path.join(RAIZ, '_pesquisa', 'bank')
DATA = os.path.join(RAIZ, 'data')
MESTRA = os.path.join(RAIZ, '_ferramentas', 'chave-mestra.json')
CODIGOS_TXT = os.path.join(RAIZ, '_ferramentas', 'codigos-emitidos.txt')

ITER = 210000                       # PBKDF2-SHA256, recomendacao OWASP
ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'   # sem I, O, 0, 1 (confundem na leitura)
PREFIXO = 'CTF'

# ══════════════════════════════════════════════════════════════════
#  RECEBIMENTO POR PIX — preencha com os dados da sua conta.
#
#  Vale para qualquer banco, inclusive Banco do Brasil. A chave e o nome
#  precisam ser EXATAMENTE os que estao cadastrados no banco, senao o app
#  do pagador recusa o QR.
#
#  Depois de preencher, rode:  python _ferramentas/publicar.py
#  Sao gerados o "Copia e Cola" e o QR em assets/img/pix-qr.png.
# ══════════════════════════════════════════════════════════════════
PIX = {
    'ativo': True,
    'chave': '+5531998886452',
    'nome': 'Guilherme Martins Ribeiro Hesse',   # truncado a 25 caracteres no QR (limite do padrao Pix)
    'cidade': 'Paraopeba',
    'valor': 110.00,                   # em reais
    'banco': 'Banco do Brasil',        # so aparece na tela, para o comprador reconhecer
    'whatsapp': '5531998886452',       # com DDI 55 — vira o botao de enviar comprovante
}

# As 3 questoes fixas da pagina inicial. Uma com 1 correta, uma com 2 e uma com 3,
# para o visitante entender na pratica a correcao tudo-ou-nada.
DEMO_IDS = ['FFA1-001', 'RST1-002', 'FFA2-003']


# ─────────────────────────── utilidades ───────────────────────────
def b64(b):
    return base64.b64encode(b).decode('ascii')


def sha256(*partes):
    h = hashlib.sha256()
    for p in partes:
        h.update(p)
    return h.digest()


def canonizar(codigo):
    """'ctf-7k3m 9qx2-4b8t' -> 'CTF7K3M9QX24B8T'. O JS faz exatamente o mesmo."""
    return ''.join(c for c in codigo.upper() if c.isalnum())


def formatar(bruto):
    """'CTF7K3M9QX24B8T' -> 'CTF-7K3M-9QX2-4B8T'"""
    corpo = bruto[len(PREFIXO):]
    return PREFIXO + '-' + '-'.join(corpo[i:i + 4] for i in range(0, len(corpo), 4))


def novo_codigo():
    return PREFIXO + ''.join(secrets.choice(ALFABETO) for _ in range(12))


# ─────────────────────────── estado local ───────────────────────────
def carregar_mestra():
    if os.path.exists(MESTRA):
        with open(MESTRA, encoding='utf-8') as f:
            return json.load(f)
    m = {'contentKey': b64(secrets.token_bytes(32)), 'licencas': []}
    salvar_mestra(m)
    print('* chave-mestra.json criada. Guarde uma copia fora desta pasta.')
    return m


def salvar_mestra(m):
    os.makedirs(os.path.dirname(MESTRA), exist_ok=True)
    with open(MESTRA, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(m, f, ensure_ascii=False, indent=2)


# ─────────────────────────── banco de questoes ───────────────────────────
def carregar_banco():
    qs = []
    for arq in sorted(glob.glob(os.path.join(BANK, '*.json'))):
        with open(arq, encoding='utf-8') as f:
            qs.extend(json.load(f))
    qs.sort(key=lambda q: q['id'])
    if not qs:
        sys.exit('ERRO: nenhuma questao encontrada em _pesquisa/bank/')
    return qs


def escrever_js(caminho, variavel, obj, cabecalho):
    with open(caminho, 'w', encoding='utf-8', newline='\n') as f:
        f.write('/* %s */\n' % cabecalho)
        f.write('window.%s = ' % variavel)
        json.dump(obj, f, ensure_ascii=False, separators=(',', ':'))
        f.write(';\n')


# ─────────────────────────── cifragem ───────────────────────────
def cifrar_banco(questoes, content_key):
    claro = json.dumps(questoes, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    enc_key = sha256(content_key, b'certifa:enc')
    mac_key = sha256(content_key, b'certifa:mac')
    iv = secrets.token_bytes(16)
    ct = aes.ctr(claro, enc_key, iv)
    mac = hmac.new(mac_key, iv + ct, hashlib.sha256).digest()
    return {'v': 1, 'n': len(questoes), 'iv': b64(iv), 'ct': b64(ct), 'mac': b64(mac)}, len(claro)


def embrulhar(codigo_bruto, content_key, titular=None):
    """
    Embrulha a chave do conteudo com a chave derivada do codigo do cliente.

    `titular` ({'nome':..., 'email':...}) e cifrado junto, com a mesma chave.
    So quem tem o codigo consegue ler — e, depois de liberar, o site carimba
    esse nome em todas as telas. E o que desestimula o repasse da chave.
    """
    salt = secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac('sha256', codigo_bruto.encode('utf-8'), salt, ITER, 32)
    wrap_key = sha256(dk, b'certifa:wrap')
    wrap_mac = sha256(dk, b'certifa:wmac')
    iv = secrets.token_bytes(16)
    embrulhada = aes.ctr(content_key, wrap_key, iv)
    mac = hmac.new(wrap_mac, iv + embrulhada, hashlib.sha256).digest()

    entrada = {
        'look': sha256(b'certifa:lookup|', codigo_bruto.encode('utf-8')).hex()[:16],
        'salt': b64(salt), 'iv': b64(iv), 'k': b64(embrulhada), 'mac': b64(mac)
    }

    if titular and (titular.get('nome') or titular.get('email')):
        claro = json.dumps({'n': titular.get('nome', ''), 'e': titular.get('email', '')},
                           ensure_ascii=False, separators=(',', ':')).encode('utf-8')
        tiv = secrets.token_bytes(16)
        tct = aes.ctr(claro, wrap_key, tiv)
        entrada['t'] = {
            'iv': b64(tiv), 'ct': b64(tct),
            'mac': b64(hmac.new(wrap_mac, tiv + tct, hashlib.sha256).digest())
        }

    return entrada


# ─────────────────────────── publicacao ───────────────────────────
def publicar(m):
    os.makedirs(DATA, exist_ok=True)
    questoes = carregar_banco()
    content_key = base64.b64decode(m['contentKey'])

    # 1. demonstracao em texto puro
    por_id = {q['id']: q for q in questoes}
    faltando = [i for i in DEMO_IDS if i not in por_id]
    if faltando:
        sys.exit('ERRO: questoes de demonstracao inexistentes: %s' % ', '.join(faltando))
    demo = [por_id[i] for i in DEMO_IDS]
    escrever_js(os.path.join(DATA, 'demo.js'), 'CERTIFA_DEMO', demo,
                'Questoes de demonstracao — publicas de proposito. Gerado por publicar.py.')

    # 2. banco cifrado
    pacote, bruto = cifrar_banco(questoes, content_key)
    escrever_js(os.path.join(DATA, 'questions.enc.js'), 'CERTIFA_ENC', pacote,
                'Banco cifrado (AES-256-CTR + HMAC-SHA256). Gerado por publicar.py. Nao editar.')

    # 3. licencas ativas
    ativas = [l for l in m['licencas'] if l.get('ativa', True)]
    entradas = [embrulhar(canonizar(l['codigo']), content_key,
                          {'nome': l.get('nome', ''), 'email': l.get('email', '')})
                for l in ativas]
    escrever_js(os.path.join(DATA, 'licencas.js'), 'CERTIFA_LIC',
                {'v': 1, 'iter': ITER, 'entries': entradas},
                'Licencas: hashes e chaves embrulhadas. Nenhum codigo em claro. Gerado por publicar.py.')

    # 4. dados do Pix (Copia e Cola + QR)
    gerar_pix()

    # 5. forca cache-bust: cada publicacao muda a URL de TODOS os assets.
    # Sem isso, um navegador que visitou o site ha pouco continua servindo
    # do proprio cache HTTP uma licenca ja revogada, ou nao enxerga uma
    # licenca nova recem-emitida, por ate 10 minutos (Cache-Control do
    # GitHub Pages). Isso quebra a garantia de revogacao do paywall.
    atualizar_cache_bust()

    # 6. remove qualquer resto do banco em texto puro
    antigo = os.path.join(DATA, 'questions.js')
    if os.path.exists(antigo):
        os.remove(antigo)
        print('* data/questions.js (texto puro) removido — nao pode ser publicado.')

    tam = os.path.getsize(os.path.join(DATA, 'questions.enc.js'))
    print('Publicado:')
    print('  %d questoes  (%.0f KB em claro -> %.0f KB cifrado)' % (len(questoes), bruto / 1024, tam / 1024))
    print('  %d questoes de demonstracao: %s' % (len(demo), ', '.join(DEMO_IDS)))
    print('  %d licenca(s) ativa(s) de %d emitida(s)' % (len(ativas), len(m['licencas'])))


def gerar_pix():
    """Grava data/pix.js e o QR. Sem configuracao, apenas desliga o bloco no site."""
    destino_js = os.path.join(DATA, 'pix.js')
    destino_png = os.path.join(RAIZ, 'assets', 'img', 'pix-qr.png')

    if not (PIX.get('ativo') and PIX.get('chave')):
        escrever_js(destino_js, 'CERTIFA_PIX', {'ativo': False},
                    'Pix desligado. Preencha o bloco PIX em _ferramentas/publicar.py.')
        if os.path.exists(destino_png):
            os.remove(destino_png)
        print('  Pix: desligado (bloco PIX sem chave)')
        return

    pix.autoteste()
    codigo = pix.brcode(PIX['chave'], PIX['nome'], PIX['cidade'], PIX['valor'])
    if not pix.conferir(codigo):
        sys.exit('ERRO: o Copia e Cola gerado nao passou na conferencia de CRC.')

    os.makedirs(os.path.dirname(destino_png), exist_ok=True)
    try:
        pix.gerar_png(codigo, destino_png)
        tem_qr = True
    except ImportError:
        tem_qr = False
        print('  Pix: biblioteca `qrcode` ausente — gerando so o Copia e Cola.')
        print('       Instale com: pip install qrcode')

    valor = float(PIX['valor'])
    escrever_js(destino_js, 'CERTIFA_PIX', {
        'ativo': True,
        'chave': PIX['chave'],
        'nome': pix._ascii(PIX['nome'], 25),
        'cidade': pix._ascii(PIX['cidade'], 15),
        'banco': PIX.get('banco', ''),
        'whatsapp': ''.join(c for c in str(PIX.get('whatsapp', '')) if c.isdigit()),
        'valor': valor,
        'valorFmt': ('R$ %.2f' % valor).replace('.', ','),
        'brcode': codigo,
        'qr': 'assets/img/pix-qr.png' if tem_qr else ''
    }, 'Dados do Pix. Gerado por publicar.py. Nao editar a mao.')

    print('  Pix: %s · %s · %s' % (PIX['banco'], pix._ascii(PIX['nome'], 25),
                                   ('R$ %.2f' % valor).replace('.', ',')))
    print('       Copia e Cola com %d caracteres%s' % (len(codigo), ' + QR gerado' if tem_qr else ''))


def atualizar_cache_bust():
    """
    Troca o `?v=...` de TODOS os assets referenciados em index.html, 404.html
    e sw.js por um hash derivado do conteudo recem-publicado em data/. Como
    o AES usa um IV aleatorio a cada cifragem, o hash muda a cada publicacao
    — mesmo que o banco de questoes nao tenha mudado — entao toda republicacao
    forca o navegador a buscar tudo de novo, sem depender de eu lembrar de
    incrementar um numero a mao.
    """
    partes = b''
    for nome_arq in ('questions.enc.js', 'licencas.js', 'pix.js', 'demo.js'):
        caminho = os.path.join(DATA, nome_arq)
        if os.path.exists(caminho):
            with open(caminho, 'rb') as f:
                partes += f.read()
    build = hashlib.sha256(partes).hexdigest()[:10]

    padrao = re.compile(r'\?v=[0-9a-fA-F]+')

    # index.html e a fonte da verdade. 404.html precisa ser byte a byte
    # identico a ele (e o mesmo app, so entregue quando o GitHub Pages nao
    # acha a rota) — por isso e derivado AQUI a partir do index.html ja
    # atualizado, em vez de ter seu proprio ?v= regexado separadamente.
    # Editar 404.html a mao e um erro facil de cometer; assim ele nunca
    # diverge, mesmo que eu mexa no index.html sem lembrar do 404.
    caminho_index = os.path.join(RAIZ, 'index.html')
    with open(caminho_index, encoding='utf-8') as f:
        conteudo_index = f.read()
    conteudo_index = padrao.sub('?v=' + build, conteudo_index)
    with open(caminho_index, 'w', encoding='utf-8', newline='\n') as f:
        f.write(conteudo_index)
    with open(os.path.join(RAIZ, '404.html'), 'w', encoding='utf-8', newline='\n') as f:
        f.write(conteudo_index)

    sw = os.path.join(RAIZ, 'sw.js')
    if os.path.exists(sw):
        with open(sw, encoding='utf-8') as f:
            conteudo = f.read()
        novo = padrao.sub('?v=' + build, conteudo)
        novo = re.sub(r"var CACHE = 'certifa-[^']*';", "var CACHE = 'certifa-%s';" % build, novo)
        if novo != conteudo:
            with open(sw, 'w', encoding='utf-8', newline='\n') as f:
                f.write(novo)

    print('  Cache-bust: build %s aplicado a index.html, 404.html e sw.js' % build)
    return build


def emitir(m, quantidade, nota, nome='', email=''):
    hoje = datetime.date.today().isoformat()
    if quantidade > 1 and (nome or email):
        sys.exit('ERRO: nome e e-mail identificam UM cliente. Emita uma licenca por vez '
                 '(--novas 1) quando informar o titular.')
    existentes = {canonizar(l['codigo']) for l in m['licencas']}
    novos = []
    while len(novos) < quantidade:
        c = novo_codigo()
        if c in existentes:
            continue
        existentes.add(c)
        novos.append(c)
        m['licencas'].append({'codigo': formatar(c), 'emitida': hoje, 'nota': nota or '',
                              'nome': nome or '', 'email': email or '', 'ativa': True})
    salvar_mestra(m)

    with open(CODIGOS_TXT, 'a', encoding='utf-8', newline='\n') as f:
        for c in novos:
            f.write('%s\t%s\t%s\n' % (formatar(c), hoje, nota or ''))

    print('\n%d codigo(s) emitido(s) — entregue ao cliente apos confirmar o pagamento:\n' % quantidade)
    for c in novos:
        print('   ' + formatar(c))
    print('\nRegistrados tambem em _ferramentas/codigos-emitidos.txt')
    return m


def listar(m):
    if not m['licencas']:
        print('Nenhuma licenca emitida ainda.')
        return
    print('%-22s %-12s %-9s %-22s %s' % ('CODIGO', 'EMISSAO', 'ESTADO', 'TITULAR', 'E-MAIL'))
    print('-' * 96)
    for l in m['licencas']:
        print('%-22s %-12s %-9s %-22s %s' % (
            l['codigo'], l['emitida'],
            'ativa' if l.get('ativa', True) else 'REVOGADA',
            (l.get('nome', '') or '—')[:22], l.get('email', '') or l.get('nota', '')))
    ativas = sum(1 for l in m['licencas'] if l.get('ativa', True))
    print('-' * 96)
    print('%d ativa(s), %d revogada(s)' % (ativas, len(m['licencas']) - ativas))


def revogar(m, codigo):
    alvo = canonizar(codigo)
    for l in m['licencas']:
        if canonizar(l['codigo']) == alvo:
            l['ativa'] = False
            salvar_mestra(m)
            print('Licenca %s revogada. Publique de novo para que o bloqueio valha no ar.' % l['codigo'])
            return m
    sys.exit('ERRO: codigo nao encontrado: %s' % codigo)


def main():
    p = argparse.ArgumentParser(description='Empacota o site e gerencia licencas.')
    p.add_argument('--novas', type=int, metavar='N', help='emite N codigos novos')
    p.add_argument('--nome', default='', help='nome do titular — sai carimbado no site')
    p.add_argument('--email', default='', help='e-mail do titular — sai carimbado no site')
    p.add_argument('--nota', default='', help='anotacao interna (pedido, plataforma)')
    p.add_argument('--listar', action='store_true', help='lista as licencas emitidas')
    p.add_argument('--revogar', metavar='CODIGO', help='desativa uma licenca')
    a = p.parse_args()

    aes.autoteste()
    m = carregar_mestra()

    if a.listar:
        listar(m)
        return
    if a.revogar:
        m = revogar(m, a.revogar)
    if a.novas:
        m = emitir(m, a.novas, a.nota, a.nome, a.email)
    publicar(m)


if __name__ == '__main__':
    main()
