# Markdown Editor XLX

给 Markdown 文本编辑区做「按标题章节折叠」的增强扩展：标题行左侧出现折叠箭头，
支持一键折叠到第 N 层、按文件记住折叠状态。

解决 **CodeBuddy 编辑器没有章节级折叠**的问题。

## 安装

| 渠道 | 方式 |
| --- | --- |
| VS Code 官方市场 | 扩展面板搜 `xiaolinxin.markdown-editor-xlx` · <https://marketplace.visualstudio.com/items?itemName=xiaolinxin.markdown-editor-xlx> |
| Open VSX（CodeBuddy / VSCodium 等） | 扩展面板搜 `markdown-editor-xlx` · <https://open-vsx.org/extension/xiaolinxin/markdown-editor-xlx> |

## 功能

- **按标题折叠**：h1~h6 标题行左侧出现折叠箭头，折叠后收起该标题下的正文与子标题
  - 正确跳过 fenced 代码块、YAML/TOML front matter、HTML 注释、缩进代码块里的 `#`
  - 支持 `===` / `---` 下划线式（Setext）标题
  - **保留章节末尾空行**：折叠范围到正文最后一行为止，章节结尾的空行仍显示（相邻章节之间留出间隔）
- **手动折叠标记**：`<!-- #region -->` … `<!-- #endregion -->`
- **折叠到第 N 层**：一键只展开到 h1 / h1~h2 / h1~h3（走命令面板 / 右键菜单，**默认不绑快捷键**）
- **折叠 / 展开当前章节**：折叠或展开光标所在章节（同上，**默认不绑快捷键**）
- **复制 AI 引用**：选中若干行按 `Ctrl+Shift+C`（Mac `Cmd+Shift+C`），把引用复制到剪贴板，粘进 AI 对话即可定位到具体行
  - 多行：`@相对路径:起始-结束`，例如 `@src/headings.ts:19-22`
  - 单行 / 未选中：`@相对路径:行号`，例如 `@src/headings.ts:19`
  - **只写剪贴板，不会自动聚焦或粘贴到任何面板**；对所有文件类型生效，不限于 Markdown
  - 前缀与分隔符可配置（见下方配置表）
- **折叠状态持久化**（可选，默认关闭）：按文件记住折叠层级、按标题文本匹配恢复。
  注：VS Code 原生已会恢复编辑器视图状态（含折叠），所以本功能默认关闭；
  确实需要时再打开 `markdownEditorXlx.persistFolding` + `markdownEditorXlx.autoRevealOnOpen`
- **语言兼容**：`markdown` / `mdx` / `mdc` 三种语言 id 都生效 —— 装了 `Nuxt.mdc` 这类扩展后
  `.md` 会被注册成 `mdc` 语言，本扩展照常工作
- 编辑器右键菜单包含全部命令

## 命令

| 命令 | 快捷键 |
| --- | --- |
| `Markdown XLX: 复制引用（@路径:行号）` | `Ctrl+Shift+C`（Mac: `Cmd+Shift+C`） |
| `Markdown XLX: 折叠到第 N 层…` | - |
| `Markdown XLX: 折叠到第 1/2/3 层` | - |
| `Markdown XLX: 折叠当前章节` | - |
| `Markdown XLX: 展开当前章节` | - |
| `Markdown XLX: 折叠全部标题` | - |
| `Markdown XLX: 展开全部` | - |
| `Markdown XLX: 恢复上次折叠状态` | - |
| `Markdown XLX: 清除本文件的折叠记忆` | - |
| `Markdown XLX: 诊断折叠（输出日志）` | - |

> 快捷键可在「键盘快捷方式」中搜索 `Markdown XLX` 自行修改。

## 配置

| 配置项 | 默认 | 说明 |
| --- | --- | --- |
| `markdownEditorXlx.enabled` | `true` | 总开关，关闭后回退到内置折叠行为 |
| `markdownEditorXlx.maxHeadingLevel` | `6` | 生成折叠箭头的最大标题层级，设为 3 则 h4~h6 无箭头 |
| `markdownEditorXlx.foldRegionMarkers` | `true` | 识别 `<!-- #region -->` / `<!-- #endregion -->` |
| `markdownEditorXlx.trimTrailingBlankLines` | `true` | 折叠范围不含章节末尾空行，空行折叠后仍可见；关闭后末行空行一并收起 |
| `markdownEditorXlx.persistFolding` | `false` | 按文件记住折叠状态（VS Code 原生已有视图状态恢复，一般**无需开启**） |
| `markdownEditorXlx.autoRevealOnOpen` | `false` | 打开文件时自动恢复本扩展记录的折叠状态（默认关闭，避免与原生的视图状态恢复互相干扰） |
| `markdownEditorXlx.dimHeadingHashes` | `false` | 把标题行开头的 `#` 淡化显示 |
| `markdownEditorXlx.copyReferencePrefix` | `@` | 复制引用的路径前缀字符，如 `@` 或 `#` |
| `markdownEditorXlx.copyReferencePathSeparator` | `:` | 复制引用中路径与行号的分隔符 |
| `markdownEditorXlx.copyReferenceLineSeparator` | `-` | 复制引用中行号范围的连接符，如 `12-18` 里的 `-` |
| `markdownEditorXlx.trace` | `false` | 输出详细日志到「Markdown XLX」输出通道 |

## 相关链接

- 源码仓库：<https://github.com/xiao-linxin/vscode-markdown-editor-xlx>
- 问题反馈：<https://github.com/xiao-linxin/vscode-markdown-editor-xlx/issues>

## License

MIT
