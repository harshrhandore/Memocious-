// Isolated UI test harness; this never opens an authenticated application route or grants a role.
import { build } from "esbuild";
import { createServer } from "node:http";
import { readdir } from "node:fs/promises";
const bundle = await build({
  stdin: {
    contents:
      'import React from "react";import{createRoot}from"react-dom/client";import{AdminWorkspace}from"./src/components/admin-workspace";createRoot(document.getElementById("root")).render(<AdminWorkspace/>);',
    resolveDir: process.cwd(),
    loader: "tsx",
  },
  write: false,
  bundle: true,
  platform: "browser",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"', "process.env": "{}" },
});
const css = (await readdir(".next/static/css")).filter((n) =>
  n.endsWith(".css"),
);
const html = `<!doctype html><html lang="en"><head><title>Isolated Studio UI test</title><meta name="viewport" content="width=device-width,initial-scale=1">${css.map((n) => `<link rel="stylesheet" href="http://localhost:3000/_next/static/css/${n}">`).join("")}</head><body><main class="container prose"><h1>Studio UI fixture</h1><div id="root"></div></main><script src="/ui.js"></script></body></html>`;
createServer(async (req, res) => {
  if (req.url === "/ui.js") {
    res.setHeader("Content-Type", "text/javascript");
    res.end(bundle.outputFiles[0].contents);
  } else {
    res.setHeader("Content-Type", "text/html");
    res.end(html);
  }
}).listen(4174, "127.0.0.1", () =>
  console.log(
    "Isolated UI fixture listening at 127.0.0.1:4174; no auth or database.",
  ),
);
