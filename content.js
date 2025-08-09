// Log to confirm script is running
console.log('Content script running on', window.location.href);

// Collect webpage data for tech stack detection
function collectData() {
  try {
    const html = document.documentElement.outerHTML;
    const cookies = document.cookie;
    const jsVariables = {
      'jQuery': window.jQuery ? window.jQuery.fn.jquery : undefined,
      'React': window.React ? window.React.version : undefined,
      'elevensight': window.elevensight ? true : undefined,
      'elevensightApp': window.elevensightApp ? true : undefined,
      '__NEXT_DATA__': window.__NEXT_DATA__ ? true : undefined
    };
    const scriptSrc = Array.from(document.getElementsByTagName('script'))
      .map(script => script.src)
      .filter(src => src);
    const metaTags = Array.from(document.getElementsByTagName('meta'))
      .reduce((acc, meta) => {
        if (meta.name && meta.content) acc[meta.name] = meta.content;
        return acc;
      }, {});
    const data = { html, cookies, jsVariables, scriptSrc, metaTags };
    console.log('Collected data:', data);
    return data;
  } catch (e) {
    console.error('Error collecting data:', e);
    return { error: e.message };
  }
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
  console.log('JS error captured:', errorInfo);
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
  console.log('Promise error captured:', errorInfo);
  chrome.runtime.sendMessage({ type: 'error_detected', error: errorInfo });
});

// Override console.error to capture React hydration errors
(function(originalConsoleError) {
  console.error = function(...args) {
    const message = args.join(' ');
    if (message.includes('hydration') || message.includes('Hydration')) {
      const errorInfo = {
        type: 'console',
        message: message,
        source: 'console.error',
        timestamp: new Date().toISOString()
      };
      console.log('Console error captured:', errorInfo);
      chrome.runtime.sendMessage({ type: 'error_detected', error: errorInfo });
    }
    originalConsoleError.apply(console, args);
  };
})(console.error);