import * as vscode from 'vscode';

/**
 * 「复制 AI 引用」功能。
 *
 * 把当前选区（无选区时取光标所在行）转成 AI 对话能直接识别的引用文本写入剪贴板，
 * 形如 `@相对路径:行号` 或 `@相对路径:起始-结束`。
 *
 * 刻意**不做**「自动聚焦 / 自动粘贴到对话面板」：那要依赖各 AI 扩展私有的命令 id，
 * 目标扩展一改版就失效，而且会抢走编辑器焦点 —— 还是让用户自己粘贴更稳。
 */
export interface CopyReferenceConfig {
	/** 路径前缀，默认 `@` */
	prefix: string;
	/** 路径与行号之间的分隔符，默认 `:` */
	pathSeparator: string;
	/** 行号范围的连接符，默认 `-` */
	lineSeparator: string;
}

export function readCopyReferenceConfig(): CopyReferenceConfig {
	const config = vscode.workspace.getConfiguration('markdownEditorXlx');
	return {
		prefix: config.get<string>('copyReferencePrefix', '@'),
		pathSeparator: config.get<string>('copyReferencePathSeparator', ':'),
		lineSeparator: config.get<string>('copyReferenceLineSeparator', '-'),
	};
}

/** 按配置拼出引用文本（行号均为 1 起始） */
export function buildReference(
	relativePath: string,
	startLine: number,
	endLine: number,
	config: CopyReferenceConfig
): string {
	const range =
		startLine === endLine ? `${startLine}` : `${startLine}${config.lineSeparator}${endLine}`;
	return `${config.prefix}${relativePath}${config.pathSeparator}${range}`;
}

/**
 * 复制引用到剪贴板。
 *
 * 无选区 → `@路径:当前行`；有选区 → `@路径:起始行-结束行`。
 * 路径取工作区相对路径（文件在工作区外时 `asRelativePath` 会给出绝对路径）。
 */
export async function copyAiReference(
	config: CopyReferenceConfig,
	log?: (message: string) => void
): Promise<void> {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		void vscode.window.showInformationMessage('Markdown XLX：请先打开一个文件再复制引用。');
		return;
	}

	const selection = editor.selection;
	const empty = selection.isEmpty || selection.start.isEqual(selection.end);
	// VS Code 行号从 0 起，引用里用 1 起；无选区时取光标所在行
	const startLine = (empty ? selection.active.line : selection.start.line) + 1;
	const endLine = (empty ? selection.active.line : selection.end.line) + 1;

	const relativePath = vscode.workspace.asRelativePath(editor.document.uri, false);
	const reference = buildReference(relativePath, startLine, endLine, config);

	await vscode.env.clipboard.writeText(reference);
	log?.(`复制引用：${reference}`);
	void vscode.window.setStatusBarMessage(`$(copy) 已复制引用 ${reference}`, 3000);
}
