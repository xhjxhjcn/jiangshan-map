// 二轮微调：署名与星标按钮文案
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const p = path.join(ROOT, 'js/app.js');
let s = fs.readFileSync(p, 'utf8');
const before = s;

s = s.split('Star DeanChensj/jiangshan-map on GitHub').join('Star xhjxhjcn/jiangshan-map on GitHub');
// 「更多」菜单里原先显示上游域名，改为标注原作者
s = s.replace(
  /setMoreCopy\('sub-more-about', '[^']*', '[^']*'\);/,
  "setMoreCopy('sub-more-about', 'By DeanChensj (GPL-3.0)', '原作者 DeanChensj · GPL-3.0');"
);

if (s !== before) {
  fs.writeFileSync(p, s);
  console.log('js/app.js 已更新');
} else {
  console.log('js/app.js 无变化');
}
