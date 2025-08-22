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
    const task = `Твоя задача ознакомиться со списком вкладок в формате JSON и предложить свою сортировку исходя из контекста, который предоставит пользователь. Вернуть ты должен такой же JSON, как исходный, но с нужным порядком вкладок и группировкой. Названия групп должны быть максимально короткие и желательно односложные. Контекст от пользователя: ${context || ''}`;
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
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from AI.';
      try {
        const parsed = JSON.parse(text);
        pre.textContent = JSON.stringify(parsed, null, 2);
      } catch (e) {
        pre.textContent = text;
      }
    } catch (e) {
      pre.textContent = 'Error contacting AI.';
    }
  });
});
