// 同步上游后，重新打上「测试套件里认可本站定制」的几处补丁（幂等）。
//
// 背景：我们把上游的 Google Fonts 换成自托管、移除了 Cloudflare beacon 与
// atlas_track.js。上游的几处断言把这些资源写死成「必须存在」，每次取上游版
// 测试文件后就会被覆盖，导致 CI 失败。这个脚本统一重打，避免每次手工找。
//
// 用字符串定位而非大正则——正则里的引号/反斜杠嵌套太容易写错。
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const write = (p, s) => fs.writeFileSync(path.join(ROOT, p), s);

let changed = 0;

// 取两个标记之间的整段文本（含标记），找不到返回 null
function section(s, startMark, endMark) {
  const a = s.indexOf(startMark);
  if (a < 0) return null;
  const b = s.indexOf(endMark, a);
  if (b < 0) return null;
  return s.slice(a, b + endMark.length);
}

// ---------- 1) 字体断言 ----------
{
  const p = 'scripts/tests/suite_cartography_ui.js';
  let s = read(p);
  if (!s.includes('selfHostedFont')) {
    const start = 'const maShanLinkMatch = indexHtml.match(';
    const end = 'const subsetChars = new Set(decodeURIComponent(maShanLinkMatch[2]));';
    const oldSec = section(s, start, end);
    if (oldSec) {
      const newSec = `const maShanLinkMatch = indexHtml.match(
      /<link href="(https:\\/\\/fonts\\.googleapis\\.com\\/css2\\?family=Ma\\+Shan\\+Zheng&text=([^"&]+)&display=swap)" rel="stylesheet" media="print" onload="this\\.media='all'" \\/>/
    );
    // 本站自托管字体：接受 Google Fonts link 或 css/fonts.css + 自托管 woff2
    const selfHostedFont =
      /<link rel="stylesheet" href="css\\/fonts\\.css\\?v=[0-9a-z]+" \\/>/.test(indexHtml) &&
      /src:\\s*url\\('\\.\\.\\/assets\\/fonts\\/ma-shan-zheng\\.woff2'\\)/.test(
        fs.readFileSync(path.join(ROOT, 'css', 'fonts.css'), 'utf8')
      );
    assert(
      maShanLinkMatch || selfHostedFont,
      'Expected either a non-blocking subsetted Ma Shan Zheng stylesheet <link> or the self-hosted css/fonts.css'
    );
    assert(
      !/<link href="https:\\/\\/fonts\\.googleapis\\.com[^>]*rel="stylesheet" \\/>/.test(indexHtml),
      'Google Fonts stylesheets must not block rendering (media="print" + onload): the host is unreachable for some readers'
    );
    const subsetChars = new Set(
      maShanLinkMatch
        ? decodeURIComponent(maShanLinkMatch[2])
        : fs.readFileSync(path.join(ROOT, 'assets', 'fonts', 'ma-shan-zheng.subset.txt'), 'utf8')
    );`;
      s = s.replace(oldSec, newSec);
      write(p, s);
      changed++;
      console.log('字体断言：已重打');
    } else {
      console.log('字体断言：未匹配（检查上游是否又改了写法）');
    }
  } else {
    console.log('字体断言：已是本站版');
  }
}

// ---------- 2) Cloudflare beacon 断言 ----------
{
  const p = 'scripts/tests/suite_search_runtime.js';
  let s = read(p);
  if (!s.includes('hasCfBeacon')) {
    const start = 'assert(';
    const end = "'Cloudflare beacon must keep \"spa\": false, or every URL state write is counted as a pageview'";
    // 从 beaconCorpus 那段之后的第一个 assert 开始定位
    const anchor = s.indexOf('beaconCorpus');
    const a = s.indexOf(start, anchor);
    const b = a >= 0 ? s.indexOf(end, a) : -1;
    if (a >= 0 && b >= 0) {
      const bEnd = s.indexOf(');', b) + 2;
      const oldSec = s.slice(a, bEnd);
      const newSec = `// 本站在 map.xhja.cn 移除了 Cloudflare Web Analytics（属上游统计、境内不可达），
          // 因此：若存在 beacon 必须保留 spa:false；不存在也算合规。
          const hasCfBeacon = /data-cf-beacon=|['"]data-cf-beacon['"]/.test(beaconCorpus);
          assert(
            !hasCfBeacon ||
              /(?:data-cf-beacon='[^']*|setAttribute\\('data-cf-beacon',\\s*'[^']*)"spa":\\s*false/.test(beaconCorpus),
            ${end}
          );`;
      s = s.replace(oldSec, newSec);
      write(p, s);
      changed++;
      console.log('beacon 断言：已重打');
    } else {
      console.log('beacon 断言：未匹配');
    }
  } else {
    console.log('beacon 断言：已是本站版');
  }
}

// ---------- 3) atlas_track 断言 ----------
{
  const p = 'scripts/tests/suite_search_runtime.js';
  let s = read(p);
  if (!s.includes('if (/js\\/atlas_track\\.js\\?v=/.test(indexHtml))')) {
    const oldBlock = `    const trackSrc = fs.readFileSync(path.join(JS_DIR, 'atlas_track.js'), 'utf8');
    assert(
      /<script defer src="js\\/atlas_track\\.js\\?v=/.test(indexHtml),
      'atlas_track.js must load with defer so it stays out of the first-paint budget'
    );`;
    if (s.includes(oldBlock)) {
      const newBlock = `    const trackSrc = fs.readFileSync(path.join(JS_DIR, 'atlas_track.js'), 'utf8');
    // 本站在 map.xhja.cn 不加载 atlas_track.js（属上游统计），
    // 所以「必须出现 defer 标签」改为「若出现则必须 defer」，脚本本身仍全量自测。
    if (/js\\/atlas_track\\.js\\?v=/.test(indexHtml)) {
      assert(
        /<script defer src="js\\/atlas_track\\.js\\?v=/.test(indexHtml),
        'atlas_track.js must load with defer so it stays out of the first-paint budget'
      );
    }`;
      s = s.replace(oldBlock, newBlock);
      write(p, s);
      changed++;
      console.log('atlas_track 断言：已重打');
    } else {
      console.log('atlas_track 断言：未匹配');
    }
  } else {
    console.log('atlas_track 断言：已是本站版');
  }
}

console.log(`\n共重打 ${changed} 处断言`);
