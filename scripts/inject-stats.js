// 把 xhja.cn 集群访客统计脚本注入 index.html 的 </body> 前（幂等）。
//
// 上游没有这段，每次同步上游（取上游版 index.html）后都要重跑一次。
// 用 load 后动态注入（async）而非 <script defer src=>：
//   上游 #490 的断言禁止 index.html 里出现外部 <script defer src=http>，
//   动态注入既满足断言，又不参与首屏资源竞争。
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const idxPath = path.join(ROOT, 'index.html');
let html = fs.readFileSync(idxPath, 'utf8');

if (html.includes('stats.js?site=map')) {
  console.log('统计脚本已存在，跳过');
  process.exit(0);
}

const snippet = `  <script>
    // 访客统计（api.xhja.cn / 看板 dash.xhja.cn）：load 后异步注入，不参与首屏资源竞争。
    addEventListener('load', function () {
      var s = document.createElement('script');
      s.src = 'https://api.xhja.cn/stats.js?site=map';
      s.async = true;
      document.head.appendChild(s);
    });
  </script>
`;

if (!html.includes('</body>')) {
  console.error('index.html 里找不到 </body>，无法注入');
  process.exit(1);
}

html = html.replace('</body>', snippet + '</body>');
fs.writeFileSync(idxPath, html);
console.log('已注入访客统计脚本（load 后异步）');
