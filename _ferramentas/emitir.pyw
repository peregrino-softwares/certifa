# -*- coding: utf-8 -*-
"""
Certifa — Emissor de codigos de acesso (janela grafica).

Duplo clique em "EMITIR CODIGO.bat", na pasta do projeto.

O que esta janela faz, no lugar de voce digitar comandos:
  1. roda publicar.py para emitir a licenca no nome do comprador
  2. descobre qual codigo foi criado (lendo a chave-mestra, nao a saida de texto)
  3. faz commit e push, que e o passo que faz o codigo valer no ar
  4. mostra o codigo grande, com botao de copiar

O passo 3 e o que mais importa: um codigo emitido e nao publicado NAO funciona
para o cliente. Por isso a janela avisa em vermelho se o push falhar, em vez de
deixar voce achar que deu tudo certo.

Extensao .pyw (e nao .py) para o Windows abrir sem janela preta de terminal.
"""
import os
import sys
import json
import shutil
import threading
import subprocess

import tkinter as tk
from tkinter import ttk, messagebox

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MESTRA = os.path.join(RAIZ, '_ferramentas', 'chave-mestra.json')
PUBLICAR = os.path.join(RAIZ, '_ferramentas', 'publicar.py')

COR_FUNDO = '#f4f6f8'
COR_MARCA = '#0b6b4f'
COR_ERRO = '#b3261e'
COR_OK = '#137a44'
COR_MUTED = '#6b7784'


# ─────────────────────────── infra ───────────────────────────
def python_exe():
    """
    O interpretador que roda este .pyw e o pythonw.exe (sem console).
    Para os subprocessos usamos o python.exe correspondente, senao a saida
    de texto do publicar.py se perde e nao conseguimos detectar erro.
    """
    exe = sys.executable or 'python'
    base = os.path.basename(exe).lower()
    if base.startswith('pythonw'):
        candidato = os.path.join(os.path.dirname(exe), base.replace('pythonw', 'python', 1))
        if os.path.exists(candidato):
            return candidato
    return exe


def rodar(args, cwd=RAIZ):
    """
    Executa um comando e devolve (ok, saida).

    encoding e errors explicitos porque o console do Windows nao e UTF-8 por
    padrao: sem isso, um nome com acento derruba o processo com UnicodeDecodeError
    em vez de mostrar o erro real.
    """
    try:
        p = subprocess.run(
            args, cwd=cwd, capture_output=True, text=True,
            encoding='utf-8', errors='replace',
            creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0),
        )
        return p.returncode == 0, (p.stdout or '') + (p.stderr or '')
    except FileNotFoundError:
        return False, 'Comando nao encontrado: %s' % args[0]
    except Exception as e:                                    # noqa: BLE001
        return False, '%s: %s' % (type(e).__name__, e)


def git_exe():
    return shutil.which('git') or 'git'


def ler_licencas():
    if not os.path.exists(MESTRA):
        return []
    try:
        with open(MESTRA, encoding='utf-8') as f:
            return json.load(f).get('licencas', [])
    except Exception:                                          # noqa: BLE001
        return []


def ativas():
    return [l for l in ler_licencas() if l.get('ativa', True)]


# ─────────────────────────── janela ───────────────────────────
class App(tk.Tk):

    def __init__(self):
        super().__init__()
        self.title('Certifa — Emitir codigo de acesso')
        self.configure(bg=COR_FUNDO)
        self.resizable(False, False)
        self.ocupado = False

        try:
            self.call('tk', 'scaling', 1.2)
        except tk.TclError:
            pass

        est = ttk.Style(self)
        try:
            est.theme_use('vista')
        except tk.TclError:
            pass
        est.configure('TFrame', background=COR_FUNDO)
        est.configure('TLabel', background=COR_FUNDO)
        est.configure('Titulo.TLabel', font=('Segoe UI Semibold', 15), foreground=COR_MARCA)
        est.configure('Secao.TLabel', font=('Segoe UI Semibold', 9), foreground=COR_MUTED)
        est.configure('Codigo.TLabel', font=('Consolas', 20, 'bold'), foreground=COR_MARCA)

        wrap = ttk.Frame(self, padding=18)
        wrap.grid(sticky='nsew')

        ttk.Label(wrap, text='Emitir codigo de acesso', style='Titulo.TLabel').grid(
            row=0, column=0, columnspan=3, sticky='w')
        ttk.Label(wrap, text='O nome e o e-mail ficam carimbados nas telas do comprador.',
                  foreground=COR_MUTED).grid(row=1, column=0, columnspan=3, sticky='w', pady=(2, 14))

        ttk.Label(wrap, text='NOME DO COMPRADOR', style='Secao.TLabel').grid(row=2, column=0, sticky='w')
        self.e_nome = ttk.Entry(wrap, width=46, font=('Segoe UI', 10))
        self.e_nome.grid(row=3, column=0, columnspan=2, sticky='we', pady=(2, 10))

        ttk.Label(wrap, text='E-MAIL OU WHATSAPP', style='Secao.TLabel').grid(row=4, column=0, sticky='w')
        self.e_email = ttk.Entry(wrap, width=46, font=('Segoe UI', 10))
        self.e_email.grid(row=5, column=0, columnspan=2, sticky='we', pady=(2, 14))

        self.b_emitir = ttk.Button(wrap, text='Emitir e publicar', command=self.emitir)
        self.b_emitir.grid(row=6, column=0, sticky='w')
        self.b_atualizar = ttk.Button(wrap, text='Atualizar lista', command=self.carregar)
        self.b_atualizar.grid(row=6, column=1, sticky='e')

        # resultado
        caixa = tk.Frame(wrap, bg='#e3f2ec', highlightbackground='#9dcfbc',
                         highlightthickness=1, padx=14, pady=12)
        caixa.grid(row=7, column=0, columnspan=3, sticky='we', pady=(16, 6))
        caixa.columnconfigure(0, weight=1)
        self.l_codigo = ttk.Label(caixa, text='—', style='Codigo.TLabel', background='#e3f2ec')
        self.l_codigo.grid(row=0, column=0, sticky='w')
        self.b_copiar = ttk.Button(caixa, text='Copiar', command=self.copiar, state='disabled')
        self.b_copiar.grid(row=0, column=1, sticky='e')
        self.codigo_atual = ''

        self.l_status = tk.Label(wrap, text='Preencha os dados e clique em Emitir.',
                                 bg=COR_FUNDO, fg=COR_MUTED, wraplength=430, justify='left',
                                 font=('Segoe UI', 9))
        self.l_status.grid(row=8, column=0, columnspan=3, sticky='w', pady=(0, 14))

        # licencas ativas
        ttk.Label(wrap, text='LICENCAS ATIVAS', style='Secao.TLabel').grid(row=9, column=0, sticky='w')
        self.lista = ttk.Treeview(wrap, columns=('cod', 'nome', 'data'), show='headings', height=7)
        for col, txt, larg in (('cod', 'Codigo', 165), ('nome', 'Comprador', 195), ('data', 'Emitida', 90)):
            self.lista.heading(col, text=txt)
            self.lista.column(col, width=larg, anchor='w')
        self.lista.grid(row=10, column=0, columnspan=2, sticky='we', pady=(2, 8))

        self.b_revogar = ttk.Button(wrap, text='Revogar selecionada', command=self.revogar)
        self.b_revogar.grid(row=11, column=0, sticky='w')
        self.l_total = ttk.Label(wrap, text='', foreground=COR_MUTED)
        self.l_total.grid(row=11, column=1, sticky='e')

        self.e_nome.focus_set()
        self.carregar()
        self.checar_ambiente()

    # ─────────── util de interface ───────────
    def status(self, texto, cor=COR_MUTED):
        self.l_status.configure(text=texto, fg=cor)
        self.update_idletasks()

    def travar(self, travado):
        self.ocupado = travado
        estado = 'disabled' if travado else 'normal'
        for b in (self.b_emitir, self.b_revogar, self.b_atualizar):
            b.configure(state=estado)

    def checar_ambiente(self):
        faltando = []
        if not os.path.exists(MESTRA):
            faltando.append('chave-mestra.json (nenhuma licenca foi emitida ainda)')
        if not os.path.exists(PUBLICAR):
            faltando.append('publicar.py')
        if not shutil.which('git'):
            faltando.append('git (nao encontrado no sistema)')
        if faltando:
            self.status('Atencao: ' + '; '.join(faltando), COR_ERRO)

    def carregar(self):
        for i in self.lista.get_children():
            self.lista.delete(i)
        lst = ativas()
        for l in lst:
            self.lista.insert('', 'end', values=(
                l.get('codigo', ''),
                (l.get('nome') or l.get('email') or l.get('nota') or '—')[:34],
                l.get('emitida', ''),
            ))
        total = len(ler_licencas())
        self.l_total.configure(text='%d ativa(s) de %d emitida(s)' % (len(lst), total))

    def copiar(self):
        if not self.codigo_atual:
            return
        self.clipboard_clear()
        self.clipboard_append(self.codigo_atual)
        self.update()
        self.b_copiar.configure(text='Copiado')
        self.after(1800, lambda: self.b_copiar.configure(text='Copiar'))

    # ─────────── emitir ───────────
    def emitir(self):
        if self.ocupado:
            return
        nome = self.e_nome.get().strip()
        email = self.e_email.get().strip()
        if not nome:
            messagebox.showwarning('Falta o nome',
                                   'Informe o nome do comprador. Ele fica carimbado nas telas '
                                   'dele, e e o que desestimula repassar o codigo.')
            self.e_nome.focus_set()
            return
        if not email:
            messagebox.showwarning('Falta o contato',
                                   'Informe o e-mail ou WhatsApp do comprador, para voce saber '
                                   'de quem e a licenca depois.')
            self.e_email.focus_set()
            return

        self.travar(True)
        self.codigo_atual = ''
        self.b_copiar.configure(state='disabled')
        self.l_codigo.configure(text='...')
        self.status('Emitindo a licenca...')
        threading.Thread(target=self._emitir_worker, args=(nome, email), daemon=True).start()

    def _emitir_worker(self, nome, email):
        antes = {l.get('codigo') for l in ler_licencas()}

        ok, saida = rodar([python_exe(), PUBLICAR, '--novas', '1', '--nome', nome, '--email', email])
        if not ok:
            self.after(0, self._falhou, 'Falha ao emitir a licenca.', saida)
            return

        # Descobrir o codigo pela chave-mestra, e nao pela saida de texto:
        # a saida do console pode vir com acentuacao trocada no Windows, e um
        # parse frouxo entregaria um codigo errado ao cliente.
        novos = [l for l in ler_licencas() if l.get('codigo') not in antes]
        if len(novos) != 1:
            self.after(0, self._falhou,
                       'A licenca foi emitida, mas nao consegui identificar o codigo com seguranca.',
                       'Rode "python _ferramentas/publicar.py --listar" para ver o codigo mais recente.\n\n' + saida)
            return
        codigo = novos[0]['codigo']

        self.after(0, self._mostrar_codigo, codigo)
        self.after(0, self.status, 'Codigo criado. Publicando no site...')

        g = git_exe()
        ok1, s1 = rodar([g, 'add', '-A'])
        ok2, s2 = rodar([g, 'commit', '-m', 'Emite licenca para %s' % nome])
        ok3, s3 = rodar([g, 'push'])

        if ok3:
            self.after(0, self.status,
                       'Publicado. O codigo ja funciona no site em cerca de 20 segundos.\n'
                       'Envie para %s.' % email, COR_OK)
        else:
            self.after(0, self._falhou,
                       'O codigo foi criado, mas NAO foi publicado — ele ainda nao funciona '
                       'para o cliente. Verifique a internet e tente de novo, ou rode '
                       '"git push" manualmente.',
                       '\n'.join(x for x in (s1, s2, s3) if x))
        self.after(0, self.carregar)
        self.after(0, self.travar, False)

    def _mostrar_codigo(self, codigo):
        self.codigo_atual = codigo
        self.l_codigo.configure(text=codigo)
        self.b_copiar.configure(state='normal')
        self.clipboard_clear()
        self.clipboard_append(codigo)
        self.e_nome.delete(0, 'end')
        self.e_email.delete(0, 'end')

    def _falhou(self, resumo, detalhe=''):
        self.status(resumo, COR_ERRO)
        self.travar(False)
        self.carregar()
        if detalhe:
            messagebox.showerror('Erro', resumo + '\n\n' + detalhe.strip()[:1500])

    # ─────────── revogar ───────────
    def revogar(self):
        if self.ocupado:
            return
        sel = self.lista.selection()
        if not sel:
            messagebox.showinfo('Selecione uma licenca',
                                'Clique na licenca que voce quer cancelar, na lista abaixo.')
            return
        codigo = self.lista.item(sel[0], 'values')[0]
        comprador = self.lista.item(sel[0], 'values')[1]
        if not messagebox.askyesno(
                'Revogar licenca',
                'Cancelar a licenca %s (%s)?\n\n'
                'O acesso dessa pessoa para de funcionar assim que a publicacao terminar. '
                'Isso nao pode ser desfeito — para religar, e preciso emitir um codigo novo.'
                % (codigo, comprador)):
            return

        self.travar(True)
        self.status('Revogando %s...' % codigo)
        threading.Thread(target=self._revogar_worker, args=(codigo,), daemon=True).start()

    def _revogar_worker(self, codigo):
        ok, saida = rodar([python_exe(), PUBLICAR, '--revogar', codigo])
        if not ok:
            self.after(0, self._falhou, 'Falha ao revogar a licenca.', saida)
            return

        g = git_exe()
        rodar([g, 'add', '-A'])
        rodar([g, 'commit', '-m', 'Revoga licenca %s' % codigo])
        ok3, s3 = rodar([g, 'push'])

        if ok3:
            self.after(0, self.status,
                       'Licenca %s revogada e publicada. O acesso para de funcionar em cerca '
                       'de 20 segundos.' % codigo, COR_OK)
        else:
            self.after(0, self._falhou,
                       'A licenca foi revogada aqui, mas NAO foi publicada — ela ainda '
                       'funciona para quem tem o codigo. Rode "git push" manualmente.', s3)
        self.after(0, self.carregar)
        self.after(0, self.travar, False)


if __name__ == '__main__':
    App().mainloop()
