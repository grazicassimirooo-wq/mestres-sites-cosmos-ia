# Mestres dos Sites Cosmos IA

Catálogo pessoal de ferramentas de dev/IA open source: para que servem, como
usar, se são pagas ou gratuitas, e link direto — organizadas por segmento.
Inclui uma cena 3D interativa (three.js + OrbitControls), modo claro/escuro
e um mini jogo.

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

## Como excluir uma ferramenta do catálogo

Cada card tem um botão **Excluir** que apaga a ferramenta na hora, sem sair
do site. Na primeira vez, o site pede um token do GitHub (gratuito, ~2 min,
uma vez só):

1. Abra <https://github.com/settings/personal-access-tokens/new>.
2. Em **Repository access**, escolha **Only select repositories** e marque
   `mestres-sites-cosmos-ia`.
3. Em **Permissions → Repository permissions → Contents**, escolha
   **Read and write**.
4. **Generate token**, copie e cole no site.

A partir daí, clicar em Excluir grava direto em `data/tools.json` pela API
do GitHub, a ferramenta some do catálogo imediatamente e o `deploy.yml`
republica o site em ~1 minuto.

O token fica salvo apenas no `localStorage` do seu navegador — nunca vai
pro repositório. Ele dá acesso de escrita a este repositório, então, se
outra pessoa usa o mesmo computador, use o link **"Remover token salvo"**
dentro do modal quando terminar.

### Alternativa sem token

O caminho por issue continua funcionando: `Issues` → `New issue` → template
**"Excluir ferramenta do catálogo"**. Preencha o **Link** (mais confiável)
ou o **Nome**, e a Action `delete-tool.yml` remove a entrada, republica o
site e fecha a issue. Útil num computador onde você não quer salvar token.

## Estrutura

- `index.html`, `css/style.css` — layout, modo claro/escuro (`data-theme` +
  `prefers-color-scheme`).
- `js/theme.js` — alterna e persiste o tema no `localStorage`.
- `js/main.js` — carrega `data/tools.json`, filtros por categoria/busca,
  alternância grade/lista e a exclusão direta pela API do GitHub (com o
  modal que guarda o token no `localStorage`).
- `js/three-bg.js` — cena 3D (three.js + `OrbitControls`) no hero, via
  import map apontando para o CDN unpkg (sem dependência local).
- `data/tools.json` — catálogo (seed com alguns exemplos; edite/apague à
  vontade).
- `.github/ISSUE_TEMPLATE/nova-ferramenta.yml` — formulário de cadastro de
  ferramenta.
- `.github/ISSUE_TEMPLATE/excluir-ferramenta.yml` — formulário de exclusão
  de ferramenta.
- `.github/workflows/add-tool.yml` — processa a issue de cadastro, chama
  a IA gratuita do GitHub Models e publica o site.
- `.github/workflows/delete-tool.yml` — processa a issue de exclusão e
  publica o site.
- `.github/workflows/deploy.yml` — sincroniza a branch `gh-pages` (GitHub
  Pages) a cada push em `main`.
- `scripts/generate-tool-entry.mjs` — script Node chamado pelo workflow de
  cadastro.
- `scripts/delete-tool-entry.mjs` — script Node chamado pelo workflow de
  exclusão.

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
