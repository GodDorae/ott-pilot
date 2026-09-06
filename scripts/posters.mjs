/**
 * 포스터 이미지 → WebP 변환 + 작품 매칭
 *
 *   node scripts/posters.mjs --check   매칭만 확인 (파일을 만들지 않는다)
 *   node scripts/posters.mjs           변환해서 public/posters/ 에 저장
 *
 * 원본 파일명은 사람이 붙인 것이라 제목과 조금씩 다르다(띄어쓰기, 부제 생략 등).
 * 정규화해서 맞춰보고, 그래도 안 맞는 것만 ALIASES 에 손으로 적는다.
 *
 * 저장 파일명은 작품 id (예: action-A-1.webp) 를 쓴다.
 * URL 에 한글이 들어가지 않고, 어떤 파일이 어느 자리인지 이름만 봐도 분명해진다.
 */

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const SOURCE = "C:/Users/shinb/Downloads/drive-download-20260906T080200Z-1-001";
const OUT = path.join(process.cwd(), "public", "posters");
const CHECK_ONLY = process.argv.includes("--check");

/** 포스터가 화면에 놓이는 최대 폭(약 192px)의 2배 — 고해상도 화면까지 커버 */
const WIDTH = 400;
const QUALITY = 78;

/** 원본 폴더명 → 장르 키 */
const GENRE_DIRS = {
  액션: "action",
  로맨스: "romance",
  코미디: "comedy",
  스릴러: "thriller",
  드라마: "drama",
  SF_판타지: "scifi",
};

/** 정규화로도 안 맞는 것 — 원본 파일명(정규화 후) → 제목(정규화 후) */
const ALIASES = {
  // '래' 와 '레' 로 표기가 갈린다
  더래치드: "더레치드악령의저주",
};

/**
 * macOS 에서 만든 폴더·파일은 한글이 NFD(자모 분리)로 저장된다.
 * 코드에 적은 문자열은 NFC 라 그냥 비교하면 같은 이름인데도 안 맞는다.
 */
const nfc = (s) => s.normalize("NFC");

const norm = (s) =>
  nfc(s)
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/@\d+x/gi, "")
    .replace(/[\s_,.:!?'"()[\]{}·・\-–—]/g, "")
    .toLowerCase();

/**
 * src/lib/stimuli.ts 의 TITLES 리터럴을 읽어 온다.
 * 제목 목록을 스크립트에 복사해 두면 카탈로그를 고칠 때 한쪽만 바뀌어 어긋난다.
 */
function readCatalog() {
  const src = fs.readFileSync(path.join(process.cwd(), "src", "lib", "stimuli.ts"), "utf8");
  const start = src.indexOf("const TITLES");
  const open = src.indexOf("{", start);
  let depth = 0;
  let end = open;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  const literal = src
    .slice(open, end + 1)
    .replace(/([{,]\s*)([A-Za-z_][\w]*)\s*:/g, '$1"$2":')
    .replace(/,(\s*[}\]])/g, "$1");
  const titles = JSON.parse(literal);

  const catalog = {};
  for (const [genre, sets] of Object.entries(titles)) {
    catalog[genre] = {};
    for (const [setId, list] of Object.entries(sets)) {
      catalog[genre][setId] = list.map((title, i) => ({
        id: `${genre}-${setId}-${i + 1}`,
        title,
      }));
    }
  }
  return catalog;
}

async function main() {
  const CATALOG = readCatalog();
  const total = Object.values(CATALOG).flatMap((s) => Object.values(s)).flat().length;
  console.log(`카탈로그 ${total}편 읽음`);

  const rows = [];
  const unmatched = [];
  const unused = [];

  // 디스크에 있는 실제 이름으로 폴더를 찾는다 (NFC/NFD 차이를 흡수)
  const dirsOnDisk = fs
    .readdirSync(SOURCE, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  for (const [dirName, genre] of Object.entries(GENRE_DIRS)) {
    const actual = dirsOnDisk.find((d) => nfc(d) === nfc(dirName));
    if (!actual) {
      console.log(`  ! 폴더 없음: ${dirName}`);
      continue;
    }
    const dir = path.join(SOURCE, actual);
    const files = fs.readdirSync(dir).filter((f) => /\.(png|jpe?g|webp)$/i.test(f));
    const taken = new Set();

    for (const [setId, titles] of Object.entries(CATALOG[genre])) {
      for (const t of titles) {
        const target = norm(t.title);
        const hit = files.find((f) => {
          if (taken.has(f)) return false;
          const n = norm(f);
          const aliased = ALIASES[n];
          return aliased === target || n === target || n.includes(target) || target.includes(n);
        });
        if (hit) {
          taken.add(hit);
          rows.push({ id: t.id, title: t.title, genre, setId, src: path.join(dir, hit), file: hit });
        } else {
          unmatched.push(`${genre}/${setId} · ${t.title}`);
        }
      }
    }
    for (const f of files) if (!taken.has(f)) unused.push(`${dirName}/${f}`);
  }

  console.log(`매칭 ${rows.length}/72`);
  if (unmatched.length) {
    console.log("\n제목에 붙일 이미지를 못 찾음:");
    unmatched.forEach((x) => console.log("  ✗ " + x));
  }
  if (unused.length) {
    console.log("\n어느 제목에도 안 붙은 이미지:");
    unused.forEach((x) => console.log("  ? " + x));
  }
  if (process.argv.includes("--list")) {
    let g = "";
    for (const r of rows) {
      if (r.genre !== g) {
        g = r.genre;
        console.log("");
        console.log("[" + g + "]");
      }
      const same = norm(r.file) === norm(r.title);
      console.log(
        "  " + r.id.padEnd(14) + r.title.padEnd(26) + (same ? "= " : "← ") + r.file,
      );
    }
    return;
  }

  if (CHECK_ONLY) {
    console.log("\n(--check 이므로 변환하지 않음)");
    return;
  }
  if (unmatched.length || unused.length) {
    console.log("\n매칭이 완전하지 않아 변환을 중단합니다.");
    process.exitCode = 1;
    return;
  }

  fs.mkdirSync(OUT, { recursive: true });
  let before = 0;
  let after = 0;
  for (const r of rows) {
    const dest = path.join(OUT, r.id + ".webp");
    before += fs.statSync(r.src).size;
    await sharp(r.src)
      .resize({ width: WIDTH, withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(dest);
    after += fs.statSync(dest).size;
  }
  console.log(
    `\n변환 완료 ${rows.length}개 · ${(before / 1024 / 1024).toFixed(1)}MB → ${(after / 1024 / 1024).toFixed(1)}MB`,
  );
}

main();
