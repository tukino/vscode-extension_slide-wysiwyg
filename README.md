
# slide-wysiwyg

VSCode用 WYSIWYGスライドエディタ拡張機能（MVP）

## 概要
- VSCodeのWebView上でGrapesJSを使ったスライド編集が可能
- 最小限のUI（GrapesJSデフォルトUIのみ、保存ボタンなし）

## 使い方
1. コマンドパレットで「Open Slide WYSIWYG Webview」を実行
2. WebView上でスライドを編集（編集内容は即時プレビューに反映、保存ボタンはありません）

## 開発・ビルド
```sh
npm install
npm run compile
```


## AIプロンプト支援機能

1. コマンドパレットで「AIプロンプト支援」と入力し実行
2. テンプレートを選択すると、選択中テキストがプロンプトに自動挿入され、クリップボードにコピーされます
3. Copilot Chatパネルが自動で開きます（拡張が有効な場合）
4. Copilot Chatに貼り付けて利用してください

F5でExtension Development Hostを起動し、動作確認可能

## 設計要件

### AI連携設計
- 拡張機能自体にAI生成機能は組み込まない
- Copilot Chat（Agent Chat）を活用し、拡張機能は「Agent Chatに投げるプロンプト支援」のみを担う
- よく使うプロンプトのテンプレート表示・コピー、選択中テキストのプロンプト自動挿入、WebViewやコマンドパレットからワンクリックでプロンプトコピーなどを想定
- 必要に応じてAgent Chatパネルを自動で開く（APIが許せば）

### WYSIWYGプレビュー設計
- VSCodeで開いているテキストファイル（HTML等）をWYSIWYG形式でプレビューする拡張機能
- 編集や保存は行わず、**プレビュー専用**の立ち位置
- GrapesJSをWebView内で利用し、リッチな見た目で内容を確認できる
- アクティブなテキストエディタの内容をWebViewパネルに即時反映
- WebViewパネルは「Slide WYSIWYG Preview」として表示
- 保存・上書き保存などのボタンや機能は一切持たない
- ユーザーはエディタで編集→WebViewで即時プレビュー、というワークフロー
- 技術仕様：拡張機能コマンド実行時、アクティブなテキストエディタ内容を取得し、WebViewにpostMessageで送信。WebView側はwindow.addEventListener('message', ...)で受信し、GrapesJSエディタにセット。HTMLとしてパースし、body部分をGrapesJSに反映、style要素も反映。編集や保存のための通信・処理は一切行わない

## 今後の拡張案
- Markdown対応
- テンプレート選択
- Copilot連携
- 自動保存・バージョン管理

---

### 技術参考
- GrapesJS: https://grapesjs.com/
- VSCode拡張WebView: https://code.visualstudio.com/api/extension-guides/webview
