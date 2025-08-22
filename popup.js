document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('sortBtn');
  const img = document.getElementById('statusImage');

  function showImage(path) {
    img.src = path;
    img.style.display = 'block';
  }

  btn.addEventListener('click', () => {
    btn.style.display = 'none';
    showImage('src/test.gif');

    chrome.runtime.sendMessage({ type: 'groupTabs' }, (response) => {
      if (chrome.runtime.lastError || !response || response.status !== 'success') {
        showImage('src/error.gif');
        return;
      }
      showImage('src/success.gif');
    });
  });
});
