import { readFile, writeFile } from "node:fs/promises";

const RESULT_PATH = "/tmp/tool-result.json";
const DATA_PATH = "data/tools.json";

async function writeResult(result) {
  await writeFile(RESULT_PATH, JSON.stringify(result, null, 2), "utf-8");
}

function parseField(body, label) {
  const pattern = new RegExp(`### ${label}\\s*\\n+([^\\n]+)`, "i");
  const match = body.match(pattern);
  const value = match ? match[1].trim() : "";
  // Templates de issue mostram "_No response_" quando o campo é opcional e fica vazio.
  return value.toLowerCase() === "_no response_" ? "" : value;
}

function normalizeLink(link) {
  return String(link || "").trim().replace(/\/+$/, "").toLowerCase();
}

function normalizeName(name) {
  return String(name || "").trim().toLowerCase();
}

async function main() {
  const body = process.env.ISSUE_BODY || "";
  const link = parseField(body, "Link");
  const name = parseField(body, "Nome da ferramenta");

  if (!link && !name) {
    await writeResult({
      success: false,
      message: "Informe o link ou o nome da ferramenta a excluir.",
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

  const targetLink = normalizeLink(link);
  const targetName = normalizeName(name);

  const index = tools.findIndex((tool) => {
    if (targetLink && normalizeLink(tool.link) === targetLink) return true;
    if (targetName && normalizeName(tool.name) === targetName) return true;
    return false;
  });

  if (index === -1) {
    await writeResult({
      success: false,
      notFound: true,
      message: `Não achei nenhuma ferramenta com ${link ? `link "${link}"` : `nome "${name}"`} no catálogo.`,
    });
    return;
  }

  const [removed] = tools.splice(index, 1);
  await writeFile(DATA_PATH, JSON.stringify(tools, null, 2) + "\n", "utf-8");

  await writeResult({
    success: true,
    name: removed.name,
    link: removed.link,
  });
}

main().catch(async (error) => {
  await writeResult({ success: false, message: `Erro inesperado: ${error.message}` });
  process.exitCode = 1;
});
