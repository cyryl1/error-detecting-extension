import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: "AIzaSyCz7lHPgOm0ZuiIrZ3ZtxDRUFFJ0JhdQ6U" });

// AIzaSyCz7lHPgOm0ZuiIrZ3ZtxDRUFFJ0JhdQ6U

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "ERROR_CAPTURED") {
        handleError(request);
    }
});

async function handleError(errorData) {
    const prompt = `You are a frontend debugging assistant.
    Here's an error: ${errorData.message} \n
    Stack: ${errorData.stack}\n
    Suggest a fix with explanation.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });

        const suggestion = await response.response.text();

        chrome.storage.local.set({ lastSuggestion: suggestion });
    } catch (err) {
        console.error("Gemini API Error:", err);
    }
}