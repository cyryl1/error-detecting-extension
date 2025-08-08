chrome.storage.local.get("lastSuggestion", (data) => {
    document.getElementById("output").textContent =
        data.lastSuggestion || "No errors captured yet.";
});
