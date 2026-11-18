# 江山时序 · map.xhja.cn 部署手册

> 站点：<https://map.xhja.cn/>
> 代码：<https://github.com/xhjxhjcn/jiangshan-map>
> 上游：<https://github.com/DeanChensj/jiangshan-map>（GPL-3.0）

## 一、这是个什么站

「江山时序」是一幅中国历史交互地图时间轴，覆盖公元前 403 年（战国三家分晋）到现代，
含 18 个历史时期、198 幅疆域与州郡政区快照、编年大事、城池地标、古今地名「点地溯源」、
天下名关，以及李白/苏轼/玄奘等历史人物的行迹路线。

技术上是**纯静态站点**：`index.html` + `js/` + `css/` + `assets/` + `data/`，
没有构建步骤、没有服务端、没有数据库。地图渲染全在浏览器里（SVG + 内联压缩几何数据）。

## 二、本部署的组成

| 环节 | 配置 |
| --- | --- |
| 宿主 | 阿里云 **ESA**（边缘安全加速）「函数和 Pages」→ 边缘函数 Routine |
| Routine 名 | `map-xhja-cn`（站点 `xhja.cn`，SiteId `177915694145776`） |
| 源码 | GitHub `xhjxhjcn/jiangshan-map`，`main` 分支 |
| 构建 | **无构建**：`esa.jsonc` 里 `installCommand` / `buildCommand` 留空，`assets.directory` = `./` |
| 发布 | 推送到 `main` 自动触发构建，约 50 秒完成 |
| 域名 | `map.xhja.cn` → CNAME `map.xhja.cn.a1.initjj.com`（DNSPod 记录 ID `2450915314`，TTL 600） |
| 证书 | ESA 自动签发，HTTPS/H3 已开 |

**上限提醒**：ESA 静态站单项目**文件数上限 2000**（当前 501 个），`box.xhja.cn` 曾因 4118 个贴纸 SVG 顶爆过。

## 三、相对上游改了什么

改造脚本：`scripts/customize.js`（地址替换 + 字体 + 统计）、`scripts/attribution.js`（署名），两者幂等，可重复跑。

### 1. 站点地址
`canonical` / `hreflang` / `og:url` / `twitter:*` / `sitemap.xml` / 站内绝对链接
共 **9105 处、47 个文件** 从 `https://map.xhja.cn/` 换成 `https://map.xhja.cn/`。

**刻意保留的原样外链**（改成本站会变 404，而且属于对原作者的署名）：
- 作者博客 `https://deanchen.me/about/`
- 创作手记 `https://deanchen.me/history/atlas/2026/10/25/jiangshan-map-story.html`
- 上游统计端点 `https://stats.deanchen.me/e`（脚本本身已移除，仅注释保留）

### 2. 字体
原来首页引了 3 条 Google Fonts。境内 fonts.googleapis.com 常年不可达，虽然用了
`media="print" onload` 不阻塞渲染，但**书法体标题会一直掉到系统楷体**。

处理：
- `Ma Shan Zheng` 原链接用 `&text=` 做了字符子集（只有 17.6 KB），下载到 `assets/fonts/ma-shan-zheng.woff2` 自托管，新增 `css/fonts.css`
- `Noto Serif SC` / `Noto Sans SC` **不下载**：全量中文分片是几百个 woff2 文件，直接顶爆 2000 文件上限。留着它们也没有意义（原本就加载不到），改由 `css/style.css` 里已有的系统字体栈兜底（宋体 / 雅黑 / PingFang SC）

### 3. 统计
移除 Vercount、Cloudflare Web Analytics beacon、`js/atlas_track.js`。
前两个脚本本身在境内加载失败；`atlas_track.js` 只对 `deanchen.me` 生效，本站加载等于空转。

### 4. 署名
- 顶部 Star 按钮指向本仓库
- 「更多」菜单的副标题从上游域名改为「原作者 DeanChensj · GPL-3.0」
- `LICENSE` 未改动，版权归原作者及贡献者

## 四、日常维护

### 改内容后重新发布
```bash
cd D:\DSH\xhja\map.xhja.cn
git add -A && git commit -m "update: ..." && git push
```
推送后 ESA 自动构建（约 50 秒），无需手工操作。

### 手动触发一次构建（比如改了 ESA 配置）
```bash
python D:\DSH\xhja\_esa\mkroutine.py status        # 查状态
python D:\DSH\xhja\_esa\watchbuild.py <BuildId>    # 跟构建进度
```
构建记录：`ListRoutineBuilds` → `RoutineName=map-xhja-cn`。

### 本地预览
```bash
node scripts/serve.js 8099      # http://127.0.0.1:8099/
```

### 跟随上游更新
```bash
git remote add upstream https://github.com/DeanChensj/jiangshan-map.git   # 只需一次
git fetch upstream main
git merge upstream/main        # 有冲突时注意 index.html 里的地址，重跑 customize.js 再提交
node scripts/customize.js
node scripts/attribution.js
```

## 五、那次踩到的坑（留给以后）

1. **本机 `core.autocrlf=true`**，直接 clone 会把 `index.html` 检出成 CRLF，
   按 `\n` 写的正则批量替换会静默失败。克隆时要 `git -c core.autocrlf=false clone`，
   并在仓库里 `git config core.autocrlf false`。
2. **浅克隆（`--depth 1`）推不进新仓库**：远端要父提交对象，会报
   `did not receive expected object ... index-pack failed`。要么先 `git fetch --unshallow`，要么重新完整克隆。
3. **上游 `deploy-pages.yml` 只用 GitHub Pages**，ESA 走的是自己的 `esa.jsonc`，
   两者互不影响；本仓库没有开 Pages，避免两边产物打架。

## 六、验证记录（2026-11-15）

- ESA 构建 `succeed`，耗时 54 秒，产物 commit `2f956e82`，Not found 策略 `404Page`
- `https://map.xhja.cn/` 200；首页 13 个关键资源全部 200（含字体、2.3 MB 快照包）
- 无头 Chrome 实测：409 个政权面、209 个地名标签、681 个时间轴刻度渲染完成，
  `canonical`/`og:url` 均为 `https://map.xhja.cn/`，Ma Shan Zheng 字体 `loaded`
- **控制台 0 报错、0 失败请求**
- 深链接 `?year=208&place=赤壁` 直接还原到赤壁之战并展开「点地溯源」面板
- 移动端 390×844：无横向溢出，与上游同尺寸截图一致
- 站内链接体检 36 个地址全 200；sitemap 90 条全部指向本站且抽查 12 条全 200
- `robots.txt` 的 Sitemap 指向 `https://map.xhja.cn/sitemap.xml`
