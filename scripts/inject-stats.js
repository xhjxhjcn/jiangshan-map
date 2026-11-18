// 把 xhja.cn 集群访客统计脚本注入 index.html 的 </body> 前（幂等）。
//
// 上游没有这段，每次同步上游（取上游版 index.html）后都要重跑一次。
// 幂等：已存在则跳过。
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const idxPath = path.join(ROOT, 'index.html');
let html = fs.readFileSync(idxPath, 'utf8');

if (html.includes('stats.js?site=map')) {
  console.log('统计脚本已存在，跳过');
  process.exit(0);
}

const comment =
  '  <!-- 访客统计：xhja.cn 集群自建（api.xhja.cn 提供），看板在 dash.xhja.cn。\n' +
  '       只统计页面访问与停留，不用 Cookie，不上报 IP（服务端加盐现算访客标识）。 -->\n';
const tag = '  <script defer src="https://api.xhja.cn/stats.js?site=map"></script>\n';

if (!html.includes('</body>')) {
  console.error('index.html 里找不到 </body>，无法注入');
  process.exit(1);
}

html = html.replace('</body>', comment + tag + '</body>');
fs.writeFileSync(idxPath, html);
console.log('已注入访客统计脚本');
