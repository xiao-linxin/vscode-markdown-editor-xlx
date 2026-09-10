import * as vscode from 'vscode';
import { computeSections, scanDocument, ScanResult } from './headings';

export interface FoldingConfig {
	maxHeadingLevel: number;
	regionMarkers: boolean;
	enabled: boolean;
	persistFolding: boolean;
	autoRevealOnOpen: boolean;
	dimHeadingHashes: boolean;
	trace: boolean;
}

export function readConfig(): FoldingConfig {
	const config = vscode.workspace.getConfiguration('markdownEditorXlx');
	return {
		enabled: config.get<boolean>('enabled', true),
		maxHeadingLevel: config.get<number>('maxHeadingLevel', 6),
		regionMarkers: config.get<boolean>('foldRegionMarkers', true),
		// 折叠状态持久化默认关闭：VS Code 原生就会恢复编辑器视图状态（含折叠），
		// 自己再实现一遍是重复造轮子，还容易与原生互相干扰。
		persistFolding: config.get<boolean>('persistFolding', false),
		autoRevealOnOpen: config.get<boolean>('autoRevealOnOpen', false),
		dimHeadingHashes: config.get<boolean>('dimHeadingHashes', false),
		trace: config.get<boolean>('trace', false),
	};
}

export type Logger = (message: string) => void;

/**
 * 标题折叠 Provider。
 *
 * 注意：为一个语言注册 FoldingRangeProvider 是「接管」而不是「叠加」——但编辑器只会
 * 使用其中一个 Provider（内部按匹配度排序后取第一个，内置扩展总是比第三方扩展先注册），
 * 所以还要配合设置 editor.defaultFoldingRangeProvider 指定用本扩展，否则本扩展算出的
 * 折叠范围不会被采用。本实现是内置行为的超集：标题层级 + #region + 忽略代码块/front matter。
 */
export class MarkdownHeadingFoldingProvider implements vscode.FoldingRangeProvider {
	private cache?: { version: number; scan: ScanResult };

	constructor(
		private readonly config: () => FoldingConfig,
		private readonly log?: Logger
	) {}

	/** 按文档版本缓存，避免每次重算折叠模型都重新扫全文 */
	public scan(document: vscode.TextDocument): ScanResult {
		if (this.cache && this.cache.version === document.version) {
			return this.cache.scan;
		}
		const scan = scanDocument(document.getText(), {
			regionMarkers: this.config().regionMarkers,
		});
		this.cache = { version: document.version, scan };
		return scan;
	}

	public provideFoldingRanges(
		document: vscode.TextDocument,
		_context: vscode.FoldingContext,
		token: vscode.CancellationToken
	): vscode.FoldingRange[] {
		if (!this.config().enabled || token.isCancellationRequested) {
			this.log?.(`provideFoldingRanges: 跳过（enabled=${this.config().enabled}）`);
			return [];
		}
		const scan = this.scan(document);
		const lineCount = document.lineCount;
		const maxLevel = this.config().maxHeadingLevel;

		const ranges: vscode.FoldingRange[] = [];
		for (const section of computeSections(scan.headings, lineCount, maxLevel)) {
			ranges.push(new vscode.FoldingRange(section.startLine, section.endLine));
		}
		if (this.config().regionMarkers) {
			for (const region of scan.regions) {
				if (region.end > region.start) {
					ranges.push(
						new vscode.FoldingRange(region.start, region.end, vscode.FoldingRangeKind.Region)
					);
				}
			}
		}
		this.log?.(
			`provideFoldingRanges: ${ranges.length} 个折叠范围` +
				`（标题 ${scan.headings.length} 个，maxLevel=${maxLevel}，${document.uri.path}）`
		);
		return ranges;
	}
}

/** 折叠状态持久化时用的稳定 key：标题层级 + 标题文本（文件被编辑后仍能对上） */
export function headingKey(heading: { level: number; text: string }): string {
	return `${heading.level}:${heading.text}`;
}

/**
 * 支持的语言 id。
 *
 * 注意 `mdc`：装了 `Nuxt.mdc`（MDC - Markdown Components）之后，`.md` 文件会被
 * 注册成 `mdc` 语言而不是 `markdown`，只匹配 `markdown` 的 Provider 会完全失效。
 */
export const MD_LANGUAGES = ['markdown', 'mdx', 'mdc'];

/** 折叠 Provider 的作用范围：语言 id + 文件名 glob 双保险 */
export const MD_SELECTOR: vscode.DocumentSelector = [
	...MD_LANGUAGES.map((language) => ({ language })),
	{ pattern: '**/*.md' },
	{ pattern: '**/*.markdown' },
	{ pattern: '**/*.mdx' },
	{ pattern: '**/*.mdc' },
];

export function isMarkdownDocument(document: vscode.TextDocument): boolean {
	if (MD_LANGUAGES.includes(document.languageId)) {
		return true;
	}
	// 语言被别的扩展抢走时兜底：按文件扩展名判断
	return /\.(md|markdown|mdx|mdc)$/i.test(document.uri.path);
}
