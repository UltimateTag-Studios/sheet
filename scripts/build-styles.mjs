import { copyFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = join(fileURLToPath(import.meta.url), "..", "..");

mkdirSync(join(packageRoot, "dist"), { recursive: true });
copyFileSync(
  join(packageRoot, "styles/sheet.css"),
  join(packageRoot, "dist/style.css"),
);
