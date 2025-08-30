
# slide-wysiwyg

VSCode用 WYSIWYGスライドエディタ拡張機能（MVP）

## 概要
- VSCodeのWebView上でGrapesJSを使ったスライド編集が可能
- 編集内容をHTMLファイルとして保存
- 最小限のUI（GrapesJSデフォルトUI＋保存ボタン）

## 使い方
1. コマンドパレットで「Open Slide WYSIWYG Webview」を実行
2. WebView上でスライドを編集
3. 「保存」ボタンでHTMLファイルとして保存

## 開発・ビルド
```sh
npm install
npm run compile
```

F5でExtension Development Hostを起動し、動作確認可能

## 今後の拡張案
- Markdown対応
- テンプレート選択
- Copilot連携
- 自動保存・バージョン管理

---

### 技術参考
- GrapesJS: https://grapesjs.com/
- VSCode拡張WebView: https://code.visualstudio.com/api/extension-guides/webview
