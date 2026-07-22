#!/usr/bin/env node
// Stop hook: si hay cambios sin commitear al cerrar la sesion, añade una linea
// automatica a progress/history.md para que el historico no se pierda aunque
// se olvide correr /progress:update. No toca feature_list.json ni specs/.
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const repoRoot = process.cwd();
const historyPath = path.join(repoRoot, "progress", "history.md");

function run(cmd) {
  try {
    return execSync(cmd, { cwd: repoRoot, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

const diffStat = run("git diff --stat HEAD");
if (!diffStat) process.exit(0);
if (!fs.existsSync(historyPath)) process.exit(0);

const now = new Date();
const date = now.toISOString().slice(0, 10);
const entry = `\n## ${date} — cierre de sesion automatico\n\nCambios sin commitear detectados al cerrar sesion:\n\n\`\`\`\n${diffStat}\n\`\`\`\n`;

fs.appendFileSync(historyPath, entry, "utf8");
process.exit(0);
