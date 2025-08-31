import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { parseSections, updateSection } from './slideParser';

export class SlideWysiwygPanel {
  // Webviewへメッセージ送信用のpublicメソッド
  // ...existing code...
    // Webviewへメッセージ送信用のpublicメソッド
    public postMessageToWebview(message: any) {
      this._panel.webview.postMessage(message);
    }
    public static currentPanel: SlideWysiwygPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private readonly _targetFileUri?: vscode.Uri;

    public static readonly viewType = 'slideWysiwygWebview';

    // Webview→エディタ同期時の無限ループ防止用フラグ
    public static isUpdatingFromWebview = false;

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
      this._panel = panel;
      this._extensionUri = extensionUri;
      // アクティブな.slide.htmlファイルのUriを記憶
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.document.fileName.endsWith('.slide.html')) {
        this._targetFileUri = editor.document.uri;
      }
      // WebViewのHTMLを非同期でセット
      this._setHtmlForWebview(panel.webview);

      // WebViewからのメッセージ受信
      let receiveCount = 0;
      this._panel.webview.onDidReceiveMessage(async (message) => {
        receiveCount++;
        const now = new Date().toISOString();
        console.log(`[slide-wysiwyg] onDidReceiveMessage #${receiveCount} @${now}`, message);
        // .slide.htmlの内容取得
        let html = '';
        if (this._targetFileUri) {
          try {
            const doc = await vscode.workspace.openTextDocument(this._targetFileUri);
            html = doc.getText();
          } catch (e) {
            console.warn('[slide-wysiwyg] failed to read .slide.html', e);
          }
        } else {
          const editor = vscode.window.activeTextEditor;
          html = editor ? editor.document.getText() : '';
        }
        if (message.type === 'getPages') {
            // 全sectionをサムネイル用HTMLとして返す
            console.log('[slide-wysiwyg] getPages: html length', html.length);
            console.log('[slide-wysiwyg] getPages: html', html);
            const sections = parseSections(html);
            console.log('[slide-wysiwyg] getPages: sections', sections);
            const pages = sections.map(s => ({ index: s.index, previewHtml: s.html }));
            console.log('[slide-wysiwyg] getPages: pages', pages);
            this._panel.webview.postMessage({ type: 'pages', pages });
        } else if (message.type === 'getPageContent' && typeof message.pageIndex === 'number') {
          // 指定indexのsection内容を返す
          const sections = parseSections(html);
          const section = sections.find(s => s.index === message.pageIndex);
          this._panel.webview.postMessage({ type: 'pageContent', pageIndex: message.pageIndex, content: section ? section.html : '' });
        } else if (message.type === 'savePageContent' && typeof message.pageIndex === 'number' && typeof message.content === 'string') {
          // 指定indexのsectionのみ差し替えて全体HTMLを再構築・保存
          if (this._targetFileUri) {
            try {
              const doc = await vscode.workspace.openTextDocument(this._targetFileUri);
              // 既存のTextEditorを探す
              let editor = vscode.window.visibleTextEditors.find(e => e.document.uri.toString() === this._targetFileUri!.toString());
              if (!editor) {
                editor = await vscode.window.showTextDocument(doc, { preview: false });
              }
              SlideWysiwygPanel.isUpdatingFromWebview = true;
              const newHtml = updateSection(doc.getText(), message.pageIndex, message.content);
              await editor.edit(editBuilder => {
                const fullRange = new vscode.Range(
                  doc.positionAt(0),
                  doc.positionAt(doc.getText().length)
                );
                editBuilder.replace(fullRange, newHtml);
              });
              SlideWysiwygPanel.isUpdatingFromWebview = false;
              this._panel.webview.postMessage({ type: 'saved', pageIndex: message.pageIndex });
            } catch (e) {
              vscode.window.showWarningMessage('[slide-wysiwyg] .slide.htmlエディタの保存に失敗しました: ' + String(e));
            }
          } else {
            vscode.window.showWarningMessage('[slide-wysiwyg] .slide.htmlエディタが開かれていません。エディタを開いてから編集してください。');
          }
        }
      });

        // アクティブエディタ切り替え時に.slide.htmlならWebViewにgetPagesリクエストを再送信
        vscode.window.onDidChangeActiveTextEditor((editor) => {
          if (editor && editor.document.fileName.endsWith('.slide.html')) {
            this._panel.webview.postMessage({ type: 'getPages' });
          }
        });
    }

    public static async createOrShow(extensionUri: vscode.Uri) {
      const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

      if (SlideWysiwygPanel.currentPanel) {
        SlideWysiwygPanel.currentPanel._panel.reveal(column);
        return;
      }

      const panel = vscode.window.createWebviewPanel(
        SlideWysiwygPanel.viewType,
        'Slide WYSIWYG Webview',
        column || vscode.ViewColumn.One,
        {
          enableScripts: true
        }
      );

      SlideWysiwygPanel.currentPanel = new SlideWysiwygPanel(panel, extensionUri);
    }

    private async _setHtmlForWebview(webview: vscode.Webview) {
      // index.htmlのUriを解決
      const htmlUri = vscode.Uri.joinPath(this._extensionUri, 'src', 'webview', 'index.html');
      const mainJsUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'src', 'webview', 'main.js'));
      const styleCssUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'src', 'webview', 'style.css'));
      // index.htmlを読み込み
      let htmlBuf = await vscode.workspace.fs.readFile(htmlUri);
      let html = Buffer.from(htmlBuf).toString('utf8');
      // パスをHTML内で置換
      html = html.replace('./main.js', mainJsUri.toString());
      html = html.replace('./style.css', styleCssUri.toString());
      webview.html = html;
    }
  }
