document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get('apiKey', (items) => {
    document.getElementById('apiKey').value = items.apiKey || '';
  });
  document.getElementById('save').addEventListener('click', () => {
    const apiKey = document.getElementById('apiKey').value;
    chrome.storage.sync.set({ apiKey }, () => {
      const status = document.getElementById('status');
      status.textContent = 'Saved';
      setTimeout(() => {
        status.textContent = '';
      }, 1000);
    });
  });
});
