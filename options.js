document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get(['apiKey', 'context'], (items) => {
    document.getElementById('apiKey').value = items.apiKey || '';
    document.getElementById('context').value = items.context || '';
  });
  document.getElementById('save').addEventListener('click', () => {
    const apiKey = document.getElementById('apiKey').value;
    const context = document.getElementById('context').value;
    chrome.storage.sync.set({ apiKey, context }, () => {
      const status = document.getElementById('status');
      status.textContent = 'Saved';
      setTimeout(() => {
        status.textContent = '';
      }, 1000);
    });
  });
});
