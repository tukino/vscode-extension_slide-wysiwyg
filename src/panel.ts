import * as vscode from 'vscode';

export class SlideWysiwygPanel {
  public static currentPanel: SlideWysiwygPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;

  public static readonly viewType = 'slideWysiwygWebview';

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);

    // WebViewからのメッセージ受信
    this._panel.webview.onDidReceiveMessage(async (message) => {
      if (message.type === 'save' && typeof message.content === 'string') {
        // 保存先ファイル名をユーザーに選択させる
        const uri = await vscode.window.showSaveDialog({
          filters: { 'HTML Files': ['html'] },
          saveLabel: 'スライドを保存'
        });
        if (uri) {
          const encoder = new TextEncoder();
          const uint8array = encoder.encode(message.content);
          await vscode.workspace.fs.writeFile(uri, uint8array);
          vscode.window.showInformationMessage('スライドを保存しました: ' + uri.fsPath);
        }
      }
    });
  }

  public static createOrShow(extensionUri: vscode.Uri) {
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

  private _getHtmlForWebview(webview: vscode.Webview): string {
    // GrapesJS組み込み＋保存ボタン
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Slide WYSIWYG Webview</title>
        <link href="https://unpkg.com/grapesjs/dist/css/grapes.min.css" rel="stylesheet"/>
        <style>
          body, html { height: 100%; margin: 0; padding: 0; }
          #gjs { min-height: 80vh; border: 1px solid #444; }
          #save-btn { margin: 10px 0; padding: 6px 16px; font-size: 1rem; }
        </style>
      </head>
      <body>
        <button id="save-btn">保存</button>
        <div id="gjs"> <h1>ここにスライドを作成</h1> </div>
        <script src="https://unpkg.com/grapesjs"></script>
        <script>
          let editor;
          window.addEventListener('DOMContentLoaded', function() {
            editor = grapesjs.init({
              container: '#gjs',
              height: '80vh',
              fromElement: true,
              storageManager: false
            });
            document.getElementById('save-btn').addEventListener('click', function() {
              const html = editor.getHtml();
              const css = editor.getCss();
              const content = `<!DOCTYPE html><html><head><style>${css}</style></head><body>${html}</body></html>`;
              // VSCode拡張機能本体へ送信
              if (window.acquireVsCodeApi) {
                const vscode = acquireVsCodeApi();
                vscode.postMessage({ type: 'save', content });
              }
            });
          });
        </script>
      </body>
      </html>
    `;
  }
}
