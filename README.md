# Mestres dos Sites Cosmos IA

Catálogo pessoal de ferramentas de dev/IA open source: para que servem, como
usar, se são pagas ou gratuitas, e link direto — organizadas por segmento.
Inclui uma cena 3D interativa (three.js + OrbitControls), modo claro/escuro,
e um mini portfólio puxado automaticamente dos meus repositórios públicos no
GitHub.

## Setup

Nenhum! Tudo é automático e **100% gratuito**:

- O site é publicado na branch `gh-pages` (o GitHub Pages ativa sozinho
  quando essa branch existe) e o workflow `.github/workflows/deploy.yml`
  a mantém sincronizada a cada push em `main`.
- A descrição automática das ferramentas usa o **GitHub Models** — a IA
  gratuita embutida no GitHub Actions, autenticada pelo próprio
  `GITHUB_TOKEN`. Sem chave externa, sem cartão, sem custo.
- Se a IA estiver indisponível (ex.: limite de uso momentâneo), a
  ferramenta é cadastrada mesmo assim com uma descrição padrão editável.

## Como cadastrar uma ferramenta nova

1. Vá em `Issues` → `New issue` → template **"Nova ferramenta de IA/Dev"**.
2. Preencha só **Nome** e **Link**.
3. Uma GitHub Action roda sozinha: usa o GitHub Models (gratuito) para
   gerar descrição, categoria e se é paga/gratuita/freemium, atualiza
   `data/tools.json`, publica o site, comenta o resultado na issue e a
   fecha automaticamente.

Ferramentas com o mesmo link já cadastrado são ignoradas (a issue é fechada
com um aviso de duplicidade).

## Como cadastrar um projeto seu que não está no GitHub

O mini-portfólio busca automaticamente os repositórios públicos do GitHub,
mas nem todo projeto seu tem um repo (ex.: sites feitos noutra ferramenta,
protótipos, trabalhos de cliente). Para esses:

1. Vá em `Issues` → `New issue` → template **"Meu projeto (não está no
   GitHub)"**.
2. Preencha o **Nome**; **Link**, **Imagem** e **Descrição** são opcionais.
   - **Imagem**: cole o link de uma captura de tela, logo ou foto. Uma forma
     gratuita de conseguir esse link é arrastar o arquivo de imagem para a
     própria caixa de texto da issue no GitHub — ele faz o upload e gera a
     URL sozinho.
   - Sem imagem, o site gera uma miniatura automática (screenshot do link,
     se houver, ou um cartão com as iniciais do nome).
   - Sem descrição, a IA gratuita do GitHub Models tenta gerar uma (se
     houver link); caso contrário, fica um texto padrão editável.
3. A GitHub Action processa a issue, atualiza `data/portfolio-extra.json`,
   publica o site, comenta o resultado e fecha a issue.

Esses projetos aparecem no portfólio antes dos repositórios puxados do
GitHub.

## Estrutura

- `index.html`, `css/style.css` — layout, modo claro/escuro (`data-theme` +
  `prefers-color-scheme`).
- `js/theme.js` — alterna e persiste o tema no `localStorage`.
- `js/main.js` — carrega `data/tools.json`, filtros por categoria/busca,
  alternância grade/lista, e monta o portfólio a partir de
  `data/portfolio-extra.json` + `https://api.github.com/users/<usuário>/repos`.
- `js/three-bg.js` — cena 3D (three.js + `OrbitControls`) no hero, via
  import map apontando para o CDN unpkg (sem dependência local).
- `data/tools.json` — catálogo (seed com alguns exemplos; edite/apague à
  vontade).
- `data/portfolio-extra.json` — projetos do portfólio que não têm
  repositório no GitHub (nome, link, imagem e descrição opcionais).
- `.github/ISSUE_TEMPLATE/nova-ferramenta.yml` — formulário de cadastro de
  ferramenta.
- `.github/ISSUE_TEMPLATE/meu-projeto.yml` — formulário de cadastro de
  projeto sem repositório no GitHub.
- `.github/workflows/add-tool.yml` — processa a issue de ferramenta, chama
  a IA gratuita do GitHub Models e publica o site.
- `.github/workflows/add-project.yml` — processa a issue de projeto e
  publica o site.
- `.github/workflows/deploy.yml` — sincroniza a branch `gh-pages` (GitHub
  Pages) a cada push em `main`.
- `scripts/generate-tool-entry.mjs` — script Node chamado pelo workflow de
  ferramentas.
- `scripts/generate-project-entry.mjs` — script Node chamado pelo workflow
  de projetos.

## Trocando o mascote por um modelo 3D profissional

O mascote do hero é construído com formas geométricas do three.js. Para usar
um modelo esculpido (qualidade de "boneco de vinil"), basta subir um arquivo
chamado `assets/cosmo.glb` neste repositório — o site detecta e troca
automaticamente, mantendo as animações (flutuação, seguir o mouse, anéis de
holograma).

Como conseguir um `.glb` de graça:
1. Gere a partir de uma imagem de referência em um serviço de IA
   imagem-para-3D com plano gratuito (ex.: Tripo AI, Meshy, Luma Genie), ou
   baixe um modelo pronto com licença livre no Sketchfab (filtro
   "Downloadable" + formato glTF/GLB).
2. Baixe o resultado em formato **GLB**.
3. No GitHub: `Add file` → `Upload files` → crie a pasta `assets/` e envie o
   arquivo como `cosmo.glb` → commit na branch `main`.
4. O deploy roda sozinho e o site passa a exibir o modelo.

## Rodando localmente

O site busca `data/tools.json` via `fetch`, então precisa ser servido por
HTTP (não abra o `index.html` direto como arquivo):

```bash
python -m http.server 8000
# depois acesse http://localhost:8000
```
