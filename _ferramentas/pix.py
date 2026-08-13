# -*- coding: utf-8 -*-
"""
Gera o "Pix Copia e Cola" (BR Code) e o QR estatico do recebedor.

O BR Code do Pix segue o padrao EMV QRCPS: uma sequencia de campos
ID + tamanho + valor, fechada por um CRC16. Como o valor ja vai embutido,
o pagador nao precisa digitar nada — abre o app do banco, cola ou aponta a
camera, e o valor aparece pronto.

Formato de um QR estatico com valor:

    00 02 01                     versao do payload
    26 .. br.gov.bcb.pix + chave informacoes da conta
    52 04 0000                   categoria do estabelecimento
    53 03 986                     moeda (986 = real)
    54 .. 110.00                  valor
    58 02 BR                      pais
    59 .. NOME DO RECEBEDOR        nome (ate 25 caracteres)
    60 .. CIDADE                   cidade (ate 15 caracteres)
    62 .. 05 03 ***                identificador da transacao
    63 04 XXXX                     CRC16

Validado em `autoteste()`: o payload gerado e relido campo a campo e o CRC
e reconferido, alem do exemplo de CRC do proprio padrao EMV.
"""
import unicodedata


def crc16(payload):
    """CRC-16/CCITT-FALSE — polinomio 0x1021, valor inicial 0xFFFF."""
    crc = 0xFFFF
    for ch in payload.encode('utf-8'):
        crc ^= ch << 8
        for _ in range(8):
            crc = ((crc << 1) ^ 0x1021) & 0xFFFF if crc & 0x8000 else (crc << 1) & 0xFFFF
    return '%04X' % crc


def _campo(id_, valor):
    return '%s%02d%s' % (id_, len(valor), valor)


def _ascii(texto, limite):
    """Pix nao aceita acento com seguranca em todos os apps: normaliza e corta."""
    t = unicodedata.normalize('NFKD', str(texto))
    t = ''.join(c for c in t if not unicodedata.combining(c))
    t = ''.join(c for c in t if 32 <= ord(c) < 127)
    return t.upper().strip()[:limite]


def brcode(chave, nome, cidade, valor=None, txid='***', descricao=''):
    """
    Monta o Pix Copia e Cola.

    chave  : CPF, CNPJ, e-mail, telefone (+5562...) ou chave aleatoria
    nome   : nome do recebedor, como esta no banco (ate 25 caracteres)
    cidade : cidade do recebedor (ate 15 caracteres)
    valor  : em reais; None deixa o pagador digitar
    """
    chave = str(chave).strip()
    if not chave:
        raise ValueError('chave Pix vazia')

    conta = _campo('00', 'br.gov.bcb.pix') + _campo('01', chave)
    if descricao:
        conta += _campo('02', _ascii(descricao, 40))

    p = _campo('00', '01')
    p += _campo('26', conta)
    p += _campo('52', '0000')
    p += _campo('53', '986')
    if valor is not None:
        p += _campo('54', '%.2f' % float(valor))
    p += _campo('58', 'BR')
    p += _campo('59', _ascii(nome, 25) or 'RECEBEDOR')
    p += _campo('60', _ascii(cidade, 15) or 'BRASIL')
    p += _campo('62', _campo('05', _ascii(txid, 25) or '***'))
    p += '6304'
    return p + crc16(p)


def ler(payload):
    """Relê o BR Code campo a campo. Usado para conferir o que foi gerado."""
    out, i = {}, 0
    while i < len(payload) - 4:
        id_ = payload[i:i + 2]
        n = int(payload[i + 2:i + 4])
        out[id_] = payload[i + 4:i + 4 + n]
        i += 4 + n
    return out


def conferir(payload):
    """Confere o CRC do payload lido. Devolve True se estiver integro."""
    corpo, crc_lido = payload[:-4], payload[-4:]
    return crc16(corpo) == crc_lido.upper()


def gerar_png(payload, caminho, escala=8, borda=2):
    """Grava o QR como PNG. Usa a biblioteca `qrcode` para nao arriscar erro."""
    import qrcode
    q = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=escala,
        border=borda,
    )
    q.add_data(payload)
    q.make(fit=True)
    q.make_image(fill_color='black', back_color='white').save(caminho)
    return caminho


def autoteste():
    # 1. CRC conhecido do padrao EMV
    assert crc16('123456789') == '29B1', 'CRC16 fora do esperado: %s' % crc16('123456789')

    # 2. round-trip de um BR Code completo
    p = brcode('teste@exemplo.com', 'Maria da Silva', 'Goiania', 110.00)
    assert conferir(p), 'CRC do payload gerado nao confere'
    campos = ler(p)
    assert campos['00'] == '01'
    assert campos['53'] == '986'
    assert campos['54'] == '110.00'
    assert campos['58'] == 'BR'
    assert campos['59'] == 'MARIA DA SILVA'
    assert campos['60'] == 'GOIANIA'
    assert ler(campos['26'])['00'] == 'br.gov.bcb.pix'
    assert ler(campos['26'])['01'] == 'teste@exemplo.com'

    # 3. acento e limite de tamanho
    campos = ler(brcode('11122233344', 'Jose Antonio de Assuncao Fernandes', 'Sao Jose dos Campos', 9.9))
    assert len(campos['59']) <= 25 and len(campos['60']) <= 15
    assert campos['54'] == '9.90'

    # 4. sem valor definido, o campo 54 nao existe
    assert '54' not in ler(brcode('11122233344', 'Ana', 'Recife'))

    # 5. um caractere trocado tem de quebrar a conferencia
    quebrado = p[:20] + ('X' if p[20] != 'X' else 'Y') + p[21:]
    assert not conferir(quebrado), 'payload adulterado passou na conferencia'
    return True


if __name__ == '__main__':
    autoteste()
    exemplo = brcode('teste@exemplo.com', 'Maria da Silva', 'Goiania', 110.00)
    print('Pix: CRC16, montagem, leitura e limites — OK')
    print('\nExemplo de Copia e Cola:\n' + exemplo)
