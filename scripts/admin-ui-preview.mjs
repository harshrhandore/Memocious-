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
const phase2 = await build({
 stdin:{contents:`import React from "react";import{createRoot}from"react-dom/client";import{BuilderDraftEditor}from"./src/components/builder-draft";import{BuilderFiles}from"./src/components/builder-files";import{Reviews}from"./src/components/reviews";import{BusinessInquiry}from"./src/components/business-inquiry";import{AccountPhase2}from"./src/components/account-phase2";import{AdminPhase2}from"./src/components/admin-phase2";import{HeroCarousel}from"./src/components/hero-carousel";
 const id="12345678-1234-4234-8234-123456789012";const path=location.pathname;
 const p={id,slug:"fixture",name:"Fixture gift",image:"http://localhost:3000/media/gift-0.webp"};
 function FileFixture(){const[d,setD]=React.useState({id,version:1,schemaVersion:2,step:6,payload:{},files:[],expiresAt:"2027-01-01",updatedAt:"2026-10-27"});return <BuilderFiles draft={d} eligible={true} onBusy={()=>{}} onChange={async()=>{setD(await fetch("/api/builder/drafts?id="+id).then(r=>r.json()));}}/>;}
 const element=path.includes("builder-files")?<FileFixture/>:path.includes("builder")?<BuilderDraftEditor available={true} categories={[{id,slug:"hamper",label:"Hamper",parentSlug:null,icon:"gift",sortOrder:0}]} occasions={[]}/>:path.includes("enterprise")?<BusinessInquiry kind="enterprise" products={[{id,name:"Fixture gift",moq:10,leadDays:3}]} available={true} sitekey="fixture"/>:path.includes("contact")?<BusinessInquiry kind="contact" available={true} sitekey="fixture"/>:path.includes("account")?<AccountPhase2/>:path.includes("owner")?<AdminPhase2/>:path.includes("carousel")?<HeroCarousel products={[p,{...p,id:"other",name:"Another gift"}]}/>:<Reviews product={id} slug="fixture" items={[]} count={0} average={null} distribution={{}}/>;
 createRoot(document.getElementById("root")).render(element);`,resolveDir:process.cwd(),loader:"tsx"},write:false,bundle:true,platform:"browser",jsx:"automatic",define:{"process.env.NODE_ENV":'"production"',"process.env":"{}"}
});
const css = (await readdir(".next/static/css")).filter((n) =>
  n.endsWith(".css"),
);
const html = `<!doctype html><html lang="en"><head><title>Isolated Studio UI test</title><meta name="viewport" content="width=device-width,initial-scale=1">${css.map((n) => `<link rel="stylesheet" href="http://localhost:3000/_next/static/css/${n}">`).join("")}</head><body><main class="container prose"><h1>Studio UI fixture</h1><div id="root"></div></main><script src="/ui.js"></script></body></html>`;
createServer(async (req, res) => {
  if (req.url === "/phase2.js") {
    res.setHeader("Content-Type", "text/javascript");res.end(phase2.outputFiles[0].contents);
  } else if (req.url === "/ui.js") {
    res.setHeader("Content-Type", "text/javascript");
    res.end(bundle.outputFiles[0].contents);
  } else {
    res.setHeader("Content-Type", "text/html");
    res.end(req.url.startsWith("/phase2-") ? html.replace("/ui.js", "/phase2.js").replace("Studio UI fixture", "Phase 2 UI fixture") : html);
  }
}).listen(4174, "127.0.0.1", () =>
  console.log(
    "Isolated UI fixture listening at 127.0.0.1:4174; no auth or database.",
  ),
);
