# 站点分支说明（map.xhja.cn）

本仓库是 [DeanChensj/jiangshan-map](https://github.com/DeanChensj/jiangshan-map)（江山时序 · 中国历史交互地图时间轴）的**部署分支**，
由 [xhjxhjcn](https://github.com/xhjxhjcn) 维护，线上地址：**https://map.xhja.cn/**

- 原项目：<https://github.com/DeanChensj/jiangshan-map>
- 原项目在线演示：<https://deanchen.me/jiangshan-map/>
- 许可证：**GPL-3.0**（与原项目一致，见 [LICENSE](LICENSE)），版权归原作者 Dean Chen 及贡献者所有

## 相对上游做的改动

只改「部署到本站需要改的部分」，地图数据、史料考据、界面与交互一律未动：

| 类别 | 改动 |
| --- | --- |
| 站点地址 | `canonical` / `hreflang` / `og:url` / `twitter:image` / `sitemap.xml` / 站内绝对链接 → `https://map.xhja.cn/`（约 9100 处，47 个文件） |
| 作者外链 | **保留**作者博客 <https://deanchen.me/about/> 与创作手记 <https://deanchen.me/history/atlas/2026/10/25/jiangshan-map-story.html>，不改为站内链接 |
| 字体 | 移除 Google Fonts（境内加载慢且会阻塞首屏）。`Ma Shan Zheng` 的字符子集（17.6 KB）已下载到 `assets/fonts/` 自托管；`Noto Serif SC`/`Noto Sans SC` 全量中文分片有几百个文件，会顶爆静态站 2000 文件上限，故不下载，回落到 `css/style.css` 原有的系统字体栈（宋体 / 雅黑 / PingFang） |
| 统计 | 移除上游的 Vercount、Cloudflare Web Analytics 与 `js/atlas_track.js`（这些脚本与上游统计端点 `stats.deanchen.me` 在本站无意义且境内不可达） |
| 署名 | 顶部 Star 按钮指向本仓库；「更多」菜单标注「原作者 DeanChensj · GPL-3.0」 |

改造由 `scripts/customize.js` + `scripts/attribution.js` 完成，可重复执行（幂等）。

## 部署

阿里云 ESA「函数和 Pages」项目 + GitHub 自动构建，纯静态、**无构建步骤**：

- `esa.jsonc`：`installCommand` / `buildCommand` 留空，`assets.directory` 为 `./`
- 推送到本仓库 `main` 分支即触发构建，产物就是仓库根目录
- 单项目**文件数上限 2000**（当前 501 个），文件体积总计约 78 MB

## 本地预览

```bash
node scripts/serve.js 8099   # http://127.0.0.1:8099/
```
