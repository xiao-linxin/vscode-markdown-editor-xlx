import * as vscode from 'vscode';
import { Heading } from './headings';

/**
 * 标题 `#` 号淡化。
 *
 * 「折叠时隐藏 # 号」用扩展 API 做不到：折叠行的占位文本由编辑器内部渲染，
 * 定制它用的 collapseText 并未公开。这里退一步，把标题行开头的 `#` 号染成淡灰，
 * 视觉上弱化（占位宽度不变）。
 */
export class HeadingHashDimming implements vscode.Disposable {
	private readonly decoration = vscode.window.createTextEditorDecorationType({
		color: 'rgba(128, 128, 128, 0.55)',
	});

	public apply(editor: vscode.TextEditor, headings: Heading[], enabled: boolean): void {
		if (!enabled) {
			editor.setDecorations(this.decoration, []);
			return;
		}
		const options: vscode.DecorationOptions[] = [];
		for (const heading of headings) {
			const line = editor.document.lineAt(heading.line);
			const match = /^ {0,3}(#{1,6})/.exec(line.text);
			if (!match) {
				// Setext 标题没有 # 号，跳过
				continue;
			}
			const startChar = match[0].length - match[1].length;
			options.push({
				range: new vscode.Range(heading.line, startChar, heading.line, match[0].length),
			});
		}
		editor.setDecorations(this.decoration, options);
	}

	public clearAll(): void {
		for (const editor of vscode.window.visibleTextEditors) {
			editor.setDecorations(this.decoration, []);
		}
	}

	public dispose(): void {
		this.decoration.dispose();
	}
}
