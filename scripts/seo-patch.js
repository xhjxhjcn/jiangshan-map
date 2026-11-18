// 本站 SEO 定制的可复用补丁（幂等）。
//
// 背景：这些改动（首页标题/关键词、隐藏 SEO 目录里的「总览」区块）原本是手工做的，
// 没有沉淀成脚本。2026-11-18 同步上游时因为它们不在 customize.js 里，全部丢失，
// verify-localization 报了 6 项 LOST。本脚本把它们固化下来。
//
// 上游同步（取上游版 index.html）后必须重跑：
//   node scripts/seo-patch.js
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const idxPath = path.join(ROOT, 'index.html');
let html = fs.readFileSync(idxPath, 'utf8');
const before = html;

// ---------- 1. 标题与关键词：补「王朝地图 / 朝代地图 / 历史人物足迹」----------
const TITLE = '<title>江山时序 · 中国历史地图时间轴｜王朝地图、历代疆域与历史人物足迹（战国至现代）</title>';
const DESC =
  '<meta name="description" id="meta-description" content="交互式中国历史地图时间轴（公元前403年战国三家分晋至现代）：看18个王朝的王朝地图与朝代地图、多阶段历史疆域与州郡道省政区、黄河改道水系、历代古城古今地名对照（点地溯源），以及张骞、诸葛亮、玄奘、李白、苏轼等历史人物足迹行迹路线与天下名关，支持现代省界对照与中英双语。" />';
const KW_ADD = [
  '王朝地图', '中国王朝地图', '王朝疆域地图', '中国历代王朝地图', '中国历代王朝地图',
  '朝代地图', '中国朝代地图', '历代朝代地图', '中国历代疆域地图', '中国历代版图',
  '历史地图', '历史人物足迹', '历史人物足迹地图', '历史人物地图', '古代人物行迹地图',
  '人物行迹路线图',
];

// 标题
html = html.replace(/<title>[\s\S]*?<\/title>/, TITLE);
// 描述
html = html.replace(/<meta name="description" id="meta-description" content="[\s\S]*?"\s*\/>/, DESC);

// 关键词：在原有基础上补齐缺失项，不删上游新增
const kwMatch = html.match(/<meta name="keywords" content="([^"]*)"\s*\/>/);
if (kwMatch) {
  const cur = kwMatch[1].split(',').map((s) => s.trim()).filter(Boolean);
  const set = new Set(cur);
  for (const k of KW_ADD) set.add(k);
  html = html.replace(kwMatch[0], `<meta name="keywords" content="${[...set].join(',')}" />`);
}

// ---------- 2. 隐藏 SEO 目录：加「总览」区块（链到两个落地页）----------
const OVERVIEW_BLOCK = `      <section>
        <h3>总览：王朝地图与历史人物足迹</h3>
        <ul>
          <li><a href="https://map.xhja.cn/topics/dynasty-maps.html"><strong>王朝地图 · 中国历代王朝疆域地图总览（18个朝代）</strong></a> — 按时间顺序汇总战国至中华人民共和国的王朝疆域地图、都城与现代政区对照，含每朝版图阶段快照数量、城池古今地名对照与编年大事索引，即通常所说的「朝代地图」「中国历代版图」总览。</li>
          <li><a href="https://map.xhja.cn/topics/person-footprints.html"><strong>历史人物足迹地图 · 历史人物行迹路线总览</strong></a> — 张骞凿空西域、诸葛亮出山北伐、玄奘西行求法、李白仗剑壮游、苏轼宦海贬谪、王阳明悟道六条逐站考据的完整行迹路线，另收录 128 位历史人物与 20 座天下名关，可在地图上按姓名检索时空轨迹。</li>
        </ul>
      </section>
`;

if (!html.includes('topics/dynasty-maps.html')) {
  // 插到隐藏目录第一段之前；找不到锚点就插在第一个 <section> 前
  const anchor = /(\s*<section>\s*\n\s*<h3>一、)/;
  if (anchor.test(html)) {
    html = html.replace(anchor, '\n' + OVERVIEW_BLOCK + '$1');
  } else {
    const firstSection = html.indexOf('<section>');
    if (firstSection !== -1) {
      html = html.slice(0, firstSection) + OVERVIEW_BLOCK + html.slice(firstSection);
    } else {
      console.warn('找不到隐藏目录的 <section>，跳过总览区块');
    }
  }
  console.log('隐藏目录：已补「总览」区块');
} else {
  console.log('隐藏目录：总览区块已存在');
}

if (html !== before) {
  fs.writeFileSync(idxPath, html);
  console.log('index.html 已更新');
} else {
  console.log('index.html 无变化');
}
