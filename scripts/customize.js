// map.xhja.cn 定制改造（幂等，可重复执行）
//
// 在原始 jiangshan-map 仓库上做 4 件事：
//  1) 自身地址换成 https://map.xhja.cn/（canonical / og:url / sitemap / 站内绝对链接）
//     保留上游作者的外链：作者博客、创作手记、统计端点
//  2) 字体本地化：去掉 Google Fonts，Ma Shan Zheng 子集自托管，其余回落到系统字体栈
//  3) 去掉上游第三方统计（境内外都不可靠），只留站点自身功能
//  4) GitHub 星标按钮指向本仓库
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://map.xhja.cn/';
const UPSTREAM = 'https://deanchen.me/jiangshan-map/';
const UPSTREAM_BARE = 'https://deanchen.me/jiangshan-map';
const SITE_BARE = 'https://map.xhja.cn';

const KEEP = [
  'https://deanchen.me/about/',
  'https://deanchen.me/history/atlas/2026/10/25/jiangshan-map-story.html',
  'https://stats.deanchen.me/e',
];

// ⚠ 这里的 SKIP 很重要：customize.js 会把「上游地址」全局替换成「本站地址」，
//   而 verify-localization.js 等脚本里**需要保留**上游地址作为对照字符串。
//   若被替换，检测会永久误报（2026-11-18 踩过：两项检查自相矛盾）。
//   凡是以「上游地址」为判断依据的脚本都必须列入 SKIP。
const TEXT_EXT = new Set(['.html', '.js', '.json', '.xml', '.txt', '.md', '.css', '.webmanifest', '.yml', '.jsonc']);
const SKIP = new Set([
  'scripts/customize.js', // 自己
  'scripts/verify-localization.js', // 需要上游地址做对照
  'scripts/seo-patch.js', // 同上
  'scripts/indexnow.js', // 不涉及域名替换
  'scripts/inject-stats.js',
]);

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (name === '.git' || name === 'node_modules') continue;
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

// ---------- 1. 地址替换 ----------
let files = 0;
let hits = 0;
for (const file of walk(ROOT)) {
  if (!TEXT_EXT.has(path.extname(file).toLowerCase())) continue;
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  if (SKIP.has(rel)) continue;

  const before = fs.readFileSync(file, 'utf8');
  let src = before;

  const guards = [];
  KEEP.forEach((u, i) => {
    if (src.includes(u)) {
      const token = `\u0000KEEP${i}\u0000`;
      src = src.split(u).join(token);
      guards.push([token, u]);
    }
  });

  const n = src.split(UPSTREAM).length - 1 + (src.split(UPSTREAM_BARE).length - 1);
  src = src.split(UPSTREAM).join(SITE).split(UPSTREAM_BARE).join(SITE_BARE);
  for (const [token, u] of guards) src = src.split(token).join(u);

  if (src !== before) {
    fs.writeFileSync(file, src);
    files++;
    hits += n;
  }
}
console.log(`地址：${files} 个文件、${hits} 处 -> ${SITE}`);

// ---------- 2/3/4. index.html ----------
const idxPath = path.join(ROOT, 'index.html');
let html = fs.readFileSync(idxPath, 'utf8');
const beforeHtml = html;

// 字体：整块换掉。上游有两代写法，都要认得：
//   旧版：<link href="https://fonts.googleapis.com/css2?..." ...>
//   新版(#490)：<link data-font-href="https://fonts.googleapis.com/css2?..." ...>
// 新版只是「延迟激活」Google Fonts，境内依然下载不到，所以照样换成自托管。
const LOCAL_FONT_BLOCK =
  '  <!-- 字体自托管：Ma Shan Zheng 只保留站内用到的字形子集（17.6 KB）；\n' +
  '       Noto Serif SC / Noto Sans SC 的全量中文分片有几百个文件，会撑爆静态站文件上限，\n' +
  '       因此不下载，交给 css/style.css 里的系统字体栈（宋体 / 雅黑 / PingFang）兜底。 -->\n' +
  '  <link rel="preload" href="assets/fonts/ma-shan-zheng.woff2" as="font" type="font/woff2" crossorigin />\n' +
  '  <link rel="stylesheet" href="css/fonts.css?v=1" />\n';

let fontReplaced = false;
// 最稳：逐行删掉任何引用 Google Fonts 的 <link>（href= 或 data-font-href= 都算），
// 以及紧邻的「Webfonts must not block...」注释块。上游可能把 link 拆散、中间插注释，
// 用大正则整块匹配容易漏（2026-11-21 就漏了一条 Ma Shan Zheng）。
const lines = html.split('\n');
const kept = [];
for (const line of lines) {
  if (/^\s*<!--\s*Webfonts must not block/.test(line)) continue;
  if (/fonts\.googleapis\.com|fonts\.gstatic\.com/.test(line)) continue;
  kept.push(line);
}
html = kept.join('\n');

// 在 css/style.css 那条 link 之前插入自托管块（若还没有）
if (!html.includes('css/fonts.css')) {
  const cssLink = html.match(/^\s*<link rel="stylesheet" href="css\/style\.css[^>]*>\s*$/m);
  if (cssLink) {
    html = html.replace(cssLink[0], LOCAL_FONT_BLOCK + cssLink[0]);
    fontReplaced = true;
  }
}
console.log(fontReplaced ? '字体：已改为自托管' : '字体：已是自托管或未匹配');

// 统计：上游 #490 也改了格式（beacon 变成 data- 属性延迟加载），
// 且 #490 之后 atlas_track.js 单独一行、vercount / cloudflare 不再固定成三连。
// 目标不变：这三个上游统计一个都不要。
const beforeAnalytics = html;
// 删掉所有指向统计的 <script>（无论 href 还是 data-href，无论 vercount / atlas_track / cloudflare）
html = html
  .split('\n')
  .filter((line) => {
    if (/atlas_track\.js/.test(line)) return false;
    if (/events\.vercount\.one/.test(line)) return false;
    if (/cloudflareinsights\.com/.test(line)) return false;
    return true;
  })
  .join('\n');
// 清掉可能残留的「Analytics:」注释行
html = html.replace(/^\s*<!-- Analytics:[^\n]*-->\n/gm, '');
if (html !== beforeAnalytics) {
  console.log('统计：已移除 vercount / atlas_track / Cloudflare beacon');
} else {
  console.log('统计：未匹配（可能已改过）');
}

// GitHub 按钮
html = html.split('https://github.com/DeanChensj/jiangshan-map').join('https://github.com/xhjxhjcn/jiangshan-map');

if (html !== beforeHtml) fs.writeFileSync(idxPath, html);

// ---------- 字体样式表 ----------
fs.mkdirSync(path.join(ROOT, 'assets/fonts'), { recursive: true });
fs.writeFileSync(
  path.join(ROOT, 'css/fonts.css'),
  `/* 站内自托管字体：替代 Google Fonts，境内可直接访问。
   Ma Shan Zheng 只保留站点实际用到的字符子集，17.6 KB。 */
@font-face {
  font-family: 'Ma Shan Zheng';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('../assets/fonts/ma-shan-zheng.woff2') format('woff2');
}
`
);

console.log('完成');
