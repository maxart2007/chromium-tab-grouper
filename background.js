async function saveCurrentOrder() {
  const tabs = (await chrome.tabs.query({ currentWindow: true })).filter(t => !t.pinned);
  const state = {
    tabs: tabs.map(t => ({ id: t.id, index: t.index, groupId: t.groupId }))
  };
  const groupIds = [...new Set(state.tabs.map(t => t.groupId).filter(id => id > -1))];
  const groups = {};
  for (const gid of groupIds) {
    try {
      const g = await chrome.tabGroups.get(gid);
      groups[gid] = { title: g.title || '', color: g.color };
    } catch (e) {
      console.error('Failed to get group info', e);
    }
  }
  state.groups = groups;
  await chrome.storage.local.set({ prevState: state });
  return { tabs, tabInfo: tabs.map(t => ({ id: t.id, title: t.title, url: t.url })) };
}

async function groupTabs() {
  const { apiKey, context } = await chrome.storage.sync.get(['apiKey', 'context']);
  if (!apiKey) {
    console.error('API key not set.');
    return;
  }

  const { tabs, tabInfo } = await saveCurrentOrder();

  const task = `Ты получишь список вкладок в формате JSON. Отсортируй и сгруппируй их, вернув массив объектов вида { "title": "имя", "tabs": [id...] }.\n` +
    `Каждый tab ID должен встретиться ровно один раз.\n` +
    `Никаких других полей и текста. Никакого \`\`\` или форматирования.\n` +
    `Названия групп делай как можно короче, лучше одно слово.\n` +
    `Контекст от пользователя: ${context || ''}`;

  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: `${task}\n\n${JSON.stringify(tabInfo, null, 2)}` }
        ]
      }
    ]
  };

  const model = 'gemini-2.5-flash';
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (res.ok && data.candidates?.length) {
      let text = data.candidates[0].content.parts.map(p => p.text || '').join('');
      const fenceMatch = text.match(/```(?:json)?([\s\S]*?)```/i);
      if (fenceMatch) {
        text = fenceMatch[1];
      } else {
        const bracketMatch = text.match(/\[[\s\S]*\]/);
        if (bracketMatch) {
          text = bracketMatch[0];
        }
      }
      text = text.trim();
      try {
        let parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          parsed = parsed.map(item =>
            typeof item === 'string' ? JSON.parse(item) : item
          );
        } else if (parsed && typeof parsed === 'object') {
          parsed = Object.entries(parsed).map(([title, tabs]) => ({ title, tabs }));
        }
        const allIds = tabs.map(t => t.id);
        const orderedIds = [];
        let valid = Array.isArray(parsed);
        if (valid) {
          for (const grp of parsed) {
            if (!grp || !Array.isArray(grp.tabs)) {
              valid = false;
              break;
            }
            for (const id of grp.tabs) {
              if (typeof id !== 'number') {
                valid = false;
                break;
              }
              orderedIds.push(id);
            }
            if (!valid) break;
          }
        }
        const seen = new Set(orderedIds);
        if (!valid || seen.size !== allIds.length || !allIds.every(id => seen.has(id))) {
          console.error('Invalid response from AI.', text);
          return;
        }

        await chrome.tabs.ungroup(allIds);
        for (let i = 0; i < orderedIds.length; i++) {
          await chrome.tabs.move(orderedIds[i], { index: i });
        }
        for (const grp of parsed) {
          const groupId = await chrome.tabs.group({ tabIds: grp.tabs });
          await chrome.tabGroups.update(groupId, { title: grp.title || '' });
        }
      } catch (e) {
        console.error('Error parsing AI response', e);
      }
    } else {
      console.error(data.error?.message || 'No response from AI.');
    }
  } catch (e) {
    console.error('Error contacting AI.', e);
  }
}

async function restoreTabs() {
  const { prevState } = await chrome.storage.local.get('prevState');
  if (!prevState) return;
  const currentTabs = await chrome.tabs.query({ currentWindow: true });
  const currentIds = new Set(currentTabs.map(t => t.id));
  const toRestore = prevState.tabs.filter(t => currentIds.has(t.id));
  const allIds = toRestore.map(t => t.id);
  await chrome.tabs.ungroup(allIds);
  toRestore.sort((a, b) => a.index - b.index);
  for (const tab of toRestore) {
    await chrome.tabs.move(tab.id, { index: tab.index });
  }
  const groups = {};
  for (const tab of toRestore) {
    if (tab.groupId > -1) {
      if (!groups[tab.groupId]) groups[tab.groupId] = [];
      groups[tab.groupId].push(tab.id);
    }
  }
  for (const [gid, ids] of Object.entries(groups)) {
    const newId = await chrome.tabs.group({ tabIds: ids });
    const info = prevState.groups?.[gid];
    if (info) {
      await chrome.tabGroups.update(newId, { title: info.title || '', color: info.color });
    }
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'group-tabs',
    title: 'Group my tabs magically',
    contexts: ['action']
  });
  chrome.contextMenus.create({
    id: 'restore-tabs',
    title: 'Restore old order',
    contexts: ['action']
  });
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === 'group-tabs') {
    groupTabs();
  } else if (info.menuItemId === 'restore-tabs') {
    restoreTabs();
  }
});
