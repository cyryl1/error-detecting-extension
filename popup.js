function updateUI() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0].id;
    chrome.runtime.sendMessage({ type: 'get_data', tabId: tabId }, (response) => {
      const techStackDiv = document.getElementById('techStack');
      if (response.error || !response.tech) {
        techStackDiv.innerText = `Error: ${response.error || 'Invalid response from background script'}`;
        techStackDiv.classList.add('error');
        return;
      }
      techStackDiv.innerText = response.tech.length
        ? response.tech.join(', ')
        : 'No technologies detected';
      techStackDiv.classList.remove('error');
      
      const errorsDiv = document.getElementById('errors');
      if (!response.errors || !Array.isArray(response.errors)) {
        errorsDiv.innerHTML = 'No errors detected';
        return;
      }
      errorsDiv.innerHTML = response.errors.length
        ? response.errors.map(e => {
            const time = new Date(e.timestamp || new Date()).toLocaleTimeString();
            const message = e.message || 'Unknown error';
            const isHydration = typeof message === 'string' && (message.includes('hydration') || message.includes('Hydration'));
            if (e.type === 'network') {
              return `<div class="error"><span class="timestamp">[${time}]</span> Network error: ${e.url || 'Unknown URL'} - ${e.error || 'Unknown error'}</div>`;
            } else if (e.type === 'promise') {
              return `<div class="error ${isHydration ? 'hydration' : ''}"><span class="timestamp">[${time}]</span> Promise rejection: ${message}<br>Stack: ${e.source || 'Unknown source'}</div>`;
            } else if (e.type === 'console') {
              return `<div class="error console"><span class="timestamp">[${time}]</span> Console error: ${message}<br>Source: ${e.source || 'Unknown source'}</div>`;
            } else {
              return `<div class="error ${isHydration ? 'hydration' : ''}"><span class="timestamp">[${time}]</span> JS error: ${message} at ${e.source || 'Unknown source'}:${e.line || 'N/A'}</div>`;
            }
          }).join('')
        : 'No errors detected';
    });
  });
}

// Toggle section visibility
function toggleSection(headerId, sectionId) {
  const header = document.getElementById(headerId);
  const section = document.getElementById(sectionId);
  header.addEventListener('click', () => {
    section.classList.toggle('collapsed');
    header.classList.toggle('collapsed');
  });
}

toggleSection('techHeader', 'techStack');
toggleSection('errorsHeader', 'errors');

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