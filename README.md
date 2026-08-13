# Certifa — Simulador do Exame de Agente de Futebol FIFA

**Versão 2.4** — SEO (sitemap, Open Graph, dados estruturados), cache-busting automático,
recebimento por Pix (Banco do Brasil), licença nominal, banco criptografado.

Plataforma de preparação para o **FIFA Football Agent Exam** no formato exato da prova real:
20 questões, 60 minutos, uma ou mais alternativas corretas por questão e correção **tudo ou nada**.

Site estático, sem servidor e sem banco de dados. Roda no GitHub Pages, funciona offline e não
envia dado nenhum para lugar nenhum — o progresso do aluno fica no navegador dele.

> **Aviso legal.** Projeto independente, sem vínculo, patrocínio ou endosso da FIFA.
> FIFA é marca registrada da Fédération Internationale de Football Association. As questões são
> **originais**, redigidas a partir dos regulamentos públicos, e **não reproduzem provas oficiais**.

---

## 1. Como o acesso funciona

| Área | Sem pagar | Com licença |
|---|---|---|
| Início: explicação, 3 questões de demonstração, preço, FAQ | ✅ | ✅ |
| Simulado, Estudo, Revisão, Estatísticas, Documentos | 🔒 | ✅ |

### Por que o banco é criptografado

Num site estático, **todo arquivo publicado é baixável**. Um cadeado feito só em JavaScript se
contorna abrindo o endereço do arquivo direto no navegador. Por isso, na v2:

- `data/questions.enc.js` é publicado **cifrado** com AES-256-CTR e autenticado com HMAC-SHA256.
  Sem licença, o arquivo é ruído — não existe caminho para lê-lo.
- `data/licencas.js` guarda só hashes e chaves embrulhadas. **Nenhum código aparece em claro.**
- A chave que abre o conteúdo **não está no site**. Ela é reconstruída a partir do código do cliente,
  via PBKDF2-SHA256 com 210.000 iterações — o que também torna caro tentar adivinhar códigos.
- `data/demo.js` fica em texto puro **de propósito**: são as 3 questões da vitrine.

Cadeia completa: `código → PBKDF2 → chave que desembrulha a chave do conteúdo → decifra o banco`.

### O que isso protege e o que não protege

Protege bem contra o problema real: alguém baixar o conteúdo sem pagar. Um visitante sem código não
tem como extrair as questões, nem inspecionando o código-fonte.

**Não protege** contra um cliente que pagou e resolve repassar o próprio código — nesse caso ele
está entregando a chave dele. É por isso que cada comprador recebe um **código individual**, que
pode ser **revogado**. Se um código vazar, você revoga aquele código e republica; ninguém mais é
afetado.

---

## 2. Receber por Pix no Banco do Brasil

O caminho mais direto, e o mais barato: o comprador paga por Pix na sua conta do BB, manda o
comprovante, você confere e devolve o código. Sem intermediário, sem taxa de gateway, sem câmbio.

### Configurar

Abra `_ferramentas/publicar.py` e preencha o bloco `PIX` no topo:

```python
PIX = {
    'ativo': True,
    'chave': 'seu@email.com',          # CPF, CNPJ, e-mail, telefone (+5562...) ou chave aleatória
    'nome': 'SEU NOME COMPLETO',       # exatamente como está no banco, até 25 caracteres
    'cidade': 'GOIANIA',               # até 15 caracteres
    'valor': 110.00,
    'banco': 'Banco do Brasil',
    'whatsapp': '5562999999999',       # só dígitos; vira o botão de enviar comprovante
}
```

Depois:

```bash
python _ferramentas/publicar.py
```

O script gera o **Pix Copia e Cola** com o valor já embutido e o **QR Code** em
`assets/img/pix-qr.png`, e escreve tudo em `data/pix.js`. O site passa a mostrar o bloco de
pagamento sozinho.

> A chave e o nome precisam ser **idênticos** aos cadastrados no banco. Se estiverem diferentes, o
> app do pagador recusa o QR. O site mostra ao comprador o nome do recebedor justamente para ele
> conferir antes de confirmar.

### O que o comprador vê

1. QR Code para apontar a câmera, e o Copia e Cola com botão de copiar.
2. Três passos: pague, mande o comprovante, receba o código.
3. Botão que abre o WhatsApp (ou o e-mail) já com a mensagem escrita.

O valor vai dentro do código — o comprador não digita nada e não erra o valor.

### O que você faz a cada venda

1. Confere o Pix no app do BB.
2. Emite a licença no nome de quem pagou:

```bash
python _ferramentas/publicar.py --novas 1 --nome "Maria Silva" --email "maria@email.com"
```

3. `git add -A && git commit -m "licenca maria" && git push`
4. Responde o WhatsApp com o código.

Do passo 2 ao 4 leva menos de um minuto.

### Tarifa do Pix: quando começa a ter custo

Pix é gratuito para pessoa física, MEI e empresário individual. Mas o Banco Central permite ao banco
cobrar quando o recebimento tem **natureza comercial** — e o gatilho no BB é receber **mais de 30 Pix
no mês** por chave ou QR estático. Passando disso, o BB cobra 0,99% por transação, com teto de
R$ 140.

Traduzindo: as primeiras 30 vendas do mês saem sem custo. Da 31ª em diante, R$ 110 × 0,99% ≈ R$ 1,09
por venda — ainda muito abaixo de qualquer gateway. Não é motivo para mudar de estratégia, é só uma
conta para você não ser pego de surpresa.

E o óbvio, que vale registrar: **receita de venda é rendimento tributável**, independente de cair por
Pix. Combine com seu contador se vai declarar como PF ou abrir MEI antes de escalar.

### Se um dia quiser cartão ou vendas de fora

O bloco `PAGAMENTO` em `assets/js/app.js` continua ali, com dois canais opcionais que convivem com o
Pix: `brasil` (um link de pagamento com cartão, ex. InfinitePay) e `internacional` (Gumroad, Kiwify,
PayPal). Ligue quando fizer sentido — o cartão de preço e os botões se ajustam sozinhos.

## 2A. Impedir que uma chave sirva para todo mundo

Num site estático **não dá para bloquear tecnicamente** o uso de um mesmo código em vários
aparelhos: não existe servidor para contar sessões. O que existe é tornar o repasse caro e
detectável. Três camadas, todas prontas:

### 1. Licença nominal (a mais eficaz)

Emita a licença no nome do comprador:

```bash
python _ferramentas/publicar.py --novas 1 --nome "Maria Silva" --email "maria@email.com"
```

O nome e o e-mail vão **cifrados junto com a licença** — ninguém lê no arquivo publicado. Depois de
liberado, o site carimba em todas as telas, inclusive na impressão do resultado:

> *Licença pessoal de Maria Silva · maria@email.com · o compartilhamento deste código pode cancelá-lo.*

Quem receber o código repassado vê o nome de outra pessoa na tela inteira. É o mesmo mecanismo que
editoras usam em PDF, e funciona pelo constrangimento, não pela técnica.

### 2. Um código por comprador, revogável

Nunca reutilize um código para dois clientes. Se um vazar, você revoga só ele:

```bash
python _ferramentas/publicar.py --revogar CTF-AAAA-BBBB-CCCC
```

Depois do push, aquele código para de funcionar — inclusive em quem já tinha liberado, porque o site
confere a lista de licenças a cada carregamento. Os outros clientes não são afetados.

### 3. Termo visível na venda

Deixe escrito na página de compra e no e-mail de entrega que a licença é pessoal e que o
compartilhamento a cancela sem reembolso. Isso é o que sustenta a revogação depois.

### Quando escalar

Quando o volume justificar, o passo seguinte é uma função serverless gratuita (Cloudflare Workers,
Vercel) que registre `{licença, aparelho, data}` a cada liberação. Aí você **vê** que um código foi
usado em 40 aparelhos e revoga com prova. Enquanto a entrega é manual, as três camadas acima dão
conta.

---

## 2B. InfinitePay: o que dá e o que não dá

A conta InfinitePay funciona bem, com uma limitação que muda o preço do produto. Da central de ajuda
deles: *"Não é possível vender com a InfinitePay fora do Brasil"*, e no Link de Pagamento *"o
portador do cartão precisa ter CPF"*.

| | InfinitePay | Plataforma internacional |
|---|---|---|
| Moeda | Real | Dólar |
| Público | Brasil, com CPF | qualquer país |
| Meios | Pix, crédito, débito | cartão, PayPal |
| Entrega do código | manual | pode ser automática |

Por isso o site tem **dois preços independentes**, em `PAGAMENTO` (`assets/js/app.js`): `brasil`
(InfinitePay, em reais) e `internacional` (em dólar). Ligue um, ou os dois — o cartão de preço e os
botões se ajustam sozinhos. Com os dois desligados, aparece um aviso de configuração pendente em vez
de botão quebrado.

Para criar o link: app da InfinitePay → **Vender** → **Link de Pagamento** → valor fixo → cole a URL
em `PAGAMENTO.brasil.link` e marque `ativo: true`.

---

## 2C. O que você pode e o que não pode escrever na página

O site é uma oferta comercial, então tudo que estiver nele é alegação publicitária. No Brasil vale o
CDC (art. 37: publicidade enganosa), e **o ônus de provar a alegação é do anunciante**.

**Não coloque** número de aprovação, percentual de aprovados ou depoimento antes de existir aluno,
turma e apuração. "85% dos aprovados estudaram conosco" num produto recém-lançado é exatamente o
tipo de frase que gera reclamação e pedido de reembolso — e, num nicho pequeno como o de agentes,
queima a reputação rápido.

O bloco **"Por que confiar neste material"** já ocupa esse espaço com quatro afirmações verificáveis:
origem nos documentos oficiais, artigo citado em cada resposta, formato conferido no documento da
FIFA e teste gratuito antes de pagar.

Quando os dados reais existirem, preencha `PROVA_SOCIAL` em `assets/js/app.js`:

```js
var PROVA_SOCIAL = {
  numeros: [{ valor: '312', rotulo: 'alunos desde março de 2027' }],
  depoimentos: [{ texto: '...', autor: 'Nome', detalhe: 'aprovado em 04/2027' }]
};
```

A seção aparece sozinha assim que houver conteúdo, e some se você esvaziar. Guarde o comprovante de
cada número que publicar.

---

## 3. Gerenciar licenças

```bash
python _ferramentas/publicar.py --novas 1 --nome "Maria Silva" --email "maria@email.com"
```

```bash
python _ferramentas/publicar.py --novas 10 --nota "lote agosto"
```

```bash
python _ferramentas/publicar.py --listar
```

```bash
python _ferramentas/publicar.py --revogar CTF-AAAA-BBBB-CCCC
```

Toda operação recria os arquivos de `data/`. **A revogação só passa a valer depois do push** —
é a publicação que atualiza a lista de licenças no ar.

### Cache-busting automático

Todo `python _ferramentas/publicar.py` recalcula um hash a partir do conteúdo recém-cifrado e
reescreve o `?v=...` de **todos** os assets em `index.html`, `404.html` e `sw.js`, além do nome do
cache do service worker. Isso acontece sozinho, a cada publicação — inclusive quando o banco de
questões não muda, porque o IV do AES é aleatório e o hash muda junto.

Sem isso, um navegador que visitou o site pouco antes de você revogar um código continuaria
enxergando a lista de licenças antiga por até 10 minutos (o `Cache-Control` do GitHub Pages), e uma
licença nova recém-emitida podia não aparecer para quem já tinha a página em cache. Não precisa
mexer em nada: é automático desde a v2.3.

### Dois arquivos que você nunca pode perder nem publicar

| Arquivo | Se vazar | Se você perder |
|---|---|---|
| `_ferramentas/chave-mestra.json` | qualquer pessoa abre o site e emite códigos | perde o acesso ao próprio conteúdo publicado e precisa reemitir todos os códigos |
| `_pesquisa/bank/*.json` | as 112 questões viram públicas | precisa reescrever o banco |

Os dois estão no `.gitignore`. **Faça cópia de segurança fora da pasta do projeto** — num pendrive ou
num drive privado. E o workflow do GitHub Actions falha de propósito se algum deles for versionado
por engano.

---

## 4. Publicar no GitHub Pages

```bash
git add -A && git commit -m "Certifa v2.0" && git push -u origin main
```

Em **Settings → Pages**, escolha *Deploy from a branch → main / (root)*, ou *GitHub Actions* para
usar o workflow com a checagem de segurança.

Antes do primeiro push, confira o que vai subir:

```bash
git status --short
```

Não pode aparecer nada de `_pesquisa/`, `_versoes/`, `chave-mestra.json` nem `data/questions.js`.

---

## 4A. Por que o site não aparece no Google ainda, e o que fazer

Um site novo não é achado por busca automaticamente. Publicar não é o mesmo que ser indexado —
isso é normal, não é bug, e leva de alguns dias a algumas semanas mesmo fazendo tudo certo.

**O que já está pronto no projeto:**

- `robots.txt` e `sitemap.xml`, na raiz, dizendo ao Google que o site existe e pode ser rastreado.
- Open Graph e Twitter Card no `<head>` do `index.html` — é o que faz o link aparecer com imagem e
  descrição quando colado no WhatsApp, Instagram, LinkedIn, em vez de um texto pelado.
- `assets/img/og-cover.png` — a imagem de capa gerada para esse preview (1200×630).
- Dados estruturados (`schema.org/Course`) — ajuda o Google a entender que é um curso pago, com
  preço, e a eventualmente mostrar isso no resultado de busca.

**O que só você faz, porque exige conta/pagamento em nome próprio:**

1. **Google Search Console** (grátis) — cadastre `https://peregrino-softwares.github.io/certifa/`
   em [search.google.com/search-console](https://search.google.com/search-console), verifique a
   propriedade (a opção "Prefixo de URL" com a tag HTML meta funciona sem precisar de domínio
   próprio) e envie o `sitemap.xml`. Isso não garante indexação rápida, mas é o que mais acelera.
2. **Domínio próprio.** É o que realmente muda o jogo. `peregrino-softwares.github.io/certifa` é
   difícil de lembrar e o Google trata subdomínio de plataforma (github.io) como menos confiável que
   domínio próprio. Um `.com.br` custa por volta de R$ 40/ano num registrador (Registro.br,
   HostGator, etc.), e dá para apontá-lo para o GitHub Pages sem mudar nada no código — só criar um
   arquivo `CNAME` na raiz e configurar dois registros DNS. Se quiser, eu configuro assim que você
   tiver o domínio.
3. **Backlinks.** Um link para o site a partir de qualquer lugar com autoridade — Instagram na bio,
   grupo do WhatsApp, fórum do nicho — ajuda mais a indexação e o ranqueamento do que qualquer ajuste
   técnico. Isso o Google Search Console também acelera: quando alguém *pesquisa* o nome do site e
   *clica* no link, isso sinaliza relevância.

**O que a arquitetura atual limita:** o site é um SPA (aplicativo de página única) — só existe uma
URL real (`/`), e as seções trocam por JavaScript sem recarregar a página. Isso significa que só a
tela inicial (a que fica de fora do paywall) é indexável; Simulado, Estudo, Estatísticas etc. nunca
vão aparecer em busca, porque exigem licença para renderizar qualquer coisa. Não é um problema:
essas telas não deveriam mesmo aparecer para quem não pagou.

---

## 5. As 3 questões de demonstração

Ficam fixas na página inicial e são sempre as mesmas: uma com **1** alternativa correta, uma com
**2** e uma com **3** — para o visitante entender na prática a correção tudo ou nada. São
`FFA1-001`, `RST1-002` e `FFA2-003`, definidas em `DEMO_IDS` no `_ferramentas/publicar.py`.
As alternativas **não** são embaralhadas, então a demonstração é idêntica para todo mundo.

---

## 6. Estrutura

```
PUBLICADO
  index.html / 404.html        aplicação (SPA, sem build)
  assets/css/app.css           design system, temas claro/escuro
  assets/js/i18n.js            interface nos 4 idiomas
  assets/js/access.js          liberação por licença e decifragem
  assets/js/store.js           progresso local, Leitner, estatísticas
  assets/js/engine.js          sorteio ponderado, correção, cronômetro
  assets/js/calc.js            calculadora (padrão, comissão, solidariedade)
  assets/js/app.js             rotas, porteiro do paywall, telas
  data/questions.enc.js        banco CIFRADO
  data/licencas.js             hashes das licenças
  data/demo.js                 as 3 questões da vitrine
  data/pix.js                  Copia e Cola e QR do Pix
  assets/img/pix-qr.png        QR de pagamento (gerado)
  assets/img/og-cover.png      imagem de preview ao compartilhar o link
  robots.txt, sitemap.xml      indexação em buscadores
  manifest.webmanifest, sw.js  PWA e cache offline

LOCAL — NUNCA PUBLICAR
  _pesquisa/bank/*.json        banco em texto puro
  _pesquisa/validar.py         valida os lotes
  _ferramentas/publicar.py     cifra o banco e emite licenças
  _ferramentas/aes.py          AES-256-CTR puro (validado no FIPS-197)
  _ferramentas/pix.py          BR Code do Pix + QR (validado no CRC do padrão EMV)
  _ferramentas/chave-mestra.json   CHAVE DO CONTEÚDO + CÓDIGOS
  _versoes/                    versões antigas
```

---

## 7. Alterar o banco de questões

1. Edite os arquivos em `_pesquisa/bank/`, seguindo `_pesquisa/CONTRATO-QUESTAO.md`.
2. Valide (rejeita idioma faltando, gabarito incoerente, citação sem par):

```bash
python _pesquisa/validar.py
```

3. Republique o pacote cifrado:

```bash
python _ferramentas/publicar.py
```

4. Suba o `?v=` dos assets no `index.html` e no `sw.js`, e o `var CACHE` do `sw.js`, para quem já tem
   o site em cache receber a atualização.

As licenças já emitidas continuam valendo: o pacote é recifrado com a mesma chave mestra.

---

## 8. Fidelidade ao exame real

| Item | Prova oficial | Certifa |
|---|---|---|
| Questões | 20 | 20 |
| Duração | 60 min | 60 min, cronômetro não pausável |
| Peso por questão | 5% | 5% |
| Nota de corte | 75% (15/20) | 75% (15/20) |
| Alternativas corretas | uma ou mais | 1 a 4, sorteadas |
| Correção parcial | vale zero | vale zero |
| Exibição | todas as questões numa página só | idem, com navegador lateral |

Banco atual: **112 questões**, nos 4 idiomas, com 238 artigos citados.
Distribuição de corretas: 44 com 1, 35 com 2, 21 com 3 e 12 com 4.
Peso por módulo: 40% FFAR, 30% RSTP, 10% Statutes, 7% Disciplinary, 6% Ethics, 4% Tribunal,
3% Clearing House — com alocação por maior resto, para os módulos pequenos não sumirem.

---

## 9. Manutenção entre edições do exame

- **Datas do exame** — array `EXAM_WINDOWS`, topo de `assets/js/app.js`. Sem janela futura
  cadastrada, o site mostra link para a página oficial em vez de inventar data.
- **Edições dos regulamentos** — array `DOCS`, no mesmo arquivo.
- **Provisões suspensas do FFAR** — a Circular 1873 suspendeu mundialmente regras do FFAR, e o
  Tribunal de Justiça da UE decidiu os casos sobre regulamentação de agentes em julho de 2026. As
  questões seguem o texto do regulamento, que é o que a prova cobra, e a fundamentação avisa quando a
  regra está suspensa. Confirme o estado atual antes de estudar os artigos afetados.

---

## 10. Fontes oficiais

- [FIFA Football Agent Regulations (jan. 2025)](https://digitalhub.fifa.com/m/1e7b741fa0fae779/original/FIFA-Football-Agent-Regulations.pdf)
- [Regulations on the Status and Transfer of Players](https://digitalhub.fifa.com/m/696d877ea35ca761/original/Regulations-on-the-Status-and-Transfer-of-Players-January-2025-edition.pdf)
- [FIFA Statutes (2024)](https://digitalhub.fifa.com/m/16d1f7349fa19ade/original/FIFA-Statutes-2024.pdf)
- [FIFA Disciplinary Code (set. 2025)](https://digitalhub.fifa.com/m/6094262690de769/original/FIFA-Disciplinary-Code-2025.pdf)
- [FIFA Code of Ethics (2023)](https://digitalhub.fifa.com/m/4f048486c1f7293c/original/FIFA-Code-of-Ethics-2023.pdf)
- [Procedural Rules Governing the Football Tribunal](https://digitalhub.fifa.com/m/64099da6c2ca3a6d/original/Procedural-Rules-Governing-the-Football-Tribunal-January-2025-edition.pdf)
- [FIFA Clearing House Regulations](https://digitalhub.fifa.com/m/7c9e9c5185db9eb6/original/FIFA-Clearing-House-Regulations-January-2025-edition.pdf)
- [Information on the Licensing Process and the FIFA Football Agent Exam](https://digitalhub.fifa.com/m/655ce7a9a3d9a407/original/Information-on-the-Licensing-Process-and-the-FIFA-Football-Agent-Exam.pdf)

Os PDFs não são redistribuídos: o site linka para os originais no domínio da FIFA.

---

## 11. Histórico de versões

| Versão | Data | Mudanças |
|---|---|---|
| 2.4 | 13/08/2026 | SEO: `robots.txt`, `sitemap.xml`, Open Graph/Twitter Card com imagem de capa gerada, dados estruturados `schema.org/Course`. `404.html` passa a ser derivado automaticamente de `index.html` a cada publicação, em vez de copiado a mão. Cópia em `_versoes/v2.3-2026-08-13/`. |
| 2.3 | 13/08/2026 | Cache-busting automático: cada publicação gera um `?v=` novo em todos os assets, corrigindo o atraso de até 10 min entre revogar um código e o bloqueio valer para quem já visitou o site. Site zerado de códigos de teste, pronto para venda real. |
| 2.2 | 13/08/2026 | Recebimento por Pix com QR Code e Copia e Cola gerados no build, valor embutido, botão de comprovante por WhatsApp ou e-mail. |
| 2.1 | 13/08/2026 | Licenças nominais com carimbo do titular em todas as telas; preço por região (InfinitePay em reais + internacional em dólar); bloco de credibilidade com afirmações verificáveis e espaço reservado para prova social real. |
| 2.0 | 13/08/2026 | Área exclusiva por licença; banco criptografado; página inicial explicativa; 3 questões fixas de demonstração; checkout de US$ 20; ferramenta de emissão e revogação de códigos. |
| 1.0 | 13/08/2026 | Simulador aberto: 112 questões em 4 idiomas, calculadora, estudo, revisão espaçada, estatísticas, PWA. Cópia em `_versoes/v1.0-2026-08-13/`. |
