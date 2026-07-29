import { readFile, writeFile } from "node:fs/promises";

const ALLOWED_CATEGORIES = [
  "Geração de Texto",
  "Geração de Imagem",
  "Código & Dev",
  "Áudio & Voz",
  "Vídeo",
  "Pesquisa & Dados",
  "Design & UI",
  "Produtividade",
  "Outros",
];

const RESULT_PATH = "/tmp/tool-result.json";
const DATA_PATH = "data/tools.json";

async function writeResult(result) {
  await writeFile(RESULT_PATH, JSON.stringify(result, null, 2), "utf-8");
}

function parseField(body, label) {
  const pattern = new RegExp(`### ${label}\\s*\\n+([^\\n]+)`, "i");
  const match = body.match(pattern);
  return match ? match[1].trim() : "";
}

function slugify(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normalizeLink(link) {
  return link.trim().replace(/\/+$/, "").toLowerCase();
}

// Usa o GitHub Models (IA gratuita embutida no GitHub Actions, autenticada
// pelo próprio GITHUB_TOKEN — sem custo e sem chave externa).
async function callGitHubModels(name, link) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN não disponível no ambiente do workflow.");
  }

  const prompt = `Você catalogará uma ferramenta de dev/IA para um site em português brasileiro.
Ferramenta: "${name}"
Link: ${link}

Responda APENAS com um JSON válido, sem markdown, no formato exato:
{"description": "1-2 frases em português explicando para que serve e como se usa", "category": "uma das opções: ${ALLOWED_CATEGORIES.join(", ")}", "pricing": "Grátis, Pago ou Freemium"}`;

  const response = await fetch("https://models.github.ai/inference/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Erro no GitHub Models (${response.status}): ${text}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content?.trim() ?? "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`Resposta da IA não continha JSON válido: ${text}`);
  }

  const parsed = JSON.parse(jsonMatch[0]);
  if (!ALLOWED_CATEGORIES.includes(parsed.category)) {
    parsed.category = "Outros";
  }
  if (!["Grátis", "Pago", "Freemium"].includes(parsed.pricing)) {
    parsed.pricing = "Freemium";
  }
  return parsed;
}

async function main() {
  const body = process.env.ISSUE_BODY || "";
  const name = parseField(body, "Nome da ferramenta");
  const link = parseField(body, "Link");

  if (!name || !link) {
    await writeResult({
      success: false,
      message: "Não consegui identificar o nome e/ou o link da ferramenta no formulário da issue.",
    });
    process.exitCode = 1;
    return;
  }

  let raw = "[]";
  try {
    raw = await readFile(DATA_PATH, "utf-8");
  } catch {
    raw = "[]";
  }
  const tools = JSON.parse(raw);

  const normalizedLink = normalizeLink(link);
  const existing = tools.find((tool) => normalizeLink(tool.link) === normalizedLink);
  if (existing) {
    await writeResult({
      success: false,
      duplicate: true,
      message: `A ferramenta "${existing.name}" (${existing.link}) já está cadastrada no catálogo.`,
    });
    return;
  }

  let generated;
  let aiWarning = null;
  try {
    generated = await callGitHubModels(name, link);
  } catch (error) {
    // Sem IA disponível, cadastra mesmo assim com valores padrão editáveis.
    aiWarning = `A IA não respondeu (${error.message}). A ferramenta foi cadastrada com descrição padrão — edite data/tools.json para ajustar.`;
    generated = {
      description: `Ferramenta cadastrada automaticamente. Edite este texto em data/tools.json para descrever para que serve.`,
      category: "Outros",
      pricing: "Freemium",
    };
  }

  const entry = {
    id: slugify(name) || `tool-${Date.now()}`,
    name,
    link,
    category: generated.category,
    pricing: generated.pricing,
    description: generated.description,
  };

  tools.push(entry);
  await writeFile(DATA_PATH, JSON.stringify(tools, null, 2) + "\n", "utf-8");

  await writeResult({ success: true, warning: aiWarning, ...entry });
}

main().catch(async (error) => {
  await writeResult({ success: false, message: `Erro inesperado: ${error.message}` });
  process.exitCode = 1;
});
