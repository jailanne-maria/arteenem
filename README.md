# NINA — Diagnóstico e aprendizagem com Inteligência Artificial

Plataforma educacional **gratuita** que usa IA para apoiar professores e estudantes do Ensino Médio na preparação para o ENEM. Roda no navegador (celular e computador), **funciona offline** depois do primeiro acesso e **não tem anúncios nem cobrança**.

- **App:** https://jailanne-maria.github.io/arteenem/
- **Projeto:** Ctrl Art — Arte · Tecnologia · Educação · [@ctrl.4rt](https://instagram.com/ctrl.4rt)
- **Autoria:** Jailanne Maria, artista educadora — licenciada em Artes Cênicas (Teatro) pela UFAC · [@maria.jai_](https://instagram.com/maria.jai_)

## O que tem

**Para o estudante**
- Diagnóstico das 4 áreas do ENEM, com plano de estudos personalizado
- Plano por curso: 62 cursos com pesos oficiais do SISU e notas de corte
- Revisões, atividades e flash cards publicados pelos professores
- Jogo de plataforma **Explorar** (investigação contra a desinformação) e roleta de perguntas
- Biblioteca com 136 obras, revistas da UFAC e o **Dicionário Acreanês** (996 verbetes)
- Mural, chat da turma e canal direto "falar com a professora"

**Para o professor**
- Turmas com código de 6 dígitos, relatório de uso e mapa de dificuldades
- Criar revisão e atividade com IA a partir do próprio material (PDF, Word ou texto)
- Feedback individual por estudante
- Fichário de Encenação — 20 jogos teatrais de Viola Spolin

**Acessibilidade e proteção**
- Tamanho de texto ajustável, movimento reduzido e controles maiores
- **Modo acessível:** fazer as fases do jogo como cartões de leitura, sem jogar (para leitor de tela)
- Perfil privado, foto opcional, moderação e **canal de denúncia**
- ECA Digital e LGPD · classificação indicativa autoavaliada em **12 anos**

## Tecnologias

- HTML, CSS e JavaScript puro (sem framework), com service worker e funcionamento offline
- **Firebase** — login Google, banco de dados (Firestore) e notificações push
- **Google Gemini** — o professor usa a própria chave (gratuita), que fica somente no navegador dele
- **pdf.js** e **Mammoth.js** — leitura de PDF e Word enviados pelos professores

## Estrutura do projeto

| Arquivo | Descrição |
|---|---|
| `index.html` | Estrutura das telas |
| `style.css` | Identidade visual (pixel art / Ctrl Art) |
| `script.js` | Lógica do app (turmas, revisões, atividades, admin, perfil) |
| `plataforma.js` | Motor do jogo de plataforma (aba Explorar) |
| `explorar.js` | Fases, cenas e as afirmações do jogo |
| `cursos.js` / `plano.js` / `questoes.js` | Cursos, plano de estudos e banco de questões |
| `glossario.js` / `glossario-acreanes.js` | Glossário de IA e Dicionário Acreanês |
| `encenacao.js` | Fichário de Encenação (Viola Spolin) |
| `firebase-config.js` | Funções do Firebase (dados, push, suporte, denúncias) |
| `firestore.rules` | Regras de segurança do banco de dados |
| `sw.js` / `manifest.json` | Funcionamento offline e instalação (PWA) |

## Automação (GitHub Actions)

- `.github/workflows/enviar-push.yml` — envia a notificação quando há novidade nova
- `.github/workflows/buscar-noticias.yml` — busca as notícias (MEC e Agência Brasil) e gera os temas de redação, 2× por dia

## Publicação

Hospedado no **GitHub Pages** (branch `main`, pasta raiz).

## Licenças

| O quê | Licença |
|---|---|
| **Código-fonte** (HTML, CSS, JavaScript, configurações) | **MIT** — veja [`LICENSE`](LICENSE) |
| **Conteúdo autoral** (textos, roteiros, questões, glossários, materiais didáticos) | **CC BY-SA 4.0** — veja [`LICENSE-CONTEUDO.md`](LICENSE-CONTEUDO.md) |
| **Conteúdos de terceiros** | créditos no app, em *Fontes e créditos* (Dicionário Acreanês de Pedro Ranzi, questões INEP/MEC, Wikipédia, revistas da UFAC, obras literárias) |

Citação sugerida:

> Jailanne Maria. **NINA — Diagnóstico e aprendizagem com Inteligência Artificial** (Ctrl Art), 2026. Conteúdo sob CC BY-SA 4.0. https://jailanne-maria.github.io/arteenem/

## Contato

Dúvidas, sugestões e parcerias: **[@ctrl.4rt](https://instagram.com/ctrl.4rt)** ou **[@maria.jai_](https://instagram.com/maria.jai_)**.
