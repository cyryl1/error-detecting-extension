chrome.devtools.panels.create(
  'Dev Assistant',
  'icon.png',
  'panel.html',
  (panel) => {
    panel.onShown.addListener((window) => {
      const updateUI = () => {
        chrome.runtime.sendMessage(
          { type: 'get_data', tabId: chrome.devtools.inspectedWindow.tabId },
          (response) => {
            if (!window.document.getElementById('techStack')) return; // Panel closed
            if (response.error) {
              window.document.getElementById('techStack').innerText = 'Error: ' + response.error;
              return;
            }
            window.document.getElementById('techStack').innerText = response.tech.length
              ? response.tech.join(', ')
              : 'No technologies detected';
            const errorsDiv = window.document.getElementById('errors');
            errorsDiv.innerHTML = response.errors.length
              ? response.errors.map(e => {
                  const time = new Date(e.timestamp).toLocaleTimeString();
                  if (e.type === 'network') {
                    return `<div class="error">[${time}] Network error: ${e.url} - ${e.error}</div>`;
                  } else if (e.type === 'promise') {
                    return `<div class="error">[${time}] Promise rejection: ${e.message}<br>Stack: ${e.source}</div>`;
                  } else {
                    return `<div class="error">[${time}] JS error: ${e.message} at ${e.source}:${e.line}</div>`;
                  }
                }).join('')
              : 'No errors detected';
          }
        );
      };
      window.updateUI = updateUI; // Expose for button
      setInterval(updateUI, 2000); // Poll every 2 seconds
    });
  }
);