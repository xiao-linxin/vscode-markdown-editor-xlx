# Change Log

## 1.0.1

- 补充 `repository` / `bugs` 字段，指向 GitHub 源码仓库
- README 增加安装渠道（VS Code 市场 / Open VSX / 离线 VSIX）与语言兼容说明
- 移除写 `/tmp` 的临时排查日志，统一走「Markdown XLX」输出通道（`LogOutputChannel`）

## 1.0.0

- 首个公开发布版本（VS Code 官方市场 + Open VSX）
- 按 Markdown 标题章节折叠（h1~h6），折叠箭头显示在行号槽
- 正确跳过 fenced code block、front matter、HTML 注释、缩进代码块里的 `#`
- 支持 Setext（`===` / `---` 下划线）标题与 `<!-- #region -->` 手动折叠标记
- 折叠到第 1/2/3 层、折叠/展开当前章节、折叠全部标题、展开全部
- 折叠状态按文件持久化，打开文件自动恢复
- 适配 `mdc` 语言（`Nuxt.mdc` 扩展会把 `.md` 注册成 `mdc`）
- publisher 由 `xlx` 改为 `xiaolinxin`

## 0.0.1

- 首个版本：按 Markdown 标题章节折叠（h1~h6），折叠箭头显示在行号槽
- 正确跳过 fenced code block、front matter、HTML 注释、缩进代码块中的 `#`
- 支持 Setext（`===` / `---` 下划线）标题
- 支持 `<!-- #region -->` / `<!-- #endregion -->` 手动折叠标记
- 命令与快捷键：折叠到第 1/2/3 层、折叠/展开当前章节、折叠全部标题、展开全部
- 折叠状态按文件持久化，打开文件自动恢复
- 配置项：`enabled` / `maxHeadingLevel` / `foldRegionMarkers` / `persistFolding` / `autoRevealOnOpen` / `dimHeadingHashes`
