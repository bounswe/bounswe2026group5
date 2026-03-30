const fs = require("node:fs");

const coveragePath = "web/coverage/coverage-summary.json";
const summaryPath = process.env.GITHUB_STEP_SUMMARY;

if (!fs.existsSync(coveragePath)) {
  fs.appendFileSync(
    summaryPath,
    "## Frontend Coverage\n\nCoverage file was not generated.\n",
  );
  process.exit(0);
}

const total = JSON.parse(fs.readFileSync(coveragePath, "utf8")).total;
const lines = [
  "## Frontend Coverage",
  "",
  `- Lines: **${total.lines.pct}%** (${total.lines.covered}/${total.lines.total})`,
  `- Statements: **${total.statements.pct}%** (${total.statements.covered}/${total.statements.total})`,
  `- Functions: **${total.functions.pct}%** (${total.functions.covered}/${total.functions.total})`,
  `- Branches: **${total.branches.pct}%** (${total.branches.covered}/${total.branches.total})`,
  "",
];

fs.appendFileSync(summaryPath, lines.join("\n"));
