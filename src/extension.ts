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
		SlideWysiwygPanel.createOrShow(context.extensionUri);
	});
	context.subscriptions.push(webviewDisposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
