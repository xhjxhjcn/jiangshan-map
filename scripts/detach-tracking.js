// 从 sync_version.js 的校验清单里摘掉 js/atlas_track.js。
//
// 本站在 customize.js 中移除了上游的 atlas_track.js（它只对 deanchen.me 生效），
// 校验器仍把它当作「必须存在且带 ?v=」的资源，导致 CI 的 validate_atlas 失败。
// 这个脚本幂等，重复执行无副作用。
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const p = path.join(ROOT, 'scripts/sync_version.js');
let s = fs.readFileSync(p, 'utf8');
const before = s;

s = s.replace(/^\s*'js\/atlas_track\.js',\n/m, '');

if (s !== before) {
  fs.writeFileSync(p, s);
  console.log('已从 STATIC_TAG_ASSETS 移除 js/atlas_track.js');
} else {
  console.log('无需改动（可能已移除）');
}
