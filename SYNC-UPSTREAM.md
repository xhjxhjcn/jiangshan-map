# 跟随上游更新的操作手册（map.xhja.cn）

> 上游：<https://github.com/DeanChensj/jiangshan-map>（作者 DeanChensj，GPL-3.0）
> 本站：<https://map.xhja.cn/>，仓库 <https://github.com/xhjxhjcn/jiangshan-map>

## 一、结论先说

**能同步，而且冲突很少。** 原因是我们的改动和上游的改动天然错开：

| 谁 | 主要动哪些文件 |
| --- | --- |
| 上游 | `data/atlas/**`（疆域几何）、`data/sources/**`、`js/*.js`（数据与渲染）、`scripts/tests/**` |
| 我们 | `index.html`（域名/字体/统计）、`topics/*.html` + `sitemap.xml`（域名替换）、`esa.jsonc`、新增落地页、新增脚本 |

唯一真正重叠的是 `index.html` 和 `js/app.js`。实测（2026-11-15，上游 3 个提交、18 个文件）
`git merge` **零冲突**自动完成——因为上游改的是标签里的数据与版本串，我们改的是另几行。

## 二、标准流程

> 2026-11-18 同步（18 提交 / 91 文件）后的**修正版流程**。
> 大更新时上游会重生成 `topics/*.html`，直接 `git merge` 会产生几十个冲突，
> 且上游没有我们的文件、合并后定制会被判定为「删除」。正确做法是下面这套。

```bash
cd D:\DSH\xhja\map.xhja.cn

# 0. 先备份（大更新必做）
git tag "backup-before-sync-$(date +%Y%m%d-%H%M%S)"

# 1. 拉取上游，先看清楚
git fetch upstream main
git log --oneline HEAD..upstream/main
git diff --stat HEAD..upstream/main

# 2. 合并（有冲突是正常的）
git merge upstream/main
```

**冲突处理原则：一律取上游版，再用脚本重打定制补丁。**

```bash
# topics/*.html 冲突：上游整体重生成，逐块手工解不现实
for f in $(git diff --name-only --diff-filter=U | grep '^topics/'); do
  git checkout --theirs -- "$f" && git add "$f"
done

# index.html / js/app.js / llms.txt 冲突：同样取上游
for f in index.html js/app.js llms.txt; do
  git checkout --theirs -- "$f" 2>/dev/null && git add "$f"
done
```

然后**按顺序**重跑定制脚本（都是幂等的）：

```bash
node scripts/customize.js         # 域名替换、字体自托管、去上游统计
node scripts/attribution.js       # 署名与星标文案
node scripts/inject-stats.js      # 注入 xhja.cn 访客统计（site=map）
node scripts/seo-patch.js         # 首页 title/keywords + 隐藏目录总览区块
node scripts/build-landing-pages.js  # 重建两个 SEO 落地页
node scripts/sync_version.js      # 重算缓存串（不能省，见第三节）
```

验证（两个都必须过）：

```bash
node scripts/verify-localization.js          # 25 项定制检查，必须 25/25
node scripts/validate_atlas.js --suite=core,trace,cartography,ui
```

通过后提交推送：

```bash
git add -A
git commit -m "merge: 同步上游 <描述>"
git push origin main
```

ESA 会自动构建（约 50 秒）。**偶尔 webhook 会丢**，若 2 分钟没动静就手动触发：

```bash
python -c "exec(open(r'D:\DSH\xhja\_esa\aliyun.py').read().split('if __name__')[0]); print(call('CreateRoutineBuild', endpoint='esa.cn-hangzhou.aliyuncs.com', method='POST', RoutineName='map-xhja-cn', Branch='main'))"
```

## 二·五、这套脚本是怎么来的（别删）

| 脚本 | 为什么必须有 |
| --- | --- |
| `customize.js` | 域名替换 8600+ 处、字体自托管、去 Google Fonts/vercount/beacon/atlas_track |
| `attribution.js` | 星标按钮指向本仓库、「更多」菜单标注原作者 |
| `inject-stats.js` | 访客统计是上游没有的，取上游版 index.html 后必丢 |
| `seo-patch.js` | 首页 title/keywords 与隐藏目录总览区块，同上 |
| `build-landing-pages.js` | 王朝地图 / 历史人物足迹两个落地页，上游没有 |

⚠ **新增任何「上游没有的改动」时，必须同时写成幂等脚本放进这个清单**，
否则下次同步一定丢。2026-11-18 就因为 SEO 改动是手工做的，同步后丢了 6 项。

## 三、最容易踩的坑：缓存串不会自动更新

`index.html` 里的 `js/app.js?v=xxxx` 和 `data-v-snapshots="xxxx"` 是**内容哈希**，
用于让浏览器在文件更新后重新下载。上游每次改 `js/*.js` 都会同步更新自己的这些串。

**但合并时如果这些行没有冲突，git 会保留我们这边的旧值**，于是：

- 上游改了 `js/app.js`，但 `?v=` 还是旧的
- 老访客浏览器命中缓存，**上游的修复永远看不到**

本次实测就是这样：合并后 `js/app.js` 仍是 `2f6ab144`，而上游是 `6d92f67a`。
跑 `node scripts/sync_version.js` 后按实际内容重算为 `53711c9e`
（我们的 `app.js` 含本地化改动，所以与上游哈希不同，这是正常的）。

> 判断依据：`verify-localization.js` 不检查版本串新旧，所以**它全绿也不代表缓存串是对的**。
> 记住合并后无条件跑一次 `sync_version.js`。

## 四、上游重新生成 topics / sitemap 时

上游的 `scripts/build_seo_topics.js` 会整体重写 `topics/*.html` 和 `sitemap.xml`，
**用的是它自己的域名**。如果上游改了这些文件，合并后会把我们的域名替换掉。

判断方法：

```bash
node scripts/verify-localization.js     # 若 "sitemap.xml 全部指向本站" 变 LOST
```

修复：重跑我们自己的定制脚本（幂等，可重复执行）：

```bash
node scripts/customize.js        # 域名替换 + 字体 + 去统计
node scripts/attribution.js      # 署名与星标文案
node scripts/build-landing-pages.js   # 重建两个落地页（王朝地图 / 历史人物足迹）
```

⚠ 注意 `build_seo_topics.js` 是上游的生成器，直接跑它会把域名写回 `deanchen.me`。
**不要单独运行它**，除非改完域名后再跑一遍 `customize.js`。

> 2026-11-15 这次同步中，上游没有动 `topics/` 与 `sitemap.xml`，所以未受影响。

## 五、出现冲突怎么办

### index.html 冲突
大概率是「我们删了 Google Fonts / 统计脚本，上游改了附近的行」。

原则：**保留我们的删除**，只吸收上游对其它部分的改动。判断方法：

```bash
git diff --diff-filter=U index.html    # 看冲突块
```

处理完后跑 `node scripts/verify-localization.js`，它会精确告诉你哪一项丢了。

### js/app.js 冲突
我们只改了 3 处（星标文案、`baseSiteUrl`、署名副标题），上游改的是数据逻辑。
按行取舍即可，处理完同样跑验证脚本。

### 数据文件冲突（data/atlas/**）
**一律取上游**。这些是古地图几何数据，我们没有也不该有自己的修改：

```bash
git checkout --theirs data/atlas/
git add data/atlas/
```

## 六、这次同步的实证（2026-11-15）

- 上游 3 个提交：`#402` 三国地名史料、`#406` 中文标签分隔点、`#407` 唐代西突厥
- 改动 18 个文件，其中 16 个是我们没碰过的
- `git merge` **零冲突**
- 合并后 `verify-localization.js` **25/25 通过**
- 发现并修复了缓存串未更新的问题（`sync_version.js`）
- `validate_atlas.js` 四个套件全部通过（21.3 秒）

## 七、能不能全自动

可以做一个 GitHub Actions 定时任务：每天 `fetch upstream` → 尝试 merge → 跑验证
→ 全绿就推送、有冲突就开 issue 提醒。**但我不建议现在就上**，理由：

1. 合并是**语义判断**，不是机械操作。比如上游重生成 `topics/` 会把域名写回，
   自动合并会静默把站点改坏（页面还能开，只是 canonical 全指错了）。
2. 站点是你的门面，宁可不更新，也不要自动推一版坏的上去。

如果你想省事，更稳妥的半自动方案是：定时任务**只做检测**——发现上游有新提交就在
dash 看板或 Bark 上提醒你，合并仍由我们手动执行。需要的话我可以加上。
