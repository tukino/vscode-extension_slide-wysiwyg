// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { SlideWysiwygPanel } from './panel';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "slide-wysiwyg" is now active!');

	// Hello World コマンド
	const disposable = vscode.commands.registerCommand('slide-wysiwyg.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from slide-wysiwyg!');
	});
	context.subscriptions.push(disposable);

	// WebViewを開くコマンド
	const webviewDisposable = vscode.commands.registerCommand('slide-wysiwyg.openWebview', () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor || !editor.document.fileName.endsWith('.slide.html')) {
			vscode.window.showWarningMessage('アクティブなファイルが .slide.html ではありません。スライドHTMLファイルを開いてください。');
			return;
		}
		SlideWysiwygPanel.createOrShow(context.extensionUri);
	});
	context.subscriptions.push(webviewDisposable);
	// 新規スライドHTML作成コマンド
	const createSlideHtmlDisposable = vscode.commands.registerCommand('slide-wysiwyg.createSlideHtml', async () => {
		// 保存先ファイル名をユーザーに選択させる
		const uri = await vscode.window.showSaveDialog({
			filters: { 'Slide HTML': ['slide.html'] },
			saveLabel: 'スライドHTMLを作成'
		});
		if (!uri) {
			return;
		}
		// Reveal.js雛形HTML
		const template = `<!DOCTYPE html>\n<html>\n  <head>\n    <meta charset=\"utf-8\">\n    <title>New Slide</title>\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n    <link rel=\"stylesheet\" href=\"https://cdn.jsdelivr.net/npm/reveal.js/dist/reveal.css\" />\n    <link rel=\"stylesheet\" href=\"https://cdn.jsdelivr.net/npm/reveal.js/dist/theme/white.css\" />\n  </head>\n  <body>\n    <div class=\"reveal\">\n      <div class=\"slides\">\n        <section>はじめのスライド</section>\n        <section>2枚目のスライド</section>\n      </div>\n    </div>\n    <script src=\"https://cdn.jsdelivr.net/npm/reveal.js/dist/reveal.js\"></script>\n    <script>Reveal.initialize();</script>\n  </body>\n</html>\n`;
		const encoder = new TextEncoder();
		const uint8array = encoder.encode(template);
		await vscode.workspace.fs.writeFile(uri, uint8array);
		vscode.window.showInformationMessage('スライドHTMLを作成しました: ' + uri.fsPath);
		// 作成したファイルをエディタで開く
		const doc = await vscode.workspace.openTextDocument(uri);
		await vscode.window.showTextDocument(doc);
	});
	context.subscriptions.push(createSlideHtmlDisposable);
	// VSCodeエディタで.slide.htmlが編集・保存された場合、Webviewに内容を即時反映
		vscode.workspace.onDidSaveTextDocument((doc) => {
			if (doc.fileName.endsWith('.slide.html') && SlideWysiwygPanel.currentPanel) {
				SlideWysiwygPanel.currentPanel.postMessageToWebview({ type: 'reload', content: doc.getText() });
			}
		});
		vscode.workspace.onDidChangeTextDocument((e) => {
			// Webview→エディタ同期時はreloadをスキップ（無限ループ防止）
			if (typeof SlideWysiwygPanel.isUpdatingFromWebview !== 'undefined' && SlideWysiwygPanel.isUpdatingFromWebview) {
				return;
			}
			if (e.document.fileName.endsWith('.slide.html') && SlideWysiwygPanel.currentPanel) {
				SlideWysiwygPanel.currentPanel.postMessageToWebview({ type: 'reload', content: e.document.getText() });
			}
		});
	// アクティブな.slide.htmlファイルが切り替わった際にWebviewも自動で内容を切り替え
	vscode.window.onDidChangeActiveTextEditor((editor) => {
		if (editor && editor.document.fileName.endsWith('.slide.html') && SlideWysiwygPanel.currentPanel) {
			SlideWysiwygPanel.currentPanel.postMessageToWebview({ type: 'reload', content: editor.document.getText() });
		}
	});
}

// This method is called when your extension is deactivated
export function deactivate() {}
