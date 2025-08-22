document.addEventListener('DOMContentLoaded', async () => {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  if (tabs.length >= 2) {
    const lastTabs = tabs.slice(-2);
    const tabIds = lastTabs.map(t => t.id);
    const groupId = await chrome.tabs.group({ tabIds });
    await chrome.tabGroups.update(groupId, { title: 'Test' });
  }
  const updatedTabs = await chrome.tabs.query({ currentWindow: true });
  const tabInfo = updatedTabs.map(t => ({ id: t.id, title: t.title }));
  document.getElementById('tab-json').textContent = JSON.stringify(tabInfo, null, 2);
});
