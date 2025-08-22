document.addEventListener('DOMContentLoaded', async () => {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const tabInfo = tabs.map(t => ({ id: t.id, title: t.title, url: t.url }));
  const pre = document.getElementById('tab-json');
  pre.textContent = JSON.stringify(tabInfo, null, 2);

  document.getElementById('ask-ai').addEventListener('click', async () => {
    pre.textContent = 'Обращение к ИИ...';
    const { apiKey, context } = await chrome.storage.sync.get(['apiKey', 'context']);
    if (!apiKey) {
      pre.textContent = 'API key not set.';
      return;
    }
    const task = `Твоя задача ознакомиться со списком вкладок в формате JSON и предложить свою сортировку исходя из контекста, который предоставит пользователь. Вернуть ты должен такой же JSON, как исходный, но без названий вкладок, нам нужны только ID, но с нужным порядком вкладок и группировкой. Не нужно никакого форматирования, не нужно ничего кроме JSON, ничего до и ничего после. Названия групп должны быть максимально короткие и желательно односложные. Контекст от пользователя: ${context || ''}`;

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
        const text = data.candidates[0].content.parts.map(p => p.text || '').join('');
        try {
          const parsed = JSON.parse(text);
          const allIds = tabs.map(t => t.id);
          const seen = new Set();
          let valid = Array.isArray(parsed);
          const orderedIds = [];
          if (valid) {
            for (const grp of parsed) {
              if (typeof grp !== 'object' || typeof grp.title !== 'string' || !Array.isArray(grp.tabs)) {
                valid = false;
                break;
              }
              for (const id of grp.tabs) {
                if (typeof id !== 'number' || !allIds.includes(id) || seen.has(id)) {
                  valid = false;
                  break;
                }
                seen.add(id);
                orderedIds.push(id);
              }
              if (!valid) break;
            }
          }
          if (!valid || seen.size !== allIds.length) {
            pre.textContent = 'Некорректный ответ от ИИ.';
            return;
          }

          pre.textContent = JSON.stringify(parsed, null, 2);

          await chrome.tabs.ungroup(allIds);
          for (let i = 0; i < orderedIds.length; i++) {
            await chrome.tabs.move(orderedIds[i], { index: i });
          }
          for (const grp of parsed) {
            const groupId = await chrome.tabs.group({ tabIds: grp.tabs });
            await chrome.tabGroups.update(groupId, { title: grp.title });
          }
        } catch (e) {
          pre.textContent = text;
        }
      } else {
        pre.textContent = data.error?.message || 'No response from AI.';
      }
    } catch (e) {
      pre.textContent = 'Error contacting AI.';
    }
  });
});
