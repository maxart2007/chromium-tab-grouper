document.addEventListener('DOMContentLoaded', async () => {
  const tabs = (await chrome.tabs.query({ currentWindow: true })).filter(t => !t.pinned);
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
            pre.textContent = 'Некорректный ответ от ИИ. \n'+text;
            return;
          }

          pre.textContent = JSON.stringify(parsed, null, 2);

          await chrome.tabs.ungroup(allIds);
          for (let i = 0; i < orderedIds.length; i++) {
            await chrome.tabs.move(orderedIds[i], { index: i });
          }
          for (const grp of parsed) {
            const groupId = await chrome.tabs.group({ tabIds: grp.tabs });
            await chrome.tabGroups.update(groupId, { title: grp.title || '' });
          }
        } catch (e) {
          console.error(e);
          pre.textContent = 'Ошибка при группировке вкладок: ' + (e.message || '');
        }
      } else {
        pre.textContent = data.error?.message || 'No response from AI.';
      }
    } catch (e) {
      pre.textContent = 'Error contacting AI.';
    }
  });
});
