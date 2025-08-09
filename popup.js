function updateUI() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0].id;
    chrome.runtime.sendMessage({ type: 'get_data', tabId: tabId }, (response) => {
      if (response.error) {
        document.getElementById('techStack').innerText = 'Error: ' + response.error;
        return;
      }
      document.getElementById('techStack').innerText = response.tech.length
        ? response.tech.join(', ')
        : 'No technologies detected';
      
      const errorsDiv = document.getElementById('errors');
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
    });
  });
}

document.getElementById('refresh').addEventListener('click', updateUI);
document.getElementById('clear').addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.runtime.sendMessage({ type: 'clear_errors', tabId: tabs[0].id }, () => {
      updateUI();
    });
  });
});

// Initial update
updateUI();

// Poll for new errors every 2 seconds
setInterval(updateUI, 2000);