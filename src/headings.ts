/**
 * Markdown 标题扫描器。
 *
 * 只做一件事：把一段 Markdown 文本解析成「标题列表」和「手动折叠标记区域」，
 * 供折叠 Provider、命令和折叠状态持久化复用。
 *
 * 刻意跳过的内容（这些位置的 `#` 不是标题）：
 *  - fenced code block（``` / ~~~）
 *  - YAML / TOML front matter
 *  - 多行 HTML 注释
 *  - 缩进 >= 4 空格的行（缩进代码块）
 */

export interface Heading {
	/** 标题所在行（0-based） */
	line: number;
	/** 标题层级 1..6 */
	level: number;
	/** 去掉 `#` 和首尾空白后的标题文本，用于折叠状态持久化时做匹配 */
	text: string;
}

export interface FoldRegion {
	/** `<!-- #region -->` 所在行（0-based） */
	start: number;
	/** `<!-- #endregion -->` 所在行（0-based） */
	end: number;
}

export interface ScanResult {
	headings: Heading[];
	regions: FoldRegion[];
}

export interface ScanOptions {
	/** 是否识别 <!-- #region --> / <!-- #endregion --> */
	regionMarkers: boolean;
}

const ATX_HEADING = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?[ \t]*$/;
const SETEXT_UNDERLINE = /^ {0,3}(=+|-+)[ \t]*$/;
const FENCE = /^ {0,3}(`{3,}|~{3,})/;
const FRONT_MATTER = /^(---|\+\+\+)[ \t]*$/;
const FRONT_MATTER_END = /^(---|\+\+\+|\.\.\.)[ \t]*$/;
const REGION_START = /^\s*<!--\s*#?region\b(?:\s+[^>]*?)?\s*-->\s*$/i;
const REGION_END = /^\s*<!--\s*#?endregion\b(?:\s+[^>]*?)?\s*-->\s*$/i;
const LIST_ITEM = /^ {0,3}(?:[-*+]|\d{1,9}[.)])[ \t]/;

/** 按物理行切分，兼容 CRLF / CR / LF */
export function splitLines(text: string): string[] {
	return text.split(/\r\n|\n|\r/);
}

export function scanDocument(text: string, options: ScanOptions): ScanResult {
	const lines = splitLines(text);
	const headings: Heading[] = [];
	const regions: FoldRegion[] = [];
	const regionStack: number[] = [];

	let fence: { marker: string; length: number } | undefined;
	let inFrontMatter = false;
	let inHtmlComment = false;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		// front matter：仅当文件第一行是 --- / +++ 时开启
		if (inFrontMatter) {
			if (FRONT_MATTER_END.test(line)) {
				inFrontMatter = false;
			}
			continue;
		}
		if (i === 0 && FRONT_MATTER.test(line)) {
			inFrontMatter = true;
			continue;
		}

		// fenced code block
		if (fence) {
			const close = new RegExp('^ {0,3}' + fence.marker + '{' + fence.length + ',}[ \\t]*$');
			if (close.test(line)) {
				fence = undefined;
			}
			continue;
		}
		const fenceMatch = FENCE.exec(line);
		if (fenceMatch) {
			fence = { marker: fenceMatch[1][0] === '`' ? '`' : '~', length: fenceMatch[1].length };
			continue;
		}

		// 多行 HTML 注释：注释内的 # 与 region 标记都要单独判断
		if (inHtmlComment) {
			if (line.includes('-->')) {
				inHtmlComment = false;
			}
			continue;
		}

		if (options.regionMarkers) {
			if (REGION_START.test(line)) {
				regionStack.push(i);
				continue;
			}
			if (REGION_END.test(line)) {
				const start = regionStack.pop();
				if (start !== undefined) {
					regions.push({ start, end: i });
				}
				continue;
			}
		}

		const commentStart = line.indexOf('<!--');
		if (commentStart >= 0 && !line.includes('-->', commentStart)) {
			inHtmlComment = true;
			// 注释开始前半段仍可能是标题，继续往下走
		}

		// ATX 标题
		const atx = ATX_HEADING.exec(line);
		if (atx) {
			headings.push({
				line: i,
				level: atx[1].length,
				text: normalizeHeadingText(atx[2] ?? ''),
			});
			continue;
		}

		// Setext 标题：标题文本在上一行，本行是 === / --- 下划线
		const setext = SETEXT_UNDERLINE.exec(line);
		if (setext && i > 0) {
			const titleLine = lines[i - 1];
			if (isSetextTitleCandidate(titleLine)) {
				headings.push({
					line: i - 1,
					level: setext[1][0] === '=' ? 1 : 2,
					text: normalizeHeadingText(titleLine),
				});
			}
		}
	}

	return { headings, regions };
}

function isSetextTitleCandidate(line: string): boolean {
	if (!line.trim()) {
		return false;
	}
	// 4 空格以上缩进属于缩进代码块
	if (/^ {4,}/.test(line)) {
		return false;
	}
	// 列表项、引用、标题行、fence、注释都不是 setext 标题
	if (LIST_ITEM.test(line) || /^\s*>/.test(line) || ATX_HEADING.test(line)) {
		return false;
	}
	if (FENCE.test(line) || line.includes('<!--')) {
		return false;
	}
	return true;
}

function normalizeHeadingText(raw: string): string {
	return raw.replace(/\s+#+\s*$/, '').trim();
}

/**
 * 计算每个标题的章节范围，语义与编辑器折叠一致：
 * 章节从标题行开始，到「下一个层级 <= 当前层级」的标题行的前一行结束。
 */
export interface HeadingSection {
	heading: Heading;
	startLine: number;
	endLine: number;
}

export function computeSections(
	headings: Heading[],
	lineCount: number,
	maxLevel: number
): HeadingSection[] {
	const sections: HeadingSection[] = [];
	for (let i = 0; i < headings.length; i++) {
		const heading = headings[i];
		if (heading.level > maxLevel) {
			continue;
		}
		let endLine = Math.max(0, lineCount - 1);
		for (let j = i + 1; j < headings.length; j++) {
			if (headings[j].level <= heading.level) {
				endLine = headings[j].line - 1;
				break;
			}
		}
		if (endLine > heading.line) {
			sections.push({ heading, startLine: heading.line, endLine });
		}
	}
	return sections;
}

/** 找到光标所在章节（光标行之前、层级最深的那个标题） */
export function findSectionAtLine(
	headings: Heading[],
	lineCount: number,
	maxLevel: number,
	cursorLine: number
): HeadingSection | undefined {
	const sections = computeSections(headings, lineCount, maxLevel);
	let found: HeadingSection | undefined;
	for (const section of sections) {
		if (section.startLine <= cursorLine) {
			if (!found || section.startLine >= found.startLine) {
				found = section;
			}
		}
	}
	return found;
}
