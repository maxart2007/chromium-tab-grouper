chrome.action.onClicked.addListener(async () => {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  if (tabs.length < 2) {
    return;
  }
  const lastTabs = tabs.slice(-2);
  const tabIds = lastTabs.map(t => t.id);
  const groupId = await chrome.tabs.group({ tabIds });
  await chrome.tabGroups.update(groupId, { title: 'Test' });
});
