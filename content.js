// Capture runtime errors
window.addEventListener("error", (event) => {
    chrome.runtime.sendMessage({
        type: "ERROR_CAPTURED",
        message: event.message,
        file: event.filename,
        line: event.lineno,
        col: event.colno,
        stack: event.error?.stack
    });
});

// Capture unhandled promise rejections
window.addEventListener("unhandledrejection", (event) => {
    chrome.runtime.sendMessage({
        type: "ERROR_CAPTURED",
        message: event.reason?.message || "Unhandled Promise rejection",
        stack: event.reason?.stack
    });
});
