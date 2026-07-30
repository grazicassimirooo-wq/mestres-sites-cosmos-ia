import { readFile, writeFile } from "node:fs/promises";

const RESULT_PATH = "/tmp/project-result.json";
const DATA_PATH = "data/portfolio-extra.json";

async function writeResult(result) {
  await writeFile(RESULT_PATH, JSON.stringify(result, null, 2), "utf-8");
}

function parseField(body, label) {
  const pattern = new RegExp(`### ${label}\\s*\\n+([^\\n]+)`, "i");
  const match = body.match(pattern);
  const value = match ? match[1].trim() : "";
  return value === "_No response_" ? "" : value;
}

function slugify(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normalize(value) {
  return value.trim().replace(/\/+$/, "").toLowerCase();
}

function isValidUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// Usa o GitHub Models (IA gratuita embutida no GitHub Actions, autenticada
// pelo próprio GITHUB_TOKEN — sem custo e sem chave externa).
async function generateDescription(name, link) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return null;

  const prompt = `Você descreverá um projeto/site pessoal para um mini-portfólio em português brasileiro.
Nome do projeto: "${name}"
Link: ${link || "(sem link público)"}

Responda APENAS com 1-2 frases em português descrevendo do que se trata o projeto, sem markdown e sem aspas envolvendo o texto todo.`;

  const response = await fetch("https://models.github.ai/inference/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      max_tokens: 200,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) return null;
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content?.trim();
  return text || null;
}

async function main() {
  const body = process.env.ISSUE_BODY || "";
  const name = parseField(body, "Nome do projeto");
  const link = parseField(body, "Link do site \\(se estiver publicado\\)");
  const image = parseField(body, "Imagem \\(URL de uma captura de tela, logo ou foto do projeto\\)");
  let description = parseField(body, "Descrição");

  if (!name) {
    await writeResult({
      success: false,
      message: "Não consegui identificar o nome do projeto no formulário da issue.",
    });
    process.exitCode = 1;
    return;
  }

  if (link && !isValidUrl(link)) {
    await writeResult({
      success: false,
      message: `O link informado ("${link}") não parece uma URL válida.`,
    });
    process.exitCode = 1;
    return;
  }

  if (image && !isValidUrl(image)) {
    await writeResult({
      success: false,
      message: `A imagem informada ("${image}") não parece uma URL válida.`,
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
  const projects = JSON.parse(raw);

  const existing = projects.find((project) => {
    if (link) return normalize(project.link || "") === normalize(link);
    return normalize(project.name) === normalize(name);
  });
  if (existing) {
    await writeResult({
      success: false,
      duplicate: true,
      message: `O projeto "${existing.name}" já está cadastrado no portfólio.`,
    });
    return;
  }

  let aiWarning = null;
  if (!description) {
    try {
      description = (await generateDescription(name, link)) || "";
    } catch (error) {
      aiWarning = `A IA não respondeu (${error.message}).`;
    }
    if (!description) {
      description = "Projeto pessoal cadastrado manualmente.";
      aiWarning = aiWarning || "Cadastrado sem descrição — edite data/portfolio-extra.json para detalhar.";
    }
  }

  const entry = {
    id: slugify(name) || `projeto-${Date.now()}`,
    name,
    link: link || "",
    image: image || "",
    description,
  };

  projects.push(entry);
  await writeFile(DATA_PATH, JSON.stringify(projects, null, 2) + "\n", "utf-8");

  await writeResult({ success: true, warning: aiWarning, ...entry });
}

main().catch(async (error) => {
  await writeResult({ success: false, message: `Erro inesperado: ${error.message}` });
  process.exitCode = 1;
});
