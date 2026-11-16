// Zero-dependency static site builder: node build.mjs  ->  dist/
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync } from "node:fs";

const data = JSON.parse(readFileSync("data.json", "utf8"));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const member = (slug) => data.members.find((m) => m.slug === slug);
const links = (o = {}) =>
  Object.entries(o).map(([k, v]) => `<a class="btn" href="${esc(v)}" target="_blank" rel="noopener">${esc(k)} ↗</a>`).join("");
const initials = (n) => n.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
const avatar = (m) => `<div class="avatar">${m.photo ? `<img src="${esc(m.photo)}" alt="">` : esc(initials(m.name))}</div>`;

const page = (title, body, depth = 0) => {
  const root = depth ? "../".repeat(depth) : "./";
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(data.tagline)}">
<link rel="stylesheet" href="${root}style.css">
</head><body>
<header class="nav"><a class="logo" href="${root}">${esc(data.name)}<span>.io</span></a>
<nav><a href="${root}#projects">Projects</a><a href="${root}#team">Team</a></nav></header>
<main>${body}</main>
<footer>© ${new Date().getFullYear()} ${esc(data.name)} · portertech.io</footer>
</body></html>`;
};

const projectCard = (p, depth) => `<a class="card" href="${depth ? "../../" : ""}projects/${p.slug}/">
  <div class="meta">${esc(p.hackathon)}${p.result ? ` · <b>${esc(p.result)}</b>` : ""}</div>
  <h3>${esc(p.title)}</h3><p>${esc(p.summary)}</p>
  <div class="tags">${p.tech.map((t) => `<span>${esc(t)}</span>`).join("")}</div></a>`;

const memberCard = (m) => `<a class="card person" href="team/${m.slug}/">${avatar(m)}<div><h3>${esc(m.name)}</h3><p>${esc(m.role)}</p></div></a>`;

rmSync("dist", { recursive: true, force: true });
mkdirSync("dist", { recursive: true });
cpSync("style.css", "dist/style.css");
if (existsSync("public")) cpSync("public", "dist", { recursive: true });
const out = (path, html) => { mkdirSync(`dist/${path}`, { recursive: true }); writeFileSync(`dist/${path}/index.html`, html); };

writeFileSync("dist/index.html", page(data.name, `
<section class="hero"><h1>${esc(data.name)}</h1><p>${esc(data.tagline)}</p></section>
<section id="projects"><h2>Projects</h2><div class="grid">${data.projects.map((p) => projectCard(p, 0)).join("")}</div></section>
<section id="team"><h2>Team</h2><div class="grid">${data.members.map(memberCard).join("")}</div></section>`));

for (const p of data.projects) {
  const team = p.team.map(member).filter(Boolean);
  out(`projects/${p.slug}`, page(`${p.title} · ${data.name}`, `
<article><a class="back" href="../../">← All projects</a>
<div class="meta">${esc(p.hackathon)}${p.result ? ` · <b>${esc(p.result)}</b>` : ""}</div>
<h1>${esc(p.title)}</h1><p class="lead">${esc(p.summary)}</p>
<p>${esc(p.description)}</p>
<div class="tags">${p.tech.map((t) => `<span>${esc(t)}</span>`).join("")}</div>
<div class="actions">${links(p.links)}</div>
<h2>Built by</h2><div class="grid">${team.map((m) => `<a class="card person" href="../../team/${m.slug}/">${avatar(m)}<div><h3>${esc(m.name)}</h3><p>${esc(m.role)}</p></div></a>`).join("")}</div>
</article>`, 2));
}

for (const m of data.members) {
  const mine = data.projects.filter((p) => p.team.includes(m.slug));
  out(`team/${m.slug}`, page(`${m.name} · ${data.name}`, `
<article><a class="back" href="../../">← Team</a>
<div class="profile">${avatar(m)}<div><h1>${esc(m.name)}</h1><p class="lead">${esc(m.role)}</p></div></div>
<p>${esc(m.bio)}</p><div class="actions">${links(m.links)}</div>
<h2>Projects</h2><div class="grid">${mine.map((p) => projectCard(p, 2)).join("") || "<p>Coming soon.</p>"}</div>
</article>`, 2));
}

console.log(`Built ${data.projects.length} projects, ${data.members.length} members -> dist/`);
