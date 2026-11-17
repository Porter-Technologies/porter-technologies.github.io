// Zero-dependency static site builder: node build.mjs  ->  dist/
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync } from "node:fs";

const data = JSON.parse(readFileSync("data.json", "utf8"));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const rootOf = (depth) => (depth ? "../".repeat(depth) : "./");
const member = (slug) => data.members.find((m) => m.slug === slug);
const projects = [...data.projects].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
const links = (o = {}) =>
  Object.entries(o).map(([k, v]) => `<a class="btn" href="${esc(v)}" target="_blank" rel="noopener">${esc(k)} ↗</a>`).join("");
const initials = (n) => n.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
const avatar = (m, d) => `<div class="avatar">${m.photo ? `<img src="${rootOf(d)}${esc(m.photo.replace(/^\//, ""))}" alt="">` : esc(initials(m.name))}</div>`;
const tags = (p) => `<div class="tags">${p.tech.map((t) => `<span>${esc(t)}</span>`).join("")}</div>`;
const meta = (p) => `<div class="meta">${esc(p.hackathon)}${p.result ? ` · <b>${esc(p.result)}</b>` : ""}</div>`;

const page = (title, body, depth, active) => {
  const r = rootOf(depth);
  const nav = [["Home", ""], ["Projects", "projects/"], ["Team", "team/"]]
    .map(([l, h]) => `<a href="${r}${h}"${l === active ? ' class="on"' : ""}>${l}</a>`).join("");
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(data.tagline)}">
<link rel="stylesheet" href="${r}style.css">
</head><body>
<header class="nav"><a class="logo" href="${r}">${esc(data.name)}<span>.io</span></a><nav>${nav}</nav></header>
<main>${body}</main>
<footer>© ${new Date().getFullYear()} ${esc(data.name)}</footer>
</body></html>`;
};

const projectCard = (p, d) => `<a class="card" href="${rootOf(d)}projects/${p.slug}/">${meta(p)}<h3>${esc(p.title)}</h3><p>${esc(p.summary)}</p>${tags(p)}</a>`;
const miniMember = (m, d) => `<a class="card person" href="${rootOf(d)}team/${m.slug}/">${avatar(m, d)}<div><h3>${esc(m.name)}</h3><p>${esc(m.role)}</p></div></a>`;
// Team page card: not an <a> because it holds link buttons
const teamCard = (m, d) => `<div class="card member">
  <div class="person">${avatar(m, d)}<div><h3><a href="${rootOf(d)}team/${m.slug}/">${esc(m.name)}</a></h3><p>${esc(m.role)}</p></div></div>
  <p class="bio">${esc(m.bio)}</p><div class="actions">${links(m.links)}</div></div>`;

rmSync("dist", { recursive: true, force: true });
mkdirSync("dist", { recursive: true });
cpSync("style.css", "dist/style.css");
if (existsSync("public")) cpSync("public", "dist", { recursive: true });
const out = (path, html) => { mkdirSync(`dist/${path}`, { recursive: true }); writeFileSync(`dist/${path}/index.html`, html); };

// Home: summary + most recent project
const latest = projects[0];
writeFileSync("dist/index.html", page(data.name, `
<section class="hero"><h1>${esc(data.name)}</h1><p>${esc(data.tagline)}</p></section>
<section><h2>About us</h2><p class="about">${esc(data.about || "")}</p>
<div class="stats"><div><b>${data.projects.length}</b><span>projects</span></div><div><b>${data.members.length}</b><span>members</span></div></div></section>
${latest ? `<section><h2>Latest project</h2>
<a class="card feature" href="projects/${latest.slug}/">${meta(latest)}<h3>${esc(latest.title)}</h3><p>${esc(latest.summary)}</p>${tags(latest)}</a>
<p><a class="more" href="projects/">See all projects →</a></p></section>` : ""}
<section><h2>The team</h2><div class="grid">${data.members.map((m) => miniMember(m, 0)).join("")}</div>
<p><a class="more" href="team/">Meet the team →</a></p></section>`, 0, "Home"));

// Projects page
out("projects", page(`Projects · ${data.name}`, `
<section class="hero small"><h1>Projects</h1><p>Everything we've built at hackathons, newest first.</p></section>
<div class="grid">${projects.map((p) => projectCard(p, 1)).join("")}</div>`, 1, "Projects"));

// Team page
out("team", page(`Meet the team · ${data.name}`, `
<section class="hero small"><h1>Meet the team</h1><p>The people behind the projects.</p></section>
<div class="grid wide">${data.members.map((m) => teamCard(m, 1)).join("")}</div>`, 1, "Team"));

// Project detail pages
for (const p of data.projects) {
  const team = p.team.map(member).filter(Boolean);
  out(`projects/${p.slug}`, page(`${p.title} · ${data.name}`, `
<article><a class="back" href="../">← All projects</a>${meta(p)}
<h1>${esc(p.title)}</h1><p class="lead">${esc(p.summary)}</p>
<p>${esc(p.description)}</p>${tags(p)}
<div class="actions">${links(p.links)}</div>
<h2>Built by</h2><div class="grid">${team.map((m) => miniMember(m, 2)).join("")}</div></article>`, 2, "Projects"));
}

// Member detail pages
for (const m of data.members) {
  const mine = projects.filter((p) => p.team.includes(m.slug));
  out(`team/${m.slug}`, page(`${m.name} · ${data.name}`, `
<article><a class="back" href="../">← Team</a>
<div class="profile">${avatar(m, 2)}<div><h1>${esc(m.name)}</h1><p class="lead">${esc(m.role)}</p></div></div>
<p>${esc(m.bio)}</p><div class="actions">${links(m.links)}</div>
${(m.highlights || []).length ? `<h2>Other work</h2><div class="grid">${m.highlights.map((h) => h.url ? `<a class="card" href="${esc(h.url)}" target="_blank" rel="noopener"><h3>${esc(h.title)} ↗</h3><p>${esc(h.text)}</p></a>` : `<div class="card"><h3>${esc(h.title)}</h3><p>${esc(h.text)}</p></div>`).join("")}</div>` : ""}
<h2>Hackathon projects</h2><div class="grid">${mine.map((p) => projectCard(p, 2)).join("") || "<p>Coming soon.</p>"}</div></article>`, 2, "Team"));
}

console.log(`Built ${data.projects.length} projects, ${data.members.length} members -> dist/`);
