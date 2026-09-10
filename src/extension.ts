import * as fs from 'fs';
import * as vscode from 'vscode';
import { FoldingMemory } from './foldingMemory';
import {
	headingKey,
	isMarkdownDocument,
	MarkdownHeadingFoldingProvider,
	MD_SELECTOR,
	readConfig,
} from './foldingProvider';
import { computeSections, findSectionAtLine } from './headings';
import { HeadingHashDimming } from './hashDimming';

/**
 * 排查用的落盘日志。扩展宿主跑在远端，写文件是唯一不依赖 UI 就能确认
 * 「扩展有没有激活 / provider 有没有被调用」的手段。
 */
const FILE_LOG = '/tmp/xlx-md-fold.log';
const fileLogCounts = new Map<string, number>();

function fileLog(message: string, limit = 30): void {
	try {
		const key = message.slice(0, 32);
		const count = fileLogCounts.get(key) ?? 0;
		if (count >= limit) {
			return;
		}
		fileLogCounts.set(key, count + 1);
		fs.appendFileSync(FILE_LOG, `[${new Date().toISOString()}] ${message}\n`);
	} catch {
		// 写不进去就算了，不影响功能
	}
}

let memory: FoldingMemory | undefined;

export function activate(context: vscode.ExtensionContext): void {
	// log: true 让内容同时落盘到 <logs>/output_logging_*/N-Markdown XLX.log
	const channel = vscode.window.createOutputChannel('Markdown XLX', { log: true });
	let unconditionalLogs = 3;
	const log = (message: string): void => {
		fileLog(message, 20);
		if (readConfig().trace || unconditionalLogs > 0) {
			unconditionalLogs--;
			channel.appendLine(`[${new Date().toLocaleTimeString()}] ${message}`);
		}
	};

	const version = (context.extension.packageJSON?.version as string) ?? '0.0.0';
	fileLog(
		`activate v${version} | app=${vscode.env.appName} | remote=${vscode.env.remoteName ?? '-'}` +
			` | extPath=${context.extensionUri.path}`
	);
	channel.appendLine(
		`Markdown XLX v${version} 已激活（选择器：markdown/mdx）。` +
			`详细日志请设置 "markdownEditorXlx.trace": true`
	);
	void vscode.window.setStatusBarMessage(`$(check) Markdown XLX v${version} 已激活`, 8000);

	const provider = new MarkdownHeadingFoldingProvider(readConfig, log);
	const store = new FoldingMemory(context);
	const dimming = new HeadingHashDimming();
	memory = store;

	const refreshDimming = (editor: vscode.TextEditor | undefined): void => {
		if (!editor || !isMarkdownDocument(editor.document)) {
			return;
		}
		const config = readConfig();
		dimming.apply(editor, provider.scan(editor.document).headings, config.dimHeadingHashes);
	};

	const run = (name: string, fn: () => Promise<void>) => () => {
		log(`执行命令 ${name}`);
		void fn().catch((error) => {
			channel.appendLine(`[error] ${name}: ${String(error)}`);
			void vscode.window.showErrorMessage(`Markdown XLX：${String(error)}`);
		});
	};

	context.subscriptions.push(
		channel,
		// 注册后本 Provider 会接管 markdown 的折叠范围；
		// 若内置 Provider 也在注册列表里，需配合 editor.defaultFoldingRangeProvider 指定本扩展
		vscode.languages.registerFoldingRangeProvider(MD_SELECTOR, provider),

		vscode.commands.registerCommand(
			'markdownEditorXlx.foldToLevel',
			run('foldToLevel', () => pickAndFoldToLevel(provider))
		),
		vscode.commands.registerCommand(
			'markdownEditorXlx.foldToLevel1',
			run('foldToLevel1', () => foldToLevel(provider, 1))
		),
		vscode.commands.registerCommand(
			'markdownEditorXlx.foldToLevel2',
			run('foldToLevel2', () => foldToLevel(provider, 2))
		),
		vscode.commands.registerCommand(
			'markdownEditorXlx.foldToLevel3',
			run('foldToLevel3', () => foldToLevel(provider, 3))
		),
		vscode.commands.registerCommand(
			'markdownEditorXlx.foldCurrentSection',
			run('foldCurrentSection', () => foldCurrentSection(provider, true))
		),
		vscode.commands.registerCommand(
			'markdownEditorXlx.unfoldCurrentSection',
			run('unfoldCurrentSection', () => foldCurrentSection(provider, false))
		),
		vscode.commands.registerCommand(
			'markdownEditorXlx.foldAllHeadings',
			run('foldAllHeadings', () => foldAllHeadings(provider))
		),
		vscode.commands.registerCommand(
			'markdownEditorXlx.unfoldAll',
			run('unfoldAll', async () => {
				const editor = vscode.window.activeTextEditor;
				await vscode.commands.executeCommand('editor.unfoldAll');
				if (editor && isMarkdownDocument(editor.document)) {
					store.remember(editor.document, []);
				}
			})
		),
		vscode.commands.registerCommand(
			'markdownEditorXlx.restoreFolding',
			run('restoreFolding', async () => {
				const editor = activeMarkdownEditor();
				if (!editor) {
					return;
				}
				const config = readConfig();
				const lines = store.getRestoreLines(
					editor.document,
					provider.scan(editor.document),
					config.maxHeadingLevel
				);
				log(`restoreFolding: 待恢复 ${lines.length} 个折叠点`);
				await foldLines(lines);
				store.markRestored(editor.document);
			})
		),
		vscode.commands.registerCommand(
			'markdownEditorXlx.clearFolding',
			run('clearFolding', async () => {
				const editor = activeMarkdownEditor();
				if (!editor) {
					return;
				}
				store.clear(editor.document);
				void vscode.window.showInformationMessage('Markdown XLX：已清除本文件的折叠记忆。');
			})
		),
		vscode.commands.registerCommand(
			'markdownEditorXlx.diagnose',
			run('diagnose', async () => {
				const editor = vscode.window.activeTextEditor;
				channel.show(true);
				channel.appendLine('======= Markdown XLX 诊断 =======');
				if (!editor) {
					channel.appendLine('没有活动编辑器。');
					return;
				}
				const document = editor.document;
				const config = readConfig();
				const editorConfig = vscode.workspace.getConfiguration('editor');
				channel.appendLine(`文件        : ${document.uri.toString()}`);
				channel.appendLine(`languageId  : ${document.languageId}`);
				channel.appendLine(`行数 / 版本 : ${document.lineCount} / ${document.version}`);
				channel.appendLine(
					`编辑器配置  : folding=${editorConfig.get('folding')}` +
						` foldingStrategy=${editorConfig.get('foldingStrategy')}` +
						` showFoldingControls=${editorConfig.get('showFoldingControls')}`
				);
				channel.appendLine(
					`默认折叠 provider: ${JSON.stringify(
						editorConfig.get('defaultFoldingRangeProvider')
					)}`
				);
				channel.appendLine(
					`本扩展配置  : enabled=${config.enabled} maxHeadingLevel=${config.maxHeadingLevel}`
				);
				const mine = provider.provideFoldingRanges(
					document,
					{ lineCount: document.lineCount },
					new vscode.CancellationTokenSource().token
				);
				channel.appendLine(
					`本扩展范围  : ${mine.length} 个 → ` +
						mine.map((r) => `${r.start + 1}-${r.end + 1}`).join(', ')
				);
				try {
					const actual = await vscode.commands.executeCommand<vscode.FoldingRange[]>(
						'vscode.executeFoldingRangeProvider',
						document.uri
					);
					channel.appendLine(
						`编辑器实际采用: ${actual ? `${actual.length} 个` : 'undefined（没有任何 provider 返回）'}`
					);
					if (actual) {
						channel.appendLine(
							`  → ${actual.map((r) => `${r.start + 1}-${r.end + 1}`).join(', ')}`
						);
					}
				} catch (error) {
					channel.appendLine(`调用 vscode.executeFoldingRangeProvider 失败: ${String(error)}`);
				}
				channel.appendLine('======= 诊断结束 =======');
			})
		),

		// 用户手动点箭头折叠时，用可见范围反推状态
		vscode.window.onDidChangeTextEditorVisibleRanges((event) => {
			if (!isMarkdownDocument(event.textEditor.document)) {
				return;
			}
			const config = readConfig();
			refreshDimming(event.textEditor);
			if (!config.enabled || !config.persistFolding) {
				return;
			}
			store.record(
				event.textEditor,
				provider.scan(event.textEditor.document),
				config.maxHeadingLevel
			);
		}),

		vscode.window.onDidChangeActiveTextEditor((editor) => {
			log(`切换编辑器：${editor?.document.uri.path ?? '(无)'} lang=${editor?.document.languageId ?? '-'}`);
			refreshDimming(editor);
			void restoreIfNeeded(editor, provider, store, log);
		}),

		vscode.workspace.onDidChangeTextDocument((event) => {
			const editor = vscode.window.activeTextEditor;
			if (editor && event.document === editor.document) {
				refreshDimming(editor);
			}
		}),

		vscode.workspace.onDidSaveTextDocument(() => {
			void store.flush();
		}),

		vscode.workspace.onDidCloseTextDocument(() => {
			void store.flush();
		}),

		vscode.workspace.onDidChangeConfiguration((event) => {
			if (!event.affectsConfiguration('markdownEditorXlx')) {
				return;
			}
			if (!readConfig().dimHeadingHashes) {
				dimming.clearAll();
			}
			refreshDimming(vscode.window.activeTextEditor);
			const editor = vscode.window.activeTextEditor;
			if (editor && isMarkdownDocument(editor.document)) {
				void vscode.window.setStatusBarMessage(
					'Markdown XLX：配置已更新，重新打开文件后折叠规则生效。',
					4000
				);
			}
		}),

		dimming,
		{ dispose: () => store.dispose() }
	);

	void restoreIfNeeded(vscode.window.activeTextEditor, provider, store, log);
	refreshDimming(vscode.window.activeTextEditor);
}

export function deactivate(): void {
	void memory?.flush();
}

async function restoreIfNeeded(
	editor: vscode.TextEditor | undefined,
	provider: MarkdownHeadingFoldingProvider,
	store: FoldingMemory,
	log: (message: string) => void
): Promise<void> {
	if (!editor || !isMarkdownDocument(editor.document)) {
		return;
	}
	const config = readConfig();
	if (!config.enabled || !config.persistFolding || !config.autoRevealOnOpen) {
		return;
	}
	if (store.hasRestored(editor.document)) {
		return;
	}
	store.markRestored(editor.document);
	const lines = store.getRestoreLines(
		editor.document,
		provider.scan(editor.document),
		config.maxHeadingLevel
	);
	if (lines.length) {
		log(`自动恢复折叠：${lines.length} 个折叠点（${editor.document.uri.path}）`);
	}
	await foldLines(lines);
}

function activeMarkdownEditor(): vscode.TextEditor | undefined {
	const editor = vscode.window.activeTextEditor;
	if (!editor || !isMarkdownDocument(editor.document)) {
		void vscode.window.showInformationMessage('Markdown XLX：该命令只能在 Markdown 文件里使用。');
		return undefined;
	}
	return editor;
}

async function foldLines(lines: number[]): Promise<void> {
	if (!lines.length) {
		return;
	}
	await vscode.commands.executeCommand('editor.fold', { selectionLines: lines });
}

async function pickAndFoldToLevel(provider: MarkdownHeadingFoldingProvider): Promise<void> {
	const picked = await vscode.window.showQuickPick(
		[1, 2, 3, 4, 5, 6].map((level) => ({
			label: `折叠到第 ${level} 层`,
			description: level === 1 ? '只展开 h1' : `只展开 h1~h${level}`,
			level,
		})),
		{ placeHolder: '选择要保留展开的标题层级' }
	);
	if (!picked) {
		return;
	}
	await foldToLevel(provider, picked.level);
}

async function foldToLevel(
	provider: MarkdownHeadingFoldingProvider,
	level: number
): Promise<void> {
	const editor = activeMarkdownEditor();
	if (!editor) {
		return;
	}
	const config = readConfig();
	const sections = computeSections(
		provider.scan(editor.document).headings,
		editor.document.lineCount,
		config.maxHeadingLevel
	);
	await vscode.commands.executeCommand('editor.unfoldAll');
	const toFold = sections.filter((section) => section.heading.level > level);
	await foldLines(toFold.map((section) => section.startLine));
	// 命令路径状态已知，直接写入记忆（不依赖可见范围推断）
	memory?.remember(editor.document, toFold.map((section) => headingKey(section.heading)));
	void vscode.window.setStatusBarMessage(`Markdown XLX：已折叠到第 ${level} 层`, 2500);
}

async function foldCurrentSection(
	provider: MarkdownHeadingFoldingProvider,
	fold: boolean
): Promise<void> {
	const editor = activeMarkdownEditor();
	if (!editor) {
		return;
	}
	const config = readConfig();
	const section = findSectionAtLine(
		provider.scan(editor.document).headings,
		editor.document.lineCount,
		config.maxHeadingLevel,
		editor.selection.active.line
	);
	if (!section) {
		void vscode.window.showInformationMessage('Markdown XLX：光标所在位置没有可折叠的标题。');
		return;
	}
	await vscode.commands.executeCommand(fold ? 'editor.fold' : 'editor.unfold', {
		selectionLines: [section.startLine],
	});
	if (fold) {
		memory?.addFolded(editor.document, headingKey(section.heading));
	} else {
		memory?.removeFolded(editor.document, headingKey(section.heading));
	}
}

async function foldAllHeadings(provider: MarkdownHeadingFoldingProvider): Promise<void> {
	const editor = activeMarkdownEditor();
	if (!editor) {
		return;
	}
	const config = readConfig();
	const sections = computeSections(
		provider.scan(editor.document).headings,
		editor.document.lineCount,
		config.maxHeadingLevel
	);
	await foldLines(sections.map((section) => section.startLine));
	memory?.remember(editor.document, sections.map((section) => headingKey(section.heading)));
}
