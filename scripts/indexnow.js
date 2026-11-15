// 向 IndexNow 推送本站全部 URL（sitemap 为准），让 Bing / Yandex 等立即重抓。
//
// 用法:
//   node scripts/indexnow.js --dry     只列出要推的 URL
//   node scripts/indexnow.js           实际推送
// 需站点已上线且 key 文件可访问：https://map.xhja.cn/<KEY>.txt
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const HOST = 'map.xhja.cn';
const ENDPOINTS = [
  'https://api.indexnow.org/indexnow', // 总入口，会转给 Bing / Yandex / Seznam / Naver
  'https://www.bing.com/indexnow', // 直推 Bing
];

const dry = process.argv.includes('--dry');

// 找出 key 文件
const keyFile = fs.readdirSync(ROOT).find((f) => /^[0-9a-f]{32}\.txt$/.test(f));
if (!keyFile) {
  console.error('没找到 IndexNow key 文件，先运行 node scripts/indexnow-key.js');
  process.exit(1);
}
const key = fs.readFileSync(path.join(ROOT, keyFile), 'utf8').trim();
const keyLocation = `https://${HOST}/${keyFile}`;

// 从 sitemap 取 URL（去掉 XML 转义）
const sm = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
const urls = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map((m) => m[1].replace(/&amp;/g, '&').trim())
  .filter((u) => u.startsWith(`https://${HOST}/`));

console.log('key          :', key);
console.log('keyLocation  :', keyLocation);
console.log('待推送 URL   :', urls.length, '条');

if (dry) {
  urls.slice(0, 10).forEach((u) => console.log('   ', u));
  console.log('    ...');
  process.exit(0);
}

// IndexNow 单次上限 10000 条，这里远低于上限，一次性推
const payload = { host: HOST, key, keyLocation, urlList: urls };

(async () => {
  let ok = 0;
  for (const ep of ENDPOINTS) {
    try {
      const r = await fetch(ep, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(payload),
      });
      const body = await r.text();
      console.log(`${ep} -> ${r.status} ${r.statusText} ${body.slice(0, 300)}`);
      if (r.status === 200 || r.status === 202) ok++;
    } catch (e) {
      console.log(`${ep} -> 失败: ${e.message}`);
    }
  }
  console.log(ok ? `\n推送完成（${ok}/${ENDPOINTS.length} 个端点接受）` : '\n全部端点失败，检查 key 文件是否已上线');
})();
