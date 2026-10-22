import sharp from "sharp";
import { mkdir } from "node:fs/promises";
await mkdir("public/media", { recursive: true });
const flowers = (x, y, c) =>
  `<g transform="translate(${x} ${y})">${[0, 60, 120, 180, 240, 300].map((a) => `<ellipse rx="16" ry="28" fill="${c}" transform="rotate(${a}) translate(0 -17)"/>`).join("")}<circle r="12" fill="#d8a94f"/></g>`;
for (let n = 0; n < 10; n++) {
  const bg = ["#f4e4dd", "#eee7d5", "#e8e9de", "#f2ddd8", "#e5dde8"][n % 5];
  const c = ["#ae4c66", "#ede1c2", "#ac7b93", "#be805b", "#968aaa"][n % 5];
  const kind = n % 5;
  let art = "";
  if (kind === 0 || kind === 4)
    art = `<path d="M150 240 Q320 185 490 240 L466 440 Q320 478 174 440Z" fill="#be9572"/><ellipse cx="320" cy="240" rx="170" ry="49" fill="#e7ccac"/><path d="M178 250 Q170 70 320 85 Q470 70 462 250" fill="none" stroke="#bd9169" stroke-width="15"/>${[205, 250, 298, 350, 398].map((x, i) => `<rect x="${x}" y="${203 + (i % 2) * 14}" width="38" height="81" rx="4" fill="${["#8e2c48", "#d6a96a", "#f3e2be"][i % 3]}"/><path d="M${x + 19} 207v76" stroke="#f5d6ac" stroke-width="3"/>`).join("")}<path d="M160 304Q320 335 480 304v43Q320 374 160 347Z" fill="${c}"/><path d="M320 319C213 250 272 249 320 319C385 246 421 274 320 319" fill="${c}" stroke="#f4c9b8" stroke-width="4"/><rect x="270" y="374" width="99" height="44" rx="2" fill="#fff8f0" transform="rotate(-8 320 396)"/><text x="320" y="401" text-anchor="middle" fill="#8e2c48" font-family="serif" font-size="17">with love</text>`;
  if (kind === 1)
    art = `<path d="M200 220 320 490 442 220 329 300Z" fill="#c9b69d"/><path d="M222 225 320 470 411 226 320 305Z" fill="#f1ddc9"/><path d="M270 368 320 404 373 368 346 421 294 421Z" fill="${c}"/>${[
      [225, 204],
      [278, 155],
      [336, 191],
      [390, 170],
      [299, 231],
      [369, 259],
      [207, 267],
    ]
      .map(
        ([x, y]) =>
          `<path d="M320 385L${x} ${y}" stroke="#5d7856" stroke-width="5"/>${flowers(x, y, c)}`,
      )
      .join("")}`;
  if (kind === 2)
    art = `<path d="M166 170Q320 92 473 170L461 439Q320 485 179 439Z" fill="#b88766"/><path d="M185 185Q320 119 450 185L440 420Q320 456 197 420Z" fill="#fff8eb"/>${[
      [267, 257],
      [356, 292],
      [295, 362],
    ]
      .map(([x, y]) => flowers(x, y, c))
      .join(
        "",
      )}<path d="M292 427Q267 327 380 207" fill="none" stroke="#718265" stroke-width="5"/><path d="M290 355Q232 343 246 316Q298 319 290 355M337 276Q331 220 364 231Q380 253 337 276" fill="#99a585"/>`;
  if (kind === 3)
    art = `<ellipse cx="320" cy="320" rx="132" ry="141" fill="${c}" stroke="#dfb375" stroke-width="8"/><ellipse cx="320" cy="320" rx="107" ry="116" fill="#f1ddcd"/>${flowers(314, 297, "#fff4df")}<text x="320" y="379" text-anchor="middle" font-family="serif" font-size="32" fill="#8e2c48">M</text><circle cx="320" cy="155" r="40" fill="none" stroke="#c69750" stroke-width="10"/><path d="M320 194v-10" stroke="#c69750" stroke-width="9"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640"><defs><radialGradient id="b"><stop stop-color="#ffffff" stop-opacity=".65"/><stop offset="1" stop-color="${bg}"/></radialGradient><filter id="s"><feDropShadow dx="0" dy="14" stdDeviation="15" flood-color="#5c3625" flood-opacity=".17"/></filter></defs><rect width="640" height="640" fill="${bg}"/><rect width="640" height="640" fill="url(#b)"/><ellipse cx="320" cy="507" rx="182" ry="24" fill="#80634f" opacity=".1"/><g transform="translate(0 14)" filter="url(#s)">${art}</g><path d="M70 74v28M56 88h28M539 450v22M528 461h22" stroke="#b99560" stroke-width="2"/><circle cx="519" cy="130" r="4" fill="#b99560"/></svg>`;
  await sharp(Buffer.from(svg))
    .webp({ quality: 88 })
    .toFile(`public/media/gift-${n}.webp`);
}
