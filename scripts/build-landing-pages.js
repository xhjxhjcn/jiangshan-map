// 生成两个高搜索意图的聚合落地页：
//   topics/dynasty-maps.html     —— 「王朝地图 / 朝代地图 / 中国历代疆域地图」
//   topics/person-footprints.html —— 「历史人物足迹 / 历史人物地图 / 行迹路线图」
//
// 只使用站点已有的真实数据（DYNASTY_DATA 18 朝、PERSON_PROFILES 128 人、
// HISTORICAL_JOURNEYS 6 条、STRATEGIC_PASSES 20 座），不编造内容，
// 也不为只有姓名、没有描述的人物单独建页（避免低质页拉低整站评级）。
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const BASE = 'https://map.xhja.cn';
const TODAY = new Date().toISOString().slice(0, 10);

// ---------- 载入站点数据 ----------
const sandbox = { window: {}, document: { createElement: () => ({}) }, console };
sandbox.globalThis = sandbox;
sandbox.self = sandbox;
for (const f of ['js/lore_core.js', 'js/lore_detail.js', 'js/map_data.js']) {
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox, { timeout: 30000 });
}
const L = sandbox.window.ATLAS_LORE_DATA;
const DYNASTIES = sandbox.window.DYNASTY_DATA;
const PASSES = L.PASS_DETAILS;
const PASS_LIST = L.STRATEGIC_PASSES;
const PROFILES = L.PERSON_PROFILES;
const JOURNEYS = L.HISTORICAL_JOURNEYS;
const CITY_LORE = L.CITY_LORE;

const esc = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const yZh = (y) => (y < 0 ? `前${Math.abs(y)}` : `${y}`);
const spanZh = (d) => (d.key === 'prc' ? `${yZh(d.fromYear)}—今` : `${yZh(d.fromYear)}—${yZh(d.toYear)}`);

// 与现有专题页一致的静态样式（复用 style.css 的排版外观）
const HEAD_CSS = `<link rel="stylesheet" href="../css/style.css?v=29413ab5" />
<link rel="stylesheet" href="../css/fonts.css?v=1" />
<style>
  :root { --paper:#f3eee4; --ink:#2f2b26; --accent:#8c2f39; --muted:#6b6259; --line:#d8cfc0; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--paper); color:var(--ink);
         font-family:'Noto Serif SC','Songti SC','SimSun',serif; line-height:1.85; }
  .wrap { max-width:900px; margin:0 auto; padding:0 20px 72px; }
  header.site { background:#fffdf8; border-bottom:1px solid var(--line); }
  header.site .inner { max-width:900px; margin:0 auto; padding:14px 20px;
       display:flex; align-items:center; gap:14px; flex-wrap:wrap; }
  .seal { background:var(--accent); color:#fff; padding:3px 9px; border-radius:3px;
          font-size:17px; letter-spacing:1px; }
  header.site nav { margin-left:auto; display:flex; gap:16px; font-size:14px; }
  header.site nav a { color:var(--muted); text-decoration:none; }
  header.site nav a:hover { color:var(--accent); }
  .kicker { display:inline-block; margin:34px 0 10px; color:var(--accent);
            font-size:13px; letter-spacing:2px; }
  h1 { font-size:30px; line-height:1.35; margin:0 0 10px; }
  .en-sub { color:var(--muted); font-size:15px; margin:0 0 22px; }
  .lede { font-size:16px; background:#fffdf8; border-left:3px solid var(--accent);
          padding:14px 18px; margin:0 0 26px; }
  h2 { font-size:21px; margin:38px 0 14px; padding-bottom:8px; border-bottom:1px solid var(--line); }
  h3 { font-size:17px; margin:24px 0 8px; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(250px,1fr)); gap:14px; }
  .card { background:#fffdf8; border:1px solid var(--line); border-radius:6px;
          padding:14px 16px; text-decoration:none; color:inherit; display:block; }
  .card:hover { border-color:var(--accent); }
  .card b { display:block; font-size:16px; margin-bottom:4px; }
  .card span { color:var(--muted); font-size:13.5px; }
  table { width:100%; border-collapse:collapse; margin:16px 0; font-size:14.5px; background:#fffdf8; }
  th,td { border:1px solid var(--line); padding:9px 11px; text-align:left; vertical-align:top; }
  th { background:#efe7d9; font-weight:600; }
  a { color:var(--accent); }
  footer.site-foot { margin-top:52px; padding-top:18px; border-top:1px solid var(--line);
                     color:var(--muted); font-size:13.5px; }
  @media (max-width:600px){ h1{font-size:24px;} .wrap{padding:0 14px 56px;} }
</style>`;

const HEADER = (title) => `<header class="site">
  <div class="inner">
    <a href="../" style="text-decoration:none;color:inherit;display:flex;gap:10px;align-items:center;">
      <span class="seal">江山时序</span><strong>中国历史地图 · 战国 → 今</strong>
    </a>
    <nav>
      <a href="../">进入交互式地图</a>
      <a href="./">专题图志总目录</a>
      <a href="https://github.com/xhjxhjcn/jiangshan-map" target="_blank" rel="noopener noreferrer">GitHub 开源仓库</a>
    </nav>
  </div>
</header>`;

const FOOTER = `<footer class="site-foot">
  <div>© 江山时序（Jiangshan Historical Atlas） · <a href="https://map.xhja.cn/">map.xhja.cn</a>
       · 历史疆域与政区为示意性近似 · 数据整理持续更新中</div>
  <div style="margin-top:6px">开源项目（GPL-3.0），原作者 <a href="https://deanchen.me/about/" target="_blank" rel="noopener noreferrer">Dean Chen（@DeanChensj）</a></div>
</footer>`;

// ---------- 页 1：王朝地图 ----------
function buildDynastyMaps() {
  const rows = DYNASTIES.map((d) => {
    const cityCount = (d.settlements || []).length;
    const ms = (d.milestones || []).length;
    return `<tr>
      <td><a href="${d.key}.html" title="${esc(d.title)}历史地图">${esc(d.title)}</a></td>
      <td>${spanZh(d)}</td>
      <td>${esc(d.seat || '—')}</td>
      <td>${cityCount} 座</td>
      <td>${ms} 项</td>
    </tr>`;
  }).join('\n');

  // 每朝一段实质介绍：用 DYNASTY_DATA 自带的 summary（真实史料摘要），不另编
  const essays = DYNASTIES.map(
    (d) => `<h3>${esc(d.title)}（${spanZh(d)}）· 王朝地图</h3>
    <p>${esc(d.summary || '')}${
      (d.phases || []).length
        ? `本站为该朝保存了 ${(d.phases || []).length} 段版图阶段快照，可拖动时间轴连续查看疆域变化。`
        : ''
    }</p>
    <p>都城：${esc(d.seat || '—')}　·　收录城池 ${(d.settlements || []).length} 座　·　编年大事 ${
      (d.milestones || []).length
    } 项　→　<a href="${d.key}.html" title="${esc(d.title)}历史地图">查看${esc(d.title)}王朝地图</a></p>`
  ).join('\n');

  const cards = DYNASTIES.map(
    (d) => `<a class="card" href="${d.key}.html">
      <b>${esc(d.title)}地图 · ${spanZh(d)}</b>
      <span>都城 ${esc(d.seat || '—')} · ${(d.settlements || []).length} 座城池古今地名对照</span>
    </a>`
  ).join('\n');

  const title = '王朝地图 · 中国历代王朝疆域地图总览（18个朝代·秦到清·可交互）';
  const desc =
    '中国历代王朝地图总览：战国、秦、西汉、东汉、三国、西晋、东晋十六国、南北朝、隋、唐、五代十国、北宋、南宋、元、明、清、民国、中华人民共和国共18个王朝（朝代）的疆域地图、都城与现代政区对照，每朝附多阶段版图快照、州郡政区沿革与编年大事，可拖动时间轴交互查看。';
  const keywords = [
    '王朝地图', '中国王朝地图', '王朝疆域地图', '中国历代王朝地图', '中国王朝分布图',
    '朝代地图', '中国朝代地图', '历代朝代地图', '中国历代疆域地图', '中国历代版图',
    '秦朝地图', '汉朝地图', '唐朝地图', '宋朝地图', '元朝地图', '明朝地图', '清朝地图',
    '中国历史地图', '历史地图', '古代中国地图', '地图上的中国历史', '江山时序',
  ].join(', ');

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}" />
<meta name="keywords" content="${esc(keywords)}" />
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
<meta name="author" content="Jiangshan Atlas Contributors" />
<link rel="canonical" href="${BASE}/topics/dynasty-maps.html" />
<link rel="alternate" hreflang="zh-CN" href="${BASE}/topics/dynasty-maps.html" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="江山时序 · 中国历史地图时间轴" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(desc)}" />
<meta property="og:url" content="${BASE}/topics/dynasty-maps.html" />
<meta property="og:image" content="${BASE}/assets/terrain_relief.webp" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(desc)}" />
<meta name="theme-color" content="#f3eee4" />
${HEAD_CSS}
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "CollectionPage",
      "@id": "${BASE}/topics/dynasty-maps.html#page",
      "url": "${BASE}/topics/dynasty-maps.html",
      "name": "${esc(title)}",
      "description": "${esc(desc)}",
      "inLanguage": "zh-CN",
      "isPartOf": { "@id": "${BASE}/#website" },
      "about": { "@type": "Thing", "name": "中国历代王朝疆域与行政区划地图" },
      "hasPart": [
${DYNASTIES.map(
  (d) => `        { "@type": "Article", "name": "${esc(d.title)}地图", "url": "${BASE}/topics/${d.key}.html" }`
).join(',\n')}
      ]
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "江山时序", "item": "${BASE}/" },
        { "@type": "ListItem", "position": 2, "name": "专题图志总览", "item": "${BASE}/topics/index.html" },
        { "@type": "ListItem", "position": 3, "name": "王朝地图", "item": "${BASE}/topics/dynasty-maps.html" }
      ]
    }
  ]
}
</script>
</head>
<body>
${HEADER()}
<div class="wrap">
  <span class="kicker">历代王朝 · 疆域总览</span>
  <h1>王朝地图 · 中国历代王朝疆域地图总览</h1>
  <p class="en-sub">Dynasty Maps of China — Territory and Administrative Geography from the Warring States (403 BCE) to the Present</p>

  <div class="lede">
    中国自秦统一以来，两千余年间王朝更迭不断，版图与政区屡有伸缩分合。本页把「江山时序」收录的
    <strong>18 个王朝（朝代）</strong>按时间顺序汇总成一册王朝地图总览：每一朝都可进入对应的
    王朝疆域地图，查看该朝的多阶段版图快照、都城所在、州郡（行省）政区层级，以及城池的古今地名对照。
    点击任一王朝即可打开地图，并用底部时间轴在王朝之间连续拖动。
  </div>

  <h2>一、王朝地图一览（按时间顺序）</h2>
  <table>
    <thead><tr><th>王朝 / 时期</th><th>起止</th><th>都城</th><th>收录城池</th><th>编年大事</th></tr></thead>
    <tbody>
${rows}
    </tbody>
  </table>

  <h2>二、按王朝进入地图</h2>
  <div class="grid">
${cards}
  </div>

  <h2>三、十八个王朝的疆域脉络</h2>
  <p>以下每一段都取自本站的王朝史料摘要，可作为对照王朝地图时的速览：</p>
${essays}

  <h2>四、历代王朝与地图上常见的几个问题</h2>

  <h3>1. 「王朝地图」和「朝代地图」是同一回事吗？</h3>
  <p>
    是。中文里「王朝」与「朝代」在讲中国历史地图时基本通用：王朝指由某一姓家族建立的统治政权
    （如刘氏汉朝、李氏唐朝），朝代是史学分期习惯的叫法。本站的王朝地图按
    战国 → 秦 → 西汉 → 东汉 → 三国 → 西晋 → 东晋十六国 → 南北朝 → 隋 → 唐 → 五代十国 →
    北宋 → 南宋 → 元 → 明 → 清 → 民国 → 中华人民共和国 共 18 段排列。
  </p>

  <h3>2. 为什么有的王朝地图分很多阶段？</h3>
  <p>
    一个大王朝的版图并非一成不变。以唐为例，初唐、盛唐、安史之乱后、晚唐的疆域差别极大：
    安西与北庭都护府在盛唐时远及中亚，而 755 年之后河西、陇右与西域先后陷于吐蕃。
    因此本站为同一王朝保存了多个版图快照（例如唐收录 29 幅），拖动时间轴时会按年份自动切换，
    比只看一张「最大疆域图」更接近史实。
  </p>

  <h3>3. 王朝地图上的边界是精确国界吗？</h3>
  <p>
    不是。古代疆域多为羁縻、藩属与军事控制线，缺乏现代意义的精确国界。本站的疆域与政区为
    <strong>示意性近似</strong>，用于呈现大势与沿革关系，不作为边界依据。
  </p>

  <h3>4. 古今地名怎么对照？</h3>
  <p>
    每个王朝页都附有城池的古今地名对照表（如唐代「江州」对应今江西九江）。也可以直接进入
    <a href="../">交互式地图</a>，点击任意古城查看其「点地溯源」面板——同一地点在历代所属的
    政权、政区与名称变迁会按时间列出来。
  </p>

  <h2>五、相关专题</h2>
  <div class="grid">
    <a class="card" href="person-footprints.html"><b>历史人物足迹地图</b><span>张骞、诸葛亮、玄奘、李白、苏轼、王阳明的行迹路线</span></a>
    <a class="card" href="index.html"><b>专题图志总目录</b><span>34 篇静态历史地理专题</span></a>
    <a class="card" href="../"><b>交互式历史地图</b><span>拖动时间轴，点地溯源，古今地名对照</span></a>
  </div>

  ${FOOTER}
</div>
</body>
</html>
`;

  return { file: 'dynasty-maps.html', html, title, desc, url: `${BASE}/topics/dynasty-maps.html` };
}

// ---------- 页 2：历史人物足迹 ----------
function buildPersonFootprints() {
  // 只收录「有真实行迹/描述数据」的人物，其余人物在正文里以列表形式指向地图检索
  const journeyRows = JOURNEYS.map((j) => {
    const stops = (j.stops || []).length;
    return `<tr>
      <td><a href="journey-${j.key}.html">${esc(j.titleZh || j.title || j.key)}</a></td>
      <td>${stops} 站</td>
      <td>${esc((j.spanZh || '').trim() || '—')}</td>
    </tr>`;
  }).join('\n');

  const journeyCards = JOURNEYS.map(
    (j) => `<a class="card" href="journey-${j.key}.html">
      <b>${esc(j.titleZh || j.title || j.key)}</b>
      <span>${(j.stops || []).length} 站 · ${esc((j.spanZh || '').trim() || '')}</span>
    </a>`
  ).join('\n');

  // 按朝代分组列出 128 位人物（只给姓名 + 所属朝代，链到地图检索）
  const byDynasty = new Map();
  for (const p of PROFILES) {
    if (!byDynasty.has(p.dynastyKey)) byDynasty.set(p.dynastyKey, []);
    byDynasty.get(p.dynastyKey).push(p);
  }
  const dynOrder = DYNASTIES.map((d) => d.key);
  const personGroups = dynOrder
    .filter((k) => byDynasty.has(k))
    .map((k) => {
      const d = DYNASTIES.find((x) => x.key === k);
      const list = byDynasty
        .get(k)
        .map((p) => `<a href="../?person=${encodeURIComponent(p.key)}" title="在地图中查看${esc(p.zh)}">${esc(p.zh)}</a>`)
        .join('、');
      return `<p><strong>${esc(d.title)}（${spanZh(d)}）</strong>：${list}</p>`;
    })
    .join('\n');

  // 名关（20 座）也属于「足迹」类内容
  const passKeys = Object.keys(PASSES);
  const passList = PASS_LIST.map((p) => {
    const det = PASSES[p.key] || {};
    return `<li><strong>${esc(p.zh || p.key)}</strong>${
      det.chokepointZh ? '：' + esc(det.chokepointZh) : ''
    }</li>`;
  }).join('\n');

  const richCount = PROFILES.length;

  const title = '历史人物足迹地图 · 张骞/诸葛亮/玄奘/李白/苏轼/王阳明行迹路线（古今地名对照）';
  const desc =
    '中国历史人物足迹地图：张骞凿空西域、诸葛亮出山北伐、玄奘西行求法、李白仗剑壮游、苏轼宦海贬谪、王阳明知行悟道六条完整行迹路线，逐站标注古今地名、帝王年号与史料纪事；另收录 128 位历史人物可供在地图上按人检索时空轨迹，以及函谷关、潼关、剑门关等 20 座天下名关的雄隘考据。';
  const keywords = [
    '历史人物足迹', '历史人物足迹地图', '历史人物地图', '古代人物行迹地图',
    '历史人物活动地图', '中国历史人物分布地图', '人物行迹路线图', '生平行迹地图',
    '张骞出使西域路线', '张骞凿空西域', '诸葛亮北伐路线', '诸葛亮出山',
    '玄奘西行路线', '玄奘取经路线图', '李白壮游路线', '李白行迹',
    '苏轼贬谪路线', '苏轼生平地图', '王阳明行迹', '古诗词路线地图',
    '历史人物时空轨迹', '古今地名对照', '点人溯事', '江山时序',
  ].join(', ');

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}" />
<meta name="keywords" content="${esc(keywords)}" />
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
<meta name="author" content="Jiangshan Atlas Contributors" />
<link rel="canonical" href="${BASE}/topics/person-footprints.html" />
<link rel="alternate" hreflang="zh-CN" href="${BASE}/topics/person-footprints.html" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="江山时序 · 中国历史地图时间轴" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(desc)}" />
<meta property="og:url" content="${BASE}/topics/person-footprints.html" />
<meta property="og:image" content="${BASE}/assets/terrain_relief.webp" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(desc)}" />
<meta name="theme-color" content="#f3eee4" />
${HEAD_CSS}
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "CollectionPage",
      "@id": "${BASE}/topics/person-footprints.html#page",
      "url": "${BASE}/topics/person-footprints.html",
      "name": "${esc(title)}",
      "description": "${esc(desc)}",
      "inLanguage": "zh-CN",
      "isPartOf": { "@id": "${BASE}/#website" },
      "about": { "@type": "Thing", "name": "中国历史人物生平行迹与活动地图" },
      "hasPart": [
${JOURNEYS.map(
  (j) => `        { "@type": "Article", "name": "${esc(j.titleZh || j.title || j.key)}", "url": "${BASE}/topics/journey-${j.key}.html" }`
).join(',\n')}
      ]
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "江山时序", "item": "${BASE}/" },
        { "@type": "ListItem", "position": 2, "name": "专题图志总览", "item": "${BASE}/topics/index.html" },
        { "@type": "ListItem", "position": 3, "name": "历史人物足迹", "item": "${BASE}/topics/person-footprints.html" }
      ]
    }
  ]
}
</script>
</head>
<body>
${HEADER()}
<div class="wrap">
  <span class="kicker">点人溯事 · 生平行迹</span>
  <h1>历史人物足迹地图 · 六条完整行迹与 ${richCount} 位人物的时空轨迹</h1>
  <p class="en-sub">Footprints of Historical Figures — Biographical Route Maps Across Tang, Song and Ming China</p>

  <div class="lede">
    读一个人的年谱，往往记不住地名；摊开在地图上，行迹就清楚了。
    本页汇总「江山时序」的人物足迹内容：<strong>6 条逐站考据的完整行迹路线</strong>
    （张骞、诸葛亮、玄奘、李白、苏轼、王阳明），逐站给出当时的政区归属、今地对照与史料纪事；
    另有 <strong>${richCount} 位历史人物</strong>可按姓名直接在地图上检索其时空坐标，
    以及 20 座改变过战局的天下名关。
  </div>

  <h2>一、六条完整行迹路线</h2>
  <table>
    <thead><tr><th>行迹路线</th><th>站点数</th><th>年代</th></tr></thead>
    <tbody>
${journeyRows}
    </tbody>
  </table>

  <div class="grid">
${journeyCards}
  </div>

  <h2>二、怎么在地图上看一个人的足迹</h2>
  <ol>
    <li>打开 <a href="../">交互式历史地图</a>；</li>
    <li>在左上角搜索框输入人物姓名（如「苏轼」「玄奘」），或直接访问
        <code>../?person=</code> + 人物标识（如 <a href="../?person=sushi">?person=sushi</a>）；</li>
    <li>地图会按该人物的活动年份逐点连线，右侧面板同步显示每一站的年号、政区与出处；</li>
    <li>点击任一站点的地名，可查看该地的「点地溯源」——它在历代属于哪个政权、哪个政区、叫什么名字。</li>
  </ol>

  <h2>三、按朝代浏览历史人物</h2>
  <p>下列人物均可在地图中按姓名检索。按所属时期分组，便于对照王朝地图：</p>
${personGroups}

  <h2>四、行迹路线上绕不开的天下名关</h2>
  <p>
    古人行旅与水陆通道受地形制约，名关雄隘往往就是行迹的转折点。本站收录 20 座名关，
    每一座都附有地形形势与历史地位考据：
  </p>
  <ul>
${passList}
  </ul>

  <h2>五、常见问题</h2>

  <h3>1. 「历史人物足迹地图」能看到什么？</h3>
  <p>
    能看到某位人物一生中到过哪些地方、按什么顺序移动、每一站在当时叫什么名字、归属于哪个政权。
    以苏轼为例，从汴京出仕到黄州、惠州、儋州一路贬谪，路线本身就是一部北宋党争史。
  </p>

  <h3>2. 为什么只给了六条逐站路线，其他人只有姓名？</h3>
  <p>
    逐站考据需要把每一站的古今地名、当时的政区归属与史料出处都对上，工作量远大于百度百科式的生平介绍。
    我们不希望用空洞的模板文字凑页面数量，因此只对史料充足、路线明确的六人做了逐站展开；
    其余 ${richCount} 位人物仍可在地图上按姓名检索其时空坐标，随着考据推进会陆续补充。
  </p>

  <h3>3. 古诗词里的路线也能看吗？</h3>
  <p>
    可以。杜甫《闻官军收河南河北》的归乡路线、苏轼《自题金山画像》的贬谪路线、
    文天祥《过零丁洋》的抗元路线、韩愈《左迁至蓝关示侄孙湘》、辛弃疾《永遇乐·京口北固亭怀古》等，
    都已做成图文专题，见 <a href="index.html">专题图志总目录</a>。
  </p>

  <h2>六、相关专题</h2>
  <div class="grid">
    <a class="card" href="dynasty-maps.html"><b>王朝地图总览</b><span>18 个朝代的疆域与政区地图</span></a>
    <a class="card" href="index.html"><b>专题图志总目录</b><span>34 篇静态历史地理专题</span></a>
    <a class="card" href="../"><b>交互式历史地图</b><span>拖时间轴、点地溯源、古今地名对照</span></a>
  </div>

  ${FOOTER}
</div>
</body>
</html>
`;

  return { file: 'person-footprints.html', html, title, desc, url: `${BASE}/topics/person-footprints.html` };
}

// ---------- 写出 ----------
const pages = [buildDynastyMaps(), buildPersonFootprints()];
for (const p of pages) {
  fs.writeFileSync(path.join(ROOT, 'topics', p.file), p.html);
  console.log(`写入 topics/${p.file}  ${p.html.length.toLocaleString()} 字节`);
}

// ---------- 更新 sitemap ----------
const smPath = path.join(ROOT, 'sitemap.xml');
let sm = fs.readFileSync(smPath, 'utf8');
sm = sm.replace(/<lastmod>[\d-]+<\/lastmod>/g, `<lastmod>${TODAY}</lastmod>`);

for (const p of pages) {
  if (sm.includes(`<loc>${p.url}</loc>`)) continue;
  const block = `  <url>
    <loc>${p.url}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
`;
  // 插到 topics/index.html 条目之前，保持主题页聚在一起
  const marker = '  <url>\n    <loc>https://map.xhja.cn/topics/index.html</loc>';
  if (sm.includes(marker)) sm = sm.replace(marker, block + marker);
  else sm = sm.replace('</urlset>', block + '</urlset>');
  console.log('sitemap 新增:', p.url);
}

fs.writeFileSync(smPath, sm, 'utf8');
const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].length;
console.log(`sitemap 现有 ${locs} 条，lastmod 统一为 ${TODAY}`);
