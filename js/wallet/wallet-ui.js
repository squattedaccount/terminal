// Lightweight wallet picker modal for injected wallets via EIP-6963
// Usage: import { showWalletPicker } from './wallet-ui.js'
// showWalletPicker({ wallets, onSelect, onCancel })

function createStyles() {
  const styleId = 'tp-wallet-picker-styles';
  if (document.getElementById(styleId)) return;
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    .tp-wp-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 9999; }
    .tp-wp-modal { background: #0b0b0b; color: #e6f5ef; border: 1px solid #1f4037; border-radius: 10px; width: 360px; max-width: calc(100% - 24px); box-shadow: 0 12px 40px rgba(0,0,0,0.5); overflow: hidden; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .tp-wp-header { padding: 12px 14px; border-bottom: 1px solid #17332c; display:flex; align-items:center; justify-content: space-between; }
    .tp-wp-title { font-weight: 600; letter-spacing: .3px; }
    .tp-wp-close { background: transparent; color: #88e3c3; border: none; font-size: 16px; cursor: pointer; }
    .tp-wp-list { max-height: 340px; overflow: auto; }
    .tp-wp-item { display:flex; align-items:center; gap: 12px; padding: 10px 14px; cursor: pointer; border-bottom: 1px solid #112620; }
    .tp-wp-item:hover { background: #0f201c; }
    .tp-wp-icon { width: 24px; height: 24px; border-radius: 6px; background: #122823; display:flex; align-items:center; justify-content:center; font-size: 12px; color:#80e3c3; overflow:hidden; }
    .tp-wp-name { flex:1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    /* Footer removed (QR option disabled) */
  `;
  document.head.appendChild(style);
}

function renderIcon(info) {
  // EIP-6963 provides info.icon could be a URL. Use initial fallback.
  const div = document.createElement('div');
  div.className = 'tp-wp-icon';
  if (info && info.icon) {
    const img = document.createElement('img');
    img.src = info.icon;
    img.alt = info.name || 'wallet';
    img.width = 24; img.height = 24;
    img.referrerPolicy = 'no-referrer';
    img.style.display = 'block';
    div.textContent = '';
    div.appendChild(img);
  } else {
    div.textContent = '◎';
  }
  return div;
}

export function showWalletPicker({ wallets, onSelect, onCancel }) {
  createStyles();

  const backdrop = document.createElement('div');
  backdrop.className = 'tp-wp-backdrop';

  const modal = document.createElement('div');
  modal.className = 'tp-wp-modal';

  const header = document.createElement('div');
  header.className = 'tp-wp-header';
  const title = document.createElement('div');
  title.className = 'tp-wp-title';
  title.textContent = 'Connect a wallet';
  const closeBtn = document.createElement('button');
  closeBtn.className = 'tp-wp-close';
  closeBtn.textContent = '×';
  closeBtn.onclick = () => { cleanup(); if (onCancel) onCancel(); };
  header.appendChild(title);
  header.appendChild(closeBtn);

  const list = document.createElement('div');
  list.className = 'tp-wp-list';

  if (!wallets || wallets.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'tp-wp-item';
    empty.textContent = 'No injected wallets found';
    list.appendChild(empty);
  } else {
    wallets.forEach(w => {
      const item = document.createElement('div');
      item.className = 'tp-wp-item';
      const icon = renderIcon(w.info || {});
      const name = document.createElement('div');
      name.className = 'tp-wp-name';
      name.textContent = (w.info && w.info.name) ? w.info.name : 'Unknown Wallet';
      item.appendChild(icon);
      item.appendChild(name);
      item.onclick = () => { cleanup(); if (onSelect) onSelect(w); };
      list.appendChild(item);
    });
  }

  modal.appendChild(header);
  modal.appendChild(list);
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  function cleanup() {
    if (backdrop && backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
  }

  return cleanup;
}
