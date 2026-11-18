// 合并上游后，逐项核对本站的定制改动是否还在。
// 用法: node scripts/verify-localization.js
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const indexHtml = read('index.html');
const appJs = read('js/app.js');
const robots = read('robots.txt');
const sitemap = read('sitemap.xml');

const checks = [
  ['index.html canonical 指向本站', /<link rel="canonical" id="lnk-canonical" href="https:\/\/map\.xhja\.cn\/" \/>/.test(indexHtml)],
  ['index.html og:url 指向本站', /<meta property="og:url" id="og-url" content="https:\/\/map\.xhja\.cn\/" \/>/.test(indexHtml)],
  ['index.html 无上游 topics 站内链接', !/href="https:\/\/deanchen\.me\/jiangshan-map\/topics\//.test(indexHtml)],
  ['index.html 自托管字体 css/fonts.css', /href="css\/fonts\.css\?v=[0-9a-f]+"/.test(indexHtml)],
  ['index.html 无 Google Fonts', !indexHtml.includes('fonts.googleapis.com')],
  ['index.html 无 vercount', !indexHtml.includes('vercount')],
  ['index.html 无 Cloudflare beacon', !indexHtml.includes('cloudflareinsights')],
  ['index.html 无 atlas_track.js', !indexHtml.includes('js/atlas_track.js')],
  ['index.html 含统计脚本 site=map', indexHtml.includes('stats.js?site=map')],
  ['index.html GitHub 指向本仓库', indexHtml.includes('github.com/xhjxhjcn/jiangshan-map')],
  ['index.html title 含「王朝地图」', /<title>[^<]*王朝地图/.test(indexHtml)],
  ['index.html keywords 含「历史人物足迹」', /name="keywords"[^>]*content="[^"]*历史人物足迹/.test(indexHtml)],
  ['index.html 隐藏目录含王朝地图落地页', indexHtml.includes('topics/dynasty-maps.html')],
  ['index.html 隐藏目录含人物足迹落地页', indexHtml.includes('topics/person-footprints.html')],
  ['app.js 星标文案指向本仓库', appJs.includes('Star xhjxhjcn/jiangshan-map')],
  ['app.js 署名含原作者', appJs.includes('原作者 DeanChensj')],
  ['app.js baseSiteUrl 指向本站', /baseSiteUrl = 'https:\/\/map\.xhja\.cn\/'/.test(appJs)],
  ['robots.txt Sitemap 指本站', robots.includes('Sitemap: https://map.xhja.cn/sitemap.xml')],
  ['sitemap.xml 全部指向本站', !sitemap.includes('https://deanchen.me/')],
  ['sitemap.xml 含王朝地图页', sitemap.includes('/topics/dynasty-maps.html')],
  ['sitemap.xml 含人物足迹页', sitemap.includes('/topics/person-footprints.html')],
  ['落地页存在: dynasty-maps', fs.existsSync(path.join(ROOT, 'topics/dynasty-maps.html'))],
  ['落地页存在: person-footprints', fs.existsSync(path.join(ROOT, 'topics/person-footprints.html'))],
  ['字体文件存在', fs.existsSync(path.join(ROOT, 'assets/fonts/ma-shan-zheng.woff2'))],
  ['IndexNow key 文件存在', fs.readdirSync(ROOT).some((f) => /^[0-9a-f]{32}\.txt$/.test(f))],
];

let bad = 0;
for (const [name, ok] of checks) {
  if (!ok) bad++;
  console.log(`${ok ? '  OK  ' : '  LOST'}  ${name}`);
}
console.log(`\n${checks.length - bad}/${checks.length} 项通过`);
process.exit(bad ? 1 : 0);
