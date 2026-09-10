# Change Log

## 1.0.2

- **默认不再绑定快捷键**：移除 `Ctrl+Alt+1/2/3`、`Ctrl+Alt+[`、`Ctrl+Alt+]`，避免与系统/输入法/其他扩展冲突；需要时在「键盘快捷方式」里搜索 `Markdown XLX` 自行绑定
- **折叠状态持久化改为默认关闭**（`persistFolding` / `autoRevealOnOpen` 默认 `false`）：VS Code 原生已会恢复编辑器视图状态（含折叠），本功能属重复实现且易与原生互相干扰
- 修复：可见范围反推不出折叠状态时**不再覆盖**已有记忆（此前会把命令路径写入的折叠记录误清空）

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
