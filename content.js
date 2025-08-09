// Collect webpage data for tech stack detection
function collectData() {
  const html = document.documentElement.outerHTML;
  const cookies = document.cookie;
  const jsVariables = {
    'jQuery': window.jQuery ? window.jQuery.fn.jquery : undefined,
    'React': window.React ? window.React.version : undefined,
    'elevensight': window.elevensight ? true : undefined,
    'elevensightApp': window.elevensightApp ? true : undefined
  };
  const scriptSrc = Array.from(document.getElementsByTagName('script'))
    .map(script => script.src)
    .filter(src => src);
  return { html, cookies, jsVariables, scriptSrc };
}

// Handle messages from background or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'collect_data') {
    sendResponse(collectData());
  }
});

// Monitor JavaScript errors in real-time
window.addEventListener('error', (event) => {
  const errorInfo = {
    type: 'javascript',
    message: event.message,
    source: event.filename,
    line: event.lineno,
    column: event.colno,
    stack: event.error ? event.error.stack : undefined,
    timestamp: new Date().toISOString()
  };
  chrome.runtime.sendMessage({ type: 'error_detected', error: errorInfo });
});

// Monitor unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  const errorInfo = {
    type: 'promise',
    message: event.reason.message || 'Unhandled promise rejection',
    source: event.reason.stack || 'Unknown source',
    timestamp: new Date().toISOString()
  };
  chrome.runtime.sendMessage({ type: 'error_detected', error: errorInfo });
});