# Puter.js Integration

We have integrated **Puter.js** to replace the direct server-side Gemini API calls. This allows for **free, unlimited access** to Gemini models without burning through your API credits.

## Key Changes

1.  **Client-Side Generation**: AI generation now happens in the browser using `window.puter.ai.chat`.
2.  **Server-Side Saving**: We created new server actions (`processAndSaveQuiz`, `processAndSaveFlashcards`) that simply take the generated content, validate it, and save it to the database.
3.  **Layout Update**: The `app/layout.tsx` now includes the Puter.js script tag.

## How to use

The API works automatically. No API keys are required for the AI generation part.
Appwrite API keys are still used for database storage.

## Limitations

- The "Split Strategy" for very long texts (>20,000 characters) is currently disabled in this version, as it relied on server-side text splitters. If you need to process massive texts, we can look into a client-side text splitter or a hybrid approach.
