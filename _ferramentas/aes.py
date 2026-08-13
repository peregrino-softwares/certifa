# -*- coding: utf-8 -*-
"""
AES-256 (cifra direta) + modo CTR, em Python puro.

Existe porque este ambiente nao tem `cryptography` nem `pycryptodome`.
O modo CTR usa apenas a cifra direta, tanto para cifrar quanto para decifrar,
entao nao e preciso implementar a rotina inversa do AES.

Validado contra os vetores do FIPS-197 (apendice C.3) em `autoteste()`.
No navegador, o lado correspondente e o `crypto.subtle` com AES-CTR nativo.
"""

SBOX = [
0x63,0x7c,0x77,0x7b,0xf2,0x6b,0x6f,0xc5,0x30,0x01,0x67,0x2b,0xfe,0xd7,0xab,0x76,
0xca,0x82,0xc9,0x7d,0xfa,0x59,0x47,0xf0,0xad,0xd4,0xa2,0xaf,0x9c,0xa4,0x72,0xc0,
0xb7,0xfd,0x93,0x26,0x36,0x3f,0xf7,0xcc,0x34,0xa5,0xe5,0xf1,0x71,0xd8,0x31,0x15,
0x04,0xc7,0x23,0xc3,0x18,0x96,0x05,0x9a,0x07,0x12,0x80,0xe2,0xeb,0x27,0xb2,0x75,
0x09,0x83,0x2c,0x1a,0x1b,0x6e,0x5a,0xa0,0x52,0x3b,0xd6,0xb3,0x29,0xe3,0x2f,0x84,
0x53,0xd1,0x00,0xed,0x20,0xfc,0xb1,0x5b,0x6a,0xcb,0xbe,0x39,0x4a,0x4c,0x58,0xcf,
0xd0,0xef,0xaa,0xfb,0x43,0x4d,0x33,0x85,0x45,0xf9,0x02,0x7f,0x50,0x3c,0x9f,0xa8,
0x51,0xa3,0x40,0x8f,0x92,0x9d,0x38,0xf5,0xbc,0xb6,0xda,0x21,0x10,0xff,0xf3,0xd2,
0xcd,0x0c,0x13,0xec,0x5f,0x97,0x44,0x17,0xc4,0xa7,0x7e,0x3d,0x64,0x5d,0x19,0x73,
0x60,0x81,0x4f,0xdc,0x22,0x2a,0x90,0x88,0x46,0xee,0xb8,0x14,0xde,0x5e,0x0b,0xdb,
0xe0,0x32,0x3a,0x0a,0x49,0x06,0x24,0x5c,0xc2,0xd3,0xac,0x62,0x91,0x95,0xe4,0x79,
0xe7,0xc8,0x37,0x6d,0x8d,0xd5,0x4e,0xa9,0x6c,0x56,0xf4,0xea,0x65,0x7a,0xae,0x08,
0xba,0x78,0x25,0x2e,0x1c,0xa6,0xb4,0xc6,0xe8,0xdd,0x74,0x1f,0x4b,0xbd,0x8b,0x8a,
0x70,0x3e,0xb5,0x66,0x48,0x03,0xf6,0x0e,0x61,0x35,0x57,0xb9,0x86,0xc1,0x1d,0x9e,
0xe1,0xf8,0x98,0x11,0x69,0xd9,0x8e,0x94,0x9b,0x1e,0x87,0xe9,0xce,0x55,0x28,0xdf,
0x8c,0xa1,0x89,0x0d,0xbf,0xe6,0x42,0x68,0x41,0x99,0x2d,0x0f,0xb0,0x54,0xbb,0x16]

RCON = [0x01,0x02,0x04,0x08,0x10,0x20,0x40,0x80,0x1b,0x36,0x6c,0xd8,0xab,0x4d]


def _xtime(a):
    a <<= 1
    if a & 0x100:
        a = (a ^ 0x1b) & 0xff
    return a


def _mul(a, b):
    """Multiplicacao no corpo GF(2^8) usado pelo AES."""
    r = 0
    for _ in range(8):
        if b & 1:
            r ^= a
        b >>= 1
        a = _xtime(a)
    return r


def expandir_chave(key):
    """Key schedule do AES. Aceita chaves de 16, 24 ou 32 bytes."""
    nk = len(key) // 4
    if nk not in (4, 6, 8):
        raise ValueError('chave deve ter 16, 24 ou 32 bytes')
    nr = nk + 6
    w = [list(key[4 * i:4 * i + 4]) for i in range(nk)]
    for i in range(nk, 4 * (nr + 1)):
        t = list(w[i - 1])
        if i % nk == 0:
            t = t[1:] + t[:1]                       # RotWord
            t = [SBOX[b] for b in t]                # SubWord
            t[0] ^= RCON[i // nk - 1]
        elif nk > 6 and i % nk == 4:
            t = [SBOX[b] for b in t]
        w.append([w[i - nk][j] ^ t[j] for j in range(4)])
    return w, nr


def cifrar_bloco(bloco, w, nr):
    """Cifra um bloco de 16 bytes. Estado em ordem de coluna, como no FIPS-197."""
    s = [[bloco[r + 4 * c] for c in range(4)] for r in range(4)]

    def add_round_key(rnd):
        for c in range(4):
            for r in range(4):
                s[r][c] ^= w[rnd * 4 + c][r]

    add_round_key(0)
    for rnd in range(1, nr + 1):
        # SubBytes
        for r in range(4):
            for c in range(4):
                s[r][c] = SBOX[s[r][c]]
        # ShiftRows
        for r in range(1, 4):
            s[r] = s[r][r:] + s[r][:r]
        # MixColumns (todas as rodadas menos a ultima)
        if rnd != nr:
            for c in range(4):
                a0, a1, a2, a3 = s[0][c], s[1][c], s[2][c], s[3][c]
                s[0][c] = _mul(a0, 2) ^ _mul(a1, 3) ^ a2 ^ a3
                s[1][c] = a0 ^ _mul(a1, 2) ^ _mul(a2, 3) ^ a3
                s[2][c] = a0 ^ a1 ^ _mul(a2, 2) ^ _mul(a3, 3)
                s[3][c] = _mul(a0, 3) ^ a1 ^ a2 ^ _mul(a3, 2)
        add_round_key(rnd)

    return bytes(s[r][c] for c in range(4) for r in range(4))


def ctr(dados, key, iv):
    """
    AES em modo CTR. Cifrar e decifrar sao a mesma operacao.

    `iv` sao os 16 bytes do bloco contador inicial, e o contador incrementa
    sobre os 128 bits — exatamente o que o WebCrypto faz com
    {name:'AES-CTR', counter: iv, length: 128}.
    """
    w, nr = expandir_chave(key)
    contador = int.from_bytes(iv, 'big')
    saida = bytearray(len(dados))
    for off in range(0, len(dados), 16):
        bloco = cifrar_bloco(((contador + off // 16) % (1 << 128)).to_bytes(16, 'big'), w, nr)
        pedaco = dados[off:off + 16]
        for i, b in enumerate(pedaco):
            saida[off + i] = b ^ bloco[i]
    return bytes(saida)


def autoteste():
    """Vetores oficiais do FIPS-197, apendice C."""
    casos = [
        # (chave, texto claro, cifra esperada)
        ('000102030405060708090a0b0c0d0e0f',
         '00112233445566778899aabbccddeeff', '69c4e0d86a7b0430d8cdb78070b4c55a'),
        ('000102030405060708090a0b0c0d0e0f1011121314151617',
         '00112233445566778899aabbccddeeff', 'dda97ca4864cdfe06eaf70a0ec0d7191'),
        ('000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f',
         '00112233445566778899aabbccddeeff', '8ea2b7ca516745bfeafc49904b496089'),
    ]
    for k, p, esperado in casos:
        w, nr = expandir_chave(bytes.fromhex(k))
        obtido = cifrar_bloco(bytes.fromhex(p), w, nr).hex()
        assert obtido == esperado, 'FIPS-197 falhou: %s != %s' % (obtido, esperado)

    # CTR: decifrar desfaz cifrar, inclusive com bloco final incompleto
    import os
    key, iv = os.urandom(32), os.urandom(16)
    for n in (1, 15, 16, 17, 1000):
        msg = os.urandom(n)
        assert ctr(ctr(msg, key, iv), key, iv) == msg, 'CTR falhou com %d bytes' % n

    # o contador precisa avancar entre blocos
    key = bytes(32); iv = bytes(16)
    fluxo = ctr(bytes(32), key, iv)
    assert fluxo[:16] != fluxo[16:], 'contador do CTR nao avancou'
    return True


if __name__ == '__main__':
    autoteste()
    print('AES: vetores do FIPS-197 (128/192/256) e round-trip do CTR — OK')
