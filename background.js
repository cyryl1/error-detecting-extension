let technologies = {};
let errors = {}; // Store errors by tabId

// Load technologies data
fetch(chrome.runtime.getURL('technologies.json'))
  .then(response => {
    if (!response.ok) throw new Error(`Failed to fetch technologies.json: ${response.status}`);
    return response.text(); // Get raw text for better error context
  })
  .then(text => {
    try {
      technologies = JSON.parse(text);
      console.log('Technologies loaded:', Object.keys(technologies).length, 'entries');
    } catch (e) {
      console.error('Failed to parse technologies.json:', e, '\nRaw content:', text.substring(0, 500)); // Log first 500 chars
      throw e;
    }
  })
  .catch(err => {
    console.error('Failed to load technologies:', err);
    technologies = {}; // Ensure empty object to prevent crashes
  });

// Handle messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab ? sender.tab.id : message.tabId;

  if (message.type === 'get_data') {
    chrome.scripting.executeScript(
      {
        target: { tabId: tabId },
        func: collectData
      },
      (results) => {
        if (chrome.runtime.lastError || !results || !results[0]) {
          console.error('Script execution error:', chrome.runtime.lastError || 'No results');
          sendResponse({ error: 'Failed to collect data' });
          return;
        }

        const result = results[0].result;
        if (result.error) {
          console.error('Content script error:', result.error);
          sendResponse({ error: result.error });
          return;
        }

        const { html, cookies, jsVariables, scriptSrc, metaTags } = result;
        let headers = {};
        chrome.webRequest.onHeadersReceived.addListener(
          (details) => {
            if (details.tabId === tabId) {
              headers = details.responseHeaders.reduce((acc, header) => {
                acc[header.name.toLowerCase()] = header.value;
                return acc;
              }, {});
              console.log('Headers collected for tab', tabId, ':', headers);
            }
          },
          { urls: ["<all_urls>", "http://localhost/*", "file:///*"] },
          ['responseHeaders', 'extraHeaders']
        );

        const detectedTech = matchTechnologies(html, cookies, jsVariables, headers, scriptSrc, metaTags);
        console.log('Detected technologies:', detectedTech);
        const tabErrors = errors[tabId] || [];
        sendResponse({ tech: detectedTech, errors: tabErrors });
      }
    );
    return true; // Keep message channel open for async response
  } else if (message.type === 'error_detected') {
    if (!errors[tabId]) errors[tabId] = [];
    errors[tabId].push(message.error);
    console.log('Error detected:', message.error);
  } else if (message.type === 'clear_errors') {
    errors[tabId] = [];
    sendResponse({ status: 'errors cleared' });
  }
});

// Monitor network errors
chrome.webRequest.onErrorOccurred.addListener(
  (details) => {
    const tabId = details.tabId;
    if (tabId !== -1) {
      if (!errors[tabId]) errors[tabId] = [];
      errors[tabId].push({
        type: 'network',
        url: details.url,
        error: details.error,
        timestamp: new Date().toISOString()
      });
      console.log('Network error captured:', details);
    }
  },
  { urls: ["<all_urls>", "http://localhost/*", "file:///*"] },
  ['extraHeaders']
);

// Clear errors when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  delete errors[tabId];
});

// Tech stack matching function
function matchTechnologies(html, cookies, jsVariables, headers, scriptSrc, metaTags) {
  const detected = new Set();
  if (!technologies || Object.keys(technologies).length === 0) {
    console.warn('No technologies loaded');
    return [];
  }
  for (const [techName, tech] of Object.entries(technologies)) {
    let match = false;
    try {
      if (tech.html) {
        for (const pattern of Array.isArray(tech.html) ? tech.html : [tech.html]) {
          if (new RegExp(pattern, 'i').test(html)) {
            match = true;
            console.log(`Matched ${techName} on html: ${pattern}`);
            break;
          }
        }
      }
      if (!match && tech.js) {
        for (const [varName, pattern] of Object.entries(tech.js)) {
          if (jsVariables[varName] && (pattern === '' || new RegExp(pattern, 'i').test(jsVariables[varName]))) {
            match = true;
            console.log(`Matched ${techName} on js: ${varName}`);
            break;
          }
        }
      }
      if (!match && tech.cookies) {
        for (const [cookieName, pattern] of Object.entries(tech.cookies)) {
          const cookieValue = getCookieValue(cookies, cookieName);
          if (cookieValue && (pattern === '' || new RegExp(pattern, 'i').test(cookieValue))) {
            match = true;
            console.log(`Matched ${techName} on cookie: ${cookieName}`);
            break;
          }
        }
      }
      if (!match && tech.headers) {
        for (const [headerName, pattern] of Object.entries(tech.headers)) {
          const headerValue = headers[headerName.toLowerCase()];
          if (headerValue && new RegExp(pattern, 'i').test(headerValue)) {
            match = true;
            console.log(`Matched ${techName} on header: ${headerName}`);
            break;
          }
        }
      }
      if (!match && tech.scriptSrc) {
        for (const pattern of Array.isArray(tech.scriptSrc) ? tech.scriptSrc : [tech.scriptSrc]) {
          if (scriptSrc.some(src => new RegExp(pattern, 'i').test(src))) {
            match = true;
            console.log(`Matched ${techName} on scriptSrc: ${pattern}`);
            break;
          }
        }
      }
      if (!match && tech.meta) {
        for (const [metaName, pattern] of Object.entries(tech.meta)) {
          const metaValue = metaTags[metaName];
          if (metaValue && new RegExp(pattern, 'i').test(metaValue)) {
            match = true;
            console.log(`Matched ${techName} on meta: ${metaName}`);
            break;
          }
        }
      }
      if (match) {
        detected.add(techName);
        if (tech.implies) {
          tech.implies.forEach(impliedTech => {
            detected.add(impliedTech);
            console.log(`Implied ${impliedTech} from ${techName}`);
          });
        }
      }
    } catch (e) {
      console.error(`Error matching ${techName}:`, e);
    }
  }
  return Array.from(detected);
}

function getCookieValue(cookies, name) {
  try {
    const match = cookies.match(new RegExp(`(^|;\\s*)(${name})=([^;]*)`));
    return match ? decodeURIComponent(match[3]) : null;
  } catch (e) {
    console.error('Error parsing cookie:', name, e);
    return null;
  }
}

// Function to be injected by chrome.scripting.executeScript
function collectData() {
  try {
    return {
      html: document.documentElement.outerHTML,
      cookies: document.cookie,
      jsVariables: {
        'jQuery': window.jQuery ? window.jQuery.fn.jquery : undefined,
        'React': window.React ? window.React.version : undefined,
        'elevensight': window.elevensight ? true : undefined,
        'elevensightApp': window.elevensightApp ? true : undefined,
        '__NEXT_DATA__': window.__NEXT_DATA__ ? true : undefined
      },
      scriptSrc: Array.from(document.getElementsByTagName('script'))
        .map(script => script.src)
        .filter(src => src),
      metaTags: Array.from(document.getElementsByTagName('meta'))
        .reduce((acc, meta) => {
          if (meta.name && meta.content) acc[meta.name] = meta.content;
          return acc;
        }, {})
    };
  } catch (e) {
    console.error('Error in injected collectData:', e);
    return { error: e.message };
  }
}