[Web App] 
   ↓  (errors captured by injected script)
[Content Script]
   ↓  (message passing)
[Background Service Worker]
   ↓  (calls AI API with error info)
[AI Service / API]
   ↓
[Background Service Worker]
   ↓
[Popup UI / DevTools Panel]
   ↓
[Developer sees explanation & fix suggestion]

Core components:

    Content Script: Injects JS into the page to hook into window.onerror & console.error.

    Background Service Worker: Handles AI requests & stores history.

    Popup UI: Where you see the latest errors + suggestions.

    Optional DevTools Panel: Integrated into browser DevTools for a smoother debugging experience.
