// popup/toast.js — Global Toast Notification for Popup
let _toastTimer = null;

export function showToast(msg, type = 'success', durationMs = 2500) {
  if (_toastTimer) { clearTimeout(_toastTimer); }
  let el = document.getElementById('antToast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'antToast';
    document.body.appendChild(el);
  }
  el.className = type === 'error' ? 'toast-error' : 'toast-success';
  el.innerHTML = `<span class="material-symbols-rounded" style="font-size:14px;">${type === 'error' ? 'error' : 'check_circle'}</span> ${msg}`;
  el.style.display = 'flex';
  
  _toastTimer = setTimeout(() => {
    el.classList.add('hiding');
    setTimeout(() => { el.style.display = 'none'; el.classList.remove('hiding'); }, 220);
  }, durationMs);
}
