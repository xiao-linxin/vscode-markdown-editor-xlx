# Change Log

## 1.0.7

- **折叠范围保留章节末尾空行**：章节折叠范围只到正文最后一行，末尾的空行不再被一起收起，于是折叠后仍能看到这些空行，相邻章节之间留出视觉间隔。
  - 只剔除空行，`---` 分隔线与正文照常收起（例：章节范围 `344-363` 折叠后可见 `344`（标题）与 `363`（空行）两行）。
  - 新增配置 `markdownEditorXlx.trimTrailingBlankLines`（默认 `true`），设为 `false` 可恢复旧行为。
- README 补充说明：本扩展用于解决 **CodeBuddy 编辑器没有章节级折叠**的问题。

## 1.0.6

- README 精简：移除「开发与打包」「实现说明」「折叠时能隐藏 `#` 号吗？」三节，以及离线 VSIX 安装指引与发版命令；「安装」节只保留 VS Code 官方市场与 Open VSX 两个渠道。
- 功能无变更（纯文档调整）。

## 1.0.5

- **修复致命 bug：标题扫描缓存跨文档串用**。原缓存只比对 `document.version`，而新打开的文档 version 也从 1 开始，于是打开 B 文件时会命中 A 文件的缓存，把 A 的折叠范围套到 B 上（表现为箭头出现在莫名行、该折叠的行没有）。缓存键改为 `文档 URI + version`。
- 诊断命令输出保持「本扩展范围 / 编辑器实际采用 / visibleRanges / 扫描到的标题」四段，便于继续定位。

## 1.0.4

- 显式声明 `extensionKind: ["workspace", "ui"]`，确保 Remote 场景下客户端与服务端都能正确识别本扩展
- 递增版本号，便于 IDE 重新扫描扩展

## 1.0.3

- 诊断命令增强：把诊断详情同时落盘到 `<tmp>/xlx-diag.log`，并输出 `visibleRanges`、扫描到的标题行、编辑器实际采用的折叠范围，便于排查"某个标题没有折叠箭头"这类问题

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
