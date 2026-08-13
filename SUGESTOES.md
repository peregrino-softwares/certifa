# Nome, cenários e roteiro de aprimoramento

Documento de apoio à decisão. A plataforma já está funcionando com o nome provisório **Certifa**;
trocar o nome é uma alteração de uma linha (`brand__text` no `index.html` e o `name` no
`manifest.webmanifest`).

---

## 1. Sugestões de nome

### Critérios que usei

Você pediu um nome que **remeta à FIFA de forma sutil** e que seja **fácil de pronunciar** em
pt-BR, inglês (EUA), espanhol e francês. Um nome só passa nos quatro idiomas se evitar letras que
mudam de som entre eles:

| Letra | Problema | Exemplo |
|---|---|---|
| **J** | /ʒ/ em pt e fr, /dʒ/ em en, /x/ em es | *Jogo* vira "Rrogo" na boca de um espanhol |
| **G** antes de e/i | /x/ em espanhol | ***Agentia*** vira "a-RRÊN-tia" |
| **H** | muda em pt/es/fr, aspirado em en | |
| **X**, **LL**, **Ñ**, **W**, **TH** | leitura instável | |

Sobram como seguras: vogais + **B D F K L M N P R S T V** e **C** antes de a/o/u. Todos os nomes
abaixo usam só essas.

E um ponto jurídico que vale mais que estética: **não use "FIFA" no nome, no domínio ou no logo.**
É marca registrada, e o uso comercial por terceiro em produto de preparação é o caminho mais curto
para uma notificação. A ligação tem que ser *semântica*, não literal — que é exatamente o que você
pediu.

### As opções

| Nome | Pronúncia (pt / en / es / fr) | Como conecta à FIFA | Nota |
|---|---|---|---|
| **CERTIFA** ⭐ | ser-TÍ-fa em todos | Raiz *certific-* existe nos quatro idiomas (certificar / certify / certificar / certifier) e a terminação **-FA** são as duas últimas letras de FIFA e as iniciais de *Football Association* | Recomendado |
| **FEDERA** | fe-DÉ-ra em todos | O **F** de FIFA é *Fédération*. "Federa" evoca federação sem dizer a palavra | Excelente foneticamente |
| **TRANSFERA** | trans-FÉ-ra em todos | O objeto do exame é o *sistema de transferências*: transferência / transfer / transferencia / transfert | Mais descritivo, menos abstrato |
| **MUNDIA** | mun-DÍ-a em todos | De Mundial / Mondial — a competição que é sinônimo de FIFA | Bonito, ligação mais frouxa |
| **NORMA** | NOR-ma em todos | Norma / norm / norma / norme: o que o exame cobra é norma pura | Sério, sóbrio, genérico |
| **TRIBUNA** | tri-BÚ-na (pt/es), tri-BUN (fr), TRIB-yun (en) | Arquibancada em pt/es **e** eco do *Football Tribunal* | Duplo sentido bom, mas o inglês foge |
| **ARENA** | a-RÉ-na em todos | Estádio. Universal, mas sem vínculo com a FIFA | Fonética perfeita, ligação fraca |
| ~~AGENTIA~~ | a-JEN-tia / a-**RREN**-tia | — | **Descartado**: o G quebra no espanhol |

### Recomendação

**CERTIFA.** É o único da lista que faz as três coisas ao mesmo tempo: uma pronúncia só nos quatro
idiomas, um significado que o candidato entende na hora (*certificação*) e o eco tipográfico de
FIFA no sufixo, sem usar a marca. **FEDERA** é a segunda escolha e é foneticamente ainda mais
limpa — perde só por ser mais abstrata para quem chega pela primeira vez.

Assinatura sugerida, que carrega o contexto sem violar marca:

> **Certifa** — *Football Agent Exam*

**Antes de fechar:** faça a busca de anterioridade no [INPI](https://busca.inpi.gov.br) (classes 41
– educação e 9 – software) e no [EUIPO](https://euipo.europa.eu), e confira os domínios
`.com` / `.com.br` / `.app`. Um nome curto e bonito que já é de outra pessoa custa caro depois.

---

## 2. Cenários de posicionamento

Mapeei os três concorrentes que você indicou. Vale entender onde cada um está:

| | SportsAgent Institute | Hotmart (curso brasileiro) | playersagent.pro |
|---|---|---|---|
| Modelo | LMS pago, marca estabelecida | PDF + grupo no Telegram, venda avulsa | Web gratuito, feito por um candidato |
| Idiomas | EN / ES / FR | PT + ES + EN | EN |
| Simulado | sim | "simulações" em PDF | sim, fiel ao formato |
| Calculadora / tradutor | — | — | sim |
| Ponto fraco | preço | material estático, acesso expira | conteúdo em inglês, sem PT |

**A brecha real é o português.** A prova não existe em português, o Brasil é o 2º país em número de
inscritos, e nenhum concorrente resolve bem a ponte PT ↔ ES/EN/FR *dentro da questão*. É por isso
que o modo bilíngue lado a lado é o eixo do produto, e não um enfeite.

Três caminhos possíveis:

1. **Gratuito e aberto** (o que está construído). Custo zero de hospedagem, cresce por indicação,
   vira portfólio e autoridade. Monetiza depois — mentoria, consultoria, comunidade.
2. **Freemium.** Simulado e 30 questões livres; banco completo, estatísticas e deck de revisão
   mediante cadastro pago. Exige backend e login — sai do GitHub Pages puro.
3. **Isca de topo de funil.** Plataforma gratuita, e a monetização acontece no curso/mentoria
   vendido por fora (inclusive na própria Hotmart). É o caminho de menor atrito para começar.

Minha leitura: comece pelo **1**, meça, e migre para o **3** quando houver audiência. O **2** custa
infraestrutura antes de existir demanda comprovada.

---

## 3. Roteiro de aprimoramento

### Curto prazo — maior retorno por esforço

1. **Aumentar o banco para 300–400 questões.** Com 112 questões, quem faz cinco simulados começa a
   reconhecer questões repetidas. O gargalo real da plataforma é volume de conteúdo, não código.
   O processo já está pronto: escreva o lote em `_pesquisa/bank/`, rode `validar.py --write`.
2. **Modo "prova cega".** Ligue a opção *não revelar quantas alternativas são corretas* como padrão
   depois do 3º simulado. Saber que "são 3 corretas" é uma muleta que a prova real não dá.
3. **Cronômetro por questão.** São 3 minutos por questão. Mostrar o ritmo ("você está 4 min atrás
   do necessário") treina gestão de tempo, que reprova tanto quanto falta de conteúdo.
4. **Glossário bilíngue.** Os termos que derrubam brasileiro na prova em espanhol —
   *entidad contratante*, *cesión*, *rescisión*, *plazo*, *periodo protegido*. Um card por termo,
   com o artigo onde ele aparece.

### Médio prazo

5. **Simulado do dia da prova.** Modo que replica as restrições reais: sem voltar à página anterior,
   com aviso de invigilação, obrigando consulta ao PDF em vez de memória.
6. **Treino de busca no PDF.** A prova é de livro aberto e é vencida por quem sabe *onde procurar*.
   Um exercício cronometrado do tipo "ache o artigo que trata de X em menos de 40 segundos" pode ser
   o diferencial mais original da plataforma.
7. **Trilha por diagnóstico.** Usar o ranking de artigos fracos para montar automaticamente a
   próxima sessão de estudo.
8. **Relatório de prontidão em PDF** para o candidato levar à mentoria.

### Longo prazo

9. **Alemão.** É idioma oficial da prova e nenhum concorrente brasileiro cobre.
10. **Backend opcional** para sincronizar progresso entre celular e computador.
11. **Comparativo anônimo** — "você está acima de 68% de quem treinou este módulo".

### Riscos a monitorar

- **Deriva regulatória.** A FIFA republica os regulamentos entre edições do exame. Um banco
  desatualizado ensina errado. Reserve uma revisão a cada nova edição das Study Materials.
- **Suspensão de dispositivos do FFAR.** A Circular 1873 suspendeu mundialmente regras do FFAR, e o
  Tribunal de Justiça da UE decidiu os casos sobre regulamentação de agentes em julho de 2026. As
  questões seguem o texto do regulamento — que é o que a prova cobra — mas a fundamentação precisa
  continuar avisando quando a regra está suspensa.
- **Marca e conteúdo.** Manter o aviso de não afiliação visível e nunca reproduzir questão real de
  prova. As 112 questões atuais são originais, redigidas a partir do texto público dos regulamentos.

---

# Anexo v2.0 — nomes melhores (apenas sugestão, nada aplicado)

Agora que o site é um **produto pago e internacional**, o nome precisa de duas coisas que antes eram
opcionais: ser **registrável** e ser **memorável na hora de indicar para um amigo**. Reavaliei a
lista com esse filtro. Continuam valendo as regras fonéticas: nada de **J**, **G** antes de e/i,
**H**, **LL**, **Ñ**, **W** ou **TH**, porque mudam de som entre os quatro idiomas.

| Nome | Pronúncia única | O que significa e como liga à FIFA | Trade-off |
|---|---|---|---|
| **REGULA** ⭐ | re-GU-la | Latim para *regra*. Raiz compartilhada: regra / rule / regla / règle. O exame é 100% sobre **regulations** — FFAR e RSTP têm a palavra no nome | Curto, sério e fácil de registrar. Não grita "futebol" sozinho |
| **TRANSFERA** ⭐ | trans-FE-ra | O objeto exato do exame é o **sistema de transferências**: transferência / transfer / transferencia / transfert | O que o produto faz fica óbvio. Um pouco longo |
| **MERCATO** | mer-KA-to | A palavra que a imprensa esportiva dos quatro idiomas usa para janela de transferências. Diz "futebol" na hora | Memorável, mas é palavra comum — difícil de registrar com exclusividade |
| **FEDERA** | fe-DE-ra | O **F** de FIFA é *Fédération*. Foneticamente a mais limpa da lista | Abstrata para quem chega sem contexto |
| **CERTIFA** | ser-TI-fa | Atual. *Certific-* nos quatro idiomas + o sufixo **-FA** (últimas letras de FIFA, iniciais de *Football Association*) | Boa, mas soa mais "curso" do que "plataforma" |
| **PASSE** | PA-se | Trocadilho triplo: **passar** na prova, o **passe** do futebol e o *Player Passport* do RSTP | Charmoso; genérico demais sozinho, pede um sobrenome |
| **STATUTA** | sta-TU-ta | Dos *FIFA Statutes*, um dos documentos cobrados | Muito jurídico, pouco convidativo |

### Minha recomendação

**REGULA** é o melhor nome para um produto pago. Ele é mais curto que Certifa, mais distintivo, mais
fácil de registrar, e nomeia exatamente aquilo que o cliente está comprando conhecimento — as regras.
Como ele sozinho não diz "futebol", use com assinatura:

> **Regula** — *Football Agent Exam*

**TRANSFERA** é a segunda escolha e resolve o único ponto fraco do Regula: qualquer pessoa do meio
entende na hora do que se trata, porque "sistema de transferências" é o coração do exame.

### Antes de imprimir qualquer coisa

Para um produto que vai cobrar, a checagem deixou de ser opcional:

1. Busca de anterioridade no [INPI](https://busca.inpi.gov.br), classes **41** (educação) e **9** (software).
2. [EUIPO](https://euipo.europa.eu) e [USPTO](https://tmsearch.uspto.gov), já que você vai vender em dólar.
3. Domínios `.com`, `.com.br` e `.app`, e os @ nas redes.
4. E a regra que não muda: **"FIFA" não entra no nome, no domínio nem no logo.**
