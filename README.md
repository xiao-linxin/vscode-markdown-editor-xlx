# Markdown Editor XLX

给 Markdown 文本编辑区做「按标题章节折叠」的增强扩展：标题行左侧出现折叠箭头，
支持一键折叠到第 N 层、按文件记住折叠状态。

## 安装

| 渠道 | 方式 |
| --- | --- |
| VS Code 官方市场 | 扩展面板搜 `xiaolinxin.markdown-editor-xlx` · <https://marketplace.visualstudio.com/items?itemName=xiaolinxin.markdown-editor-xlx> |
| Open VSX（CodeBuddy / VSCodium 等） | 扩展面板搜 `markdown-editor-xlx` · <https://open-vsx.org/extension/xiaolinxin/markdown-editor-xlx> |
| 离线 VSIX | 下载 `.vsix` → 扩展面板 `...` → 「从 VSIX 安装」；Remote 场景需装到**服务端** |

## 功能

- **按标题折叠**：h1~h6 标题行左侧出现折叠箭头，折叠后收起该标题下的正文与子标题
  - 正确跳过 fenced 代码块、YAML/TOML front matter、HTML 注释、缩进代码块里的 `#`
  - 支持 `===` / `---` 下划线式（Setext）标题
- **手动折叠标记**：`<!-- #region -->` … `<!-- #endregion -->`
- **折叠到第 N 层**：`Ctrl+Alt+1/2/3` 一键只展开到 h1 / h1~h2 / h1~h3
- **折叠 / 展开当前章节**：`Ctrl+Alt+[` / `Ctrl+Alt+]`
- **折叠状态持久化**：关闭文件或重启 IDE 后自动恢复上次的折叠层级（按标题匹配，行号变了也能对上）
- **语言兼容**：`markdown` / `mdx` / `mdc` 三种语言 id 都生效 —— 装了 `Nuxt.mdc` 这类扩展后
  `.md` 会被注册成 `mdc` 语言，本扩展照常工作
- 编辑器右键菜单包含全部命令

## 命令

| 命令 | 快捷键 |
| --- | --- |
| `Markdown XLX: 折叠到第 N 层…` | - |
| `Markdown XLX: 折叠到第 1/2/3 层` | `Ctrl+Alt+1/2/3` |
| `Markdown XLX: 折叠当前章节` | `Ctrl+Alt+[` |
| `Markdown XLX: 展开当前章节` | `Ctrl+Alt+]` |
| `Markdown XLX: 折叠全部标题` | - |
| `Markdown XLX: 展开全部` | - |
| `Markdown XLX: 恢复上次折叠状态` | - |
| `Markdown XLX: 清除本文件的折叠记忆` | - |
| `Markdown XLX: 诊断折叠（输出日志）` | - |

## 配置

| 配置项 | 默认 | 说明 |
| --- | --- | --- |
| `markdownEditorXlx.enabled` | `true` | 总开关，关闭后回退到内置折叠行为 |
| `markdownEditorXlx.maxHeadingLevel` | `6` | 生成折叠箭头的最大标题层级，设为 3 则 h4~h6 无箭头 |
| `markdownEditorXlx.foldRegionMarkers` | `true` | 识别 `<!-- #region -->` / `<!-- #endregion -->` |
| `markdownEditorXlx.persistFolding` | `true` | 按文件记住折叠状态 |
| `markdownEditorXlx.autoRevealOnOpen` | `true` | 打开文件时自动恢复折叠状态 |
| `markdownEditorXlx.dimHeadingHashes` | `false` | 把标题行开头的 `#` 淡化显示 |
| `markdownEditorXlx.trace` | `false` | 输出详细日志到「Markdown XLX」输出通道 |

## 折叠时能隐藏 `#` 号吗？

不能。扩展 API 只提供 `FoldingRange(start, end, kind)`，折叠后行内显示的占位文本（如 `## 标题`）
由编辑器内部渲染，用于定制的 `collapseText` 并未公开。近似方案是把 `#` 淡化：
`markdownEditorXlx.dimHeadingHashes: true`（占位宽度不变，只是变灰）。

## 开发与打包

```bash
npm install
npm run compile        # 编译到 out/
npm run vsix           # 生成 markdown-editor-xlx-<version>.vsix
```

离线安装：把生成的 `.vsix` 拷到目标机器，扩展面板右上角 `...` → 「从 VSIX 安装」，
或 `code --install-extension markdown-editor-xlx-<version>.vsix`。

发版命令：

```bash
npx vsce publish -i markdown-editor-xlx-<version>.vsix -p <VS_CODE_MARKETPLACE_PAT>
npx ovsx  publish markdown-editor-xlx-<version>.vsix -p <OPEN_VSX_TOKEN>
```

## 实现说明

- 注册 `FoldingRangeProvider` 会**接管**该语言的折叠范围计算；本扩展按「语言 id
  （markdown / mdx / mdc）+ 文件名 glob」双条件注册，避免 languageId 被其他扩展改写后失效。
- 折叠状态无法通过 API 读取，扩展用 `editor.visibleRanges` 反推哪些章节被折叠，
  并按「标题层级:标题文本」而不是行号保存，从而在文件被编辑后仍能恢复。

## 相关链接

- 源码仓库：<https://github.com/xiao-linxin/vscode-markdown-editor-xlx>
- 问题反馈：<https://github.com/xiao-linxin/vscode-markdown-editor-xlx/issues>

## License

MIT
