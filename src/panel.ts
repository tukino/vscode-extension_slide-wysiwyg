import * as vscode from 'vscode';

export class SlideWysiwygPanel {
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
    this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);

    // WebViewからのメッセージ受信
    let receiveCount = 0;
  this._panel.webview.onDidReceiveMessage(async (message) => {
      receiveCount++;
      const now = new Date().toISOString();
      console.log(`[slide-wysiwyg] onDidReceiveMessage #${receiveCount} @${now}`, message);
      vscode.window.showInformationMessage(`[slide-wysiwyg] 受信 #${receiveCount} @${now}: ${JSON.stringify(message)}`);
      if (message.type === 'save' && typeof message.content === 'string') {
        // アクティブな.slide.htmlエディタがあればTextEditor.editで直接置換（ディスク保存はしない）
        try {
          let editor = vscode.window.activeTextEditor;
          let foundBy = 'activeTextEditor';
          // editorが取得できない場合、開いているテキストエディタ一覧から.slide.htmlを探す
          if (!editor || !(editor.document.fileName.toLowerCase().endsWith('.slide.html'))) {
            const visibleEditors = vscode.window.visibleTextEditors;
            for (const ed of visibleEditors) {
              if (ed.document.fileName.toLowerCase().endsWith('.slide.html')) {
                editor = ed;
                foundBy = 'visibleTextEditors';
                break;
              }
            }
          }
          // デバッグログ
          console.log('[slide-wysiwyg] save: editor found by', foundBy, editor ? editor.document.fileName : '(none)');
          if (editor && editor.document.fileName.toLowerCase().endsWith('.slide.html')) {
            SlideWysiwygPanel.isUpdatingFromWebview = true;
            await editor.edit(editBuilder => {
              const fullRange = new vscode.Range(
                editor.document.positionAt(0),
                editor.document.positionAt(editor.document.getText().length)
              );
              editBuilder.replace(fullRange, message.content);
            });
            SlideWysiwygPanel.isUpdatingFromWebview = false;
            vscode.window.showInformationMessage('[slide-wysiwyg] エディタ内容を即時反映しました（未保存）');
          } else {
            vscode.window.showWarningMessage('[slide-wysiwyg] .slide.htmlエディタが開かれていません。エディタを開いてから編集してください。');
          }
        } catch (e) {
          SlideWysiwygPanel.isUpdatingFromWebview = false;
          let errMsg = '';
          if (e instanceof Error) {
            errMsg = e.stack || e.message;
          } else {
            errMsg = String(e);
          }
          vscode.window.showErrorMessage('[slide-wysiwyg] 保存エラー: ' + errMsg);
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
    // プレビュー/編集切替UI＋Reveal.jsプレビュー＋GrapesJSエディタ
    // テンプレートリテラル・${}を二重エスケープ
  return `
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Slide WYSIWYG Webview</title>
        <link href="https://unpkg.com/grapesjs/dist/css/grapes.min.css" rel="stylesheet"/>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js/dist/reveal.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js/dist/theme/white.css" />
        <style>
          body, html { height: 100%; margin: 0; padding: 0; }
          #tab-bar { display: flex; border-bottom: 1px solid #ccc; }
          .tab-btn { flex: 1; padding: 8px; cursor: pointer; background: #f7f7f7; border: none; border-right: 1px solid #ccc; font-size: 1rem; }
          .tab-btn.active { background: #fff; font-weight: bold; }
          #editor-view, #preview-view { display: none; }
          #editor-view.active, #preview-view.active { display: block; }
          #gjs { min-height: 70vh; border: 1px solid #444; }
          #save-btn { margin: 10px 0; padding: 6px 16px; font-size: 1rem; }
        </style>
      </head>
      <body>
        <div id="tab-bar">
          <button id="edit-tab" class="tab-btn active">編集</button>
          <button id="preview-tab" class="tab-btn">プレビュー</button>
        </div>
        <div id="editor-view" class="active">
          <button id="save-btn">保存</button>
          <div id="gjs"> <h1>ここにスライドを作成</h1> </div>
        </div>
        <div id="preview-view">
          <div class="reveal">
            <div class="slides" id="reveal-slides">
              <section>ここにスライドを作成</section>
            </div>
          </div>
        </div>
        <script src="https://unpkg.com/grapesjs"></script>
        <script src="https://cdn.jsdelivr.net/npm/reveal.js/dist/reveal.js"></script>
        <script>
          // VSCode APIは1回だけ取得
          const vscode = (typeof acquireVsCodeApi === 'function') ? acquireVsCodeApi() : null;
          // JSグローバルエラーをcatchしてconsoleに出す
          window.onerror = function(msg, url, line, col, error) {
            console.error('[slide-wysiwyg][window.onerror]', msg, url, line, col, error);
          };
          window.addEventListener('error', function(e) {
            console.error('[slide-wysiwyg][window.error event]', e);
          });
          let editor;
          let isSyncing = false; // setComponents中はtrue
          let skipNextUpdate = 0; // setComponents直後のupdateイベントをスキップ
          function logDebug(...args) { try { console.log('[slide-wysiwyg]', ...args); } catch(e) {} }
          function switchTab(tab) {
            logDebug('switchTab', tab);
            document.getElementById('edit-tab').classList.remove('active');
            document.getElementById('preview-tab').classList.remove('active');
            document.getElementById('editor-view').classList.remove('active');
            document.getElementById('preview-view').classList.remove('active');
            if (tab === 'edit') {
              document.getElementById('edit-tab').classList.add('active');
              document.getElementById('editor-view').classList.add('active');
            } else {
              document.getElementById('preview-tab').classList.add('active');
              document.getElementById('preview-view').classList.add('active');
              // GrapesJSの内容をReveal.jsプレビューに反映
              const html = editor.getHtml();
              document.getElementById('reveal-slides').innerHTML = html;
              logDebug('Reveal.js preview updated', html);
              if (window.Reveal && window.Reveal.isReady()) {
                window.Reveal.sync();
              } else {
                window.Reveal && window.Reveal.initialize({ embedded: true });
              }
            }
          }
          window.addEventListener('DOMContentLoaded', function() {
            logDebug('DOMContentLoaded');
            editor = grapesjs.init({
              container: '#gjs',
              height: '70vh',
              fromElement: false, // 空の状態から開始
              storageManager: false,
              blockManager: { appendTo: '#gjs' }
            });
            logDebug('GrapesJS initialized', editor);
            // GrapesJSの全イベントでlogDebug
            const allEvents = [
              'update', 'component:add', 'component:update', 'component:remove',
              'canvas:drop', 'load', 'run', 'stop', 'change:changesCount', 'undo', 'redo'
            ];
            allEvents.forEach(ev => {
              editor.on(ev, (...args) => logDebug('GrapesJS event', ev, ...args));
            });
            // スライド（section）ブロックを追加
            editor.BlockManager.add('slide-section', {
              label: 'スライド',
              category: 'スライド',
              attributes: { class: 'fa fa-square' },
              content: '<section>新しいスライド</section>'
            });
            logDebug('BlockManager: slide-section added');
            // 編集内容が変わるたびに即時ファイル反映（自動保存ON）
            editor.on('update', function() {
              if (isSyncing) {
                logDebug('editor update (syncing, skip postMessage)');
                return;
              }
              if (skipNextUpdate > 0) {
                logDebug('editor update (skipNextUpdate, skip postMessage)');
                skipNextUpdate--;
                return;
              }
              const html = editor.getHtml();
              const css = editor.getCss();
              const content = '<!DOCTYPE html><html><head><style>' + css + '</style></head><body>' + html + '</body></html>';
              logDebug('editor update', { html, css });
              if (vscode) {
                logDebug('postMessage: save', content);
                vscode.postMessage({ type: 'save', content });
              } else {
                logDebug('acquireVsCodeApi is NOT available');
              }
            });
            // 保存ボタンを表示し、クリックで必ずpostMessage: saveを送る
            document.getElementById('save-btn').style.display = 'inline-block';
            document.getElementById('save-btn').addEventListener('click', function() {
              const html = editor.getHtml();
              const css = editor.getCss();
              const content = '<!DOCTYPE html><html><head><style>' + css + '</style></head><body>' + html + '</body></html>';
              logDebug('save-btn click', { html, css });
              if (vscode) {
                logDebug('postMessage: save', content);
                vscode.postMessage({ type: 'save', content });
              } else {
                logDebug('acquireVsCodeApi is NOT available');
              }
            });
            document.getElementById('edit-tab').addEventListener('click', function() { switchTab('edit'); });
            document.getElementById('preview-tab').addEventListener('click', function() { switchTab('preview'); });
            // VSCode拡張からの'reload'メッセージでエディタ内容を再読込
            window.addEventListener('message', event => {
              const msg = event.data;
              logDebug('window message', msg);
              if (msg && msg.type === 'reload' && typeof msg.content === 'string') {
                // HTML文字列からbody部分だけ抽出しGrapesJSにセット
                const parser = new DOMParser();
                const doc = parser.parseFromString(msg.content, 'text/html');
                const bodyHtml = doc.body ? doc.body.innerHTML : msg.content;
                logDebug('reload: setComponents', bodyHtml);
                isSyncing = true;
                try {
                  skipNextUpdate++;
                  editor.setComponents(bodyHtml);
                } finally {
                  isSyncing = false;
                }
                // プレビューも即時更新
                document.getElementById('reveal-slides').innerHTML = bodyHtml;
                if (window.Reveal && window.Reveal.isReady()) {
                  window.Reveal.sync();
                } else {
                  window.Reveal && window.Reveal.initialize({ embedded: true });
                }
              }
            });
          });
        </script>
      </body>
      </html>
    `;
  }
}
