const vscode = (typeof acquireVsCodeApi === 'function') ? acquireVsCodeApi() : null;
let editor;
let isSyncing = false;
let skipNextUpdate = 0;
let currentPageIndex = 0;
let pages = [];
function logDebug(...args) { try { console.log('[slide-wysiwyg]', ...args); } catch(e) {} }
// サムネイル一覧描画
function renderThumbList() {
  const thumbList = document.getElementById('thumb-list');
  thumbList.innerHTML = '';
  pages.forEach((page, idx) => {
    const div = document.createElement('div');
    div.className = 'thumb-item' + (currentPageIndex === idx ? ' selected' : '');
    div.dataset.idx = idx;
    div.innerHTML = `<div class="thumb-index">${idx+1}頁</div><div class="thumb-preview">${page.previewHtml.replace(/<[^>]+>/g, '').slice(0, 30)}</div>`;
    div.onclick = () => selectPage(idx);
    thumbList.appendChild(div);
  });
}
// ページ選択
function selectPage(idx) {
  if (idx < 0 || idx >= pages.length) return;
  currentPageIndex = idx;
  renderThumbList();
  document.getElementById('current-page').textContent = (idx+1).toString();
  // ページ内容取得
  if (vscode) {
    vscode.postMessage({ type: 'getPageContent', pageIndex: idx });
  }
}
window.addEventListener('DOMContentLoaded', function() {
  logDebug('DOMContentLoaded');
  editor = grapesjs.init({
    container: '#gjs',
    height: '70vh',
    fromElement: false,
    storageManager: false,
    blockManager: { appendTo: '#gjs' }
  });
  logDebug('GrapesJS initialized', editor);
  // サムネイル一覧取得
  if (vscode) {
    vscode.postMessage({ type: 'getPages' });
  }
  // 編集内容が変わるたびに即時保存
  editor.on('update', function() {
    if (isSyncing) return;
    if (skipNextUpdate > 0) { skipNextUpdate--; return; }
    const html = editor.getHtml();
    if (vscode) {
      vscode.postMessage({ type: 'savePageContent', pageIndex: currentPageIndex, content: html });
    }
  });
});
// メッセージ受信
window.addEventListener('message', event => {
  const msg = event.data;
  logDebug('window message', msg);
  if (msg && msg.type === 'pages' && Array.isArray(msg.pages)) {
    pages = msg.pages;
    if (pages.length > 0) {
      selectPage(0);
    } else {
      document.getElementById('gjs').innerHTML = '<h2>ページがありません</h2>';
      document.getElementById('current-page').textContent = '-';
    }
    renderThumbList();
  } else if (msg && msg.type === 'pageContent' && typeof msg.pageIndex === 'number') {
    isSyncing = true;
    try {
      skipNextUpdate++;
      editor.setComponents(msg.content);
    } finally {
      isSyncing = false;
    }
  } else if (msg && msg.type === 'saved') {
    // 保存完了通知（必要ならUI反映）
  }
});
