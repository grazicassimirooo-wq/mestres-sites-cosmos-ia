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

## Estrutura

- `index.html`, `css/style.css` — layout, modo claro/escuro (`data-theme` +
  `prefers-color-scheme`).
- `js/theme.js` — alterna e persiste o tema no `localStorage`.
- `js/main.js` — carrega `data/tools.json`, filtros por categoria/busca, e
  busca o portfólio via `https://api.github.com/users/<usuário>/repos`.
- `js/three-bg.js` — cena 3D (three.js + `OrbitControls`) no hero, via
  import map apontando para o CDN unpkg (sem dependência local).
- `data/tools.json` — catálogo (seed com alguns exemplos; edite/apague à
  vontade).
- `.github/ISSUE_TEMPLATE/nova-ferramenta.yml` — formulário de cadastro.
- `.github/workflows/add-tool.yml` — processa a issue, chama a IA gratuita
  do GitHub Models e publica o site.
- `.github/workflows/deploy.yml` — sincroniza a branch `gh-pages` (GitHub
  Pages) a cada push em `main`.
- `scripts/generate-tool-entry.mjs` — script Node chamado pelo workflow.

## Rodando localmente

O site busca `data/tools.json` via `fetch`, então precisa ser servido por
HTTP (não abra o `index.html` direto como arquivo):

```bash
python -m http.server 8000
# depois acesse http://localhost:8000
```
