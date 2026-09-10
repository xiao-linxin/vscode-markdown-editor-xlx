import * as vscode from 'vscode';
import { headingKey } from './foldingProvider';
import { computeSections, ScanResult } from './headings';

const STORAGE_KEY = 'markdownEditorXlx.foldingState';
/** 最多记住多少个文件，超出后按最近使用淘汰 */
const MAX_TRACKED_FILES = 500;
/** 超过这个时间的记忆直接丢弃 */
const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

interface FileMemory {
	folded: string[];
	at: number;
}

type MemoryStore = Record<string, FileMemory>;

/**
 * 折叠状态记忆。
 *
 * VS Code 扩展 API 拿不到「哪些区域当前被折叠」，只能间接获取：
 *  - 本扩展自己的命令（折叠到第 N 层等）执行后，状态是已知的，直接写入；
 *  - 用户手动点箭头折叠时，用 editor.visibleRanges 反推。
 *
 * 反推规则：标题行必须落在某个可见区间内，且该区间在标题行处就结束
 * （标题的下一行不可见），才算这一节被折叠。标题不在视口内、或标题正好停在
 * 视口底部边缘时不作判断——否则单纯滚动就会被误判成折叠。
 *
 * 保存的是「标题层级:标题文本」而不是行号，文件被编辑后行号变化也能对上。
 */
export class FoldingMemory {
	private store: MemoryStore;
	private readonly session = new Map<string, FileMemory>();
	private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
	private readonly restored = new Set<string>();

	constructor(
		private readonly context: vscode.ExtensionContext,
		private readonly debounceMs = 400
	) {
		this.store = context.globalState.get<MemoryStore>(STORAGE_KEY, {});
	}

	public hasRestored(document: vscode.TextDocument): boolean {
		return this.restored.has(document.uri.toString());
	}

	public markRestored(document: vscode.TextDocument): void {
		this.restored.add(document.uri.toString());
	}

	public get(document: vscode.TextDocument): string[] {
		const key = document.uri.toString();
		return this.session.get(key)?.folded ?? this.store[key]?.folded ?? [];
	}

	/** 命令路径：折叠状态完全已知，直接覆盖写入 */
	public remember(document: vscode.TextDocument, folded: string[]): void {
		this.put(document, Array.from(new Set(folded)));
	}

	public addFolded(document: vscode.TextDocument, key: string): void {
		const folded = new Set(this.get(document));
		folded.add(key);
		this.remember(document, Array.from(folded));
	}

	public removeFolded(document: vscode.TextDocument, key: string): void {
		const folded = new Set(this.get(document));
		folded.delete(key);
		this.remember(document, Array.from(folded));
	}

	/** 手动折叠路径：从可见范围反推当前折叠状态 */
	public record(editor: vscode.TextEditor, scan: ScanResult, maxLevel: number): void {
		this.remember(editor.document, detectFoldedKeys(editor, scan, maxLevel));
	}

	/** 把记忆换算成待恢复的折叠起始行号 */
	public getRestoreLines(
		document: vscode.TextDocument,
		scan: ScanResult,
		maxLevel: number
	): number[] {
		const keys = this.get(document);
		if (!keys.length) {
			return [];
		}
		const sections = computeSections(scan.headings, document.lineCount, maxLevel);
		const lineByKey = new Map(sections.map((s) => [headingKey(s.heading), s.startLine]));
		const lines = new Set<number>();
		for (const key of keys) {
			const line = lineByKey.get(key);
			if (line !== undefined) {
				lines.add(line);
			}
		}
		return Array.from(lines).sort((a, b) => a - b);
	}

	public clear(document: vscode.TextDocument): void {
		const key = document.uri.toString();
		this.session.delete(key);
		delete this.store[key];
		void this.context.globalState.update(STORAGE_KEY, this.store);
	}

	public async flush(): Promise<void> {
		for (const [key, memory] of this.session) {
			this.store[key] = memory;
		}
		this.store = prune(this.store);
		await this.context.globalState.update(STORAGE_KEY, this.store);
	}

	public dispose(): void {
		for (const timer of this.timers.values()) {
			clearTimeout(timer);
		}
		this.timers.clear();
		void this.flush();
	}

	private put(document: vscode.TextDocument, folded: string[]): void {
		const key = document.uri.toString();
		this.session.set(key, { folded, at: Date.now() });

		const existing = this.timers.get(key);
		if (existing) {
			clearTimeout(existing);
		}
		this.timers.set(
			key,
			setTimeout(() => {
				this.timers.delete(key);
				void this.flush();
			}, this.debounceMs)
		);
	}
}

function detectFoldedKeys(
	editor: vscode.TextEditor,
	scan: ScanResult,
	maxLevel: number
): string[] {
	const visible = editor.visibleRanges;
	if (!visible.length) {
		return [];
	}
	// 视口底部的最后一行无法判断是否折叠（可能只是滚动到了边缘）
	const viewportBottom = visible[visible.length - 1].end.line;
	const sections = computeSections(scan.headings, editor.document.lineCount, maxLevel);
	const folded: string[] = [];
	for (const section of sections) {
		const { startLine, endLine } = section;
		if (endLine <= startLine || startLine >= viewportBottom) {
			continue;
		}
		const container = visible.find(
			(range) => range.start.line <= startLine && range.end.line >= startLine
		);
		if (!container) {
			continue;
		}
		// 标题是该可见区间的最后一行 => 标题下的内容被折叠收起
		if (startLine + 1 > container.end.line) {
			folded.push(headingKey(section.heading));
		}
	}
	return folded;
}

function prune(store: MemoryStore): MemoryStore {
	const now = Date.now();
	const entries = Object.entries(store)
		.filter(([, memory]) => now - memory.at < MAX_AGE_MS)
		.sort((a, b) => b[1].at - a[1].at)
		.slice(0, MAX_TRACKED_FILES);
	return Object.fromEntries(entries);
}
