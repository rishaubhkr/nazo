"use server"

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { createAdminClient, getLoggedInUser } from "../appwrite-server";
import { ID } from "node-appwrite";
// @ts-ignore
import { decode } from "@toon-format/toon";

// --- ENV & CONFIG ---
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const QUIZZES_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_QUIZZES_COLLECTION_ID!;
const QUIZ_ITEMS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_QUIZ_ITEMS_COLLECTION_ID!;
const FLASHCARDS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_FLASHCARDS_COLLECTION_ID!;
const FLASHCARD_ITEMS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_FLASHCARD_ITEMS_COLLECTION_ID!;

// Initialize LangChain Gemini Model
const llm = new ChatGoogleGenerativeAI({
    model: "gemini-2.0-flash",
    apiKey: process.env.GEMINI_API_KEY,
    temperature: 0.7,
    maxOutputTokens: 8192,
});

// --- HELPER TO EXTRACT TOON ---
const cleanTOON = (text: string) => {
    // Remove markdown code blocks if present
    const clean = text.replace(/```toon/g, "").replace(/```/g, "").trim();
    return clean;
};

// --- CORE ACTIONS ---

export async function generateQuizAction(
    prompt: string,
    difficulty: string,
    quantity: string,
    sourceType: "topic" | "text" = "topic",
    jwt?: string
) {
    try {
        console.log(`[AI] Generating Quiz via LangChain (TOON) | Source: ${sourceType}`);

        if (sourceType === "text" && prompt.length > 20000) {
            return await generateSplitQuiz(prompt, difficulty, parseInt(quantity), jwt);
        }

        const instructionText = sourceType === "topic"
            ? `Generate a quiz based on the provided TOPIC.`
            : `Generate a quiz STRICTLY based on the provided TEXT.`;

        const systemPrompt = `
You are an expert quiz generator. ${instructionText}
Difficulty: ${difficulty}
Target Quantity: ${quantity}

Reply with valid TOON format.
Structure:
title: String
description: String
category: String
items[${quantity}]{question,options,correctOption,explanation,hint,points}:
  "Question text","Option A|Option B|Option C|Option D","Option A","Explanation",Hint,10

Note: For options array, join them with pipe '|' in the TOON value, I will split them later. Or strictly follow TOON array syntax if possible, but simple CSV-like rows are better for TOON.
Actually, use standard TOON but make sure options are a list.
Simpler:
items[${quantity}]{question,options,correctOption,explanation,hint,points}
where 'options' is a string array like ["A","B","C","D"].

Example Output:
title: Math Quiz
description: Basic Math
category: Education
items[2]{question,options,correctOption,explanation,hint,points}:
  What is 2+2?,["3","4","5","6"],4,Simple addition,Count fingers,10
  What is 3*3?,["6","9","12","15"],9,Multiplication,Repeated addition,10
`;

        const response = await llm.invoke([
            new SystemMessage(systemPrompt),
            new HumanMessage(prompt)
        ]);

        const toonText = cleanTOON(typeof response.content === 'string' ? response.content : "");
        const data = decode(toonText);

        // Post-processing options if they came as a string (generic fix)
        // TOON decoder handles JSON arrays inside CSV rows if formatted correctly.

        return await saveQuizToDB(data, difficulty, jwt);

    } catch (error: any) {
        console.error("AI Generation Error:", error);
        return { success: false, error: error.message || "Server error during generation." };
    }
}

export async function generateFlashcardsAction(
    prompt: string,
    difficulty: string,
    quantity: string,
    sourceType: "topic" | "text" = "topic",
    jwt?: string
) {
    try {
        console.log(`[AI] Generating Flashcards via LangChain (TOON) | Source: ${sourceType}`);

        if (sourceType === "text" && prompt.length > 20000) {
            return await generateSplitFlashcards(prompt, difficulty, parseInt(quantity), jwt);
        }

        const instructionText = sourceType === "topic"
            ? `Generate flashcards based on the provided TOPIC.`
            : `Generate flashcards STRICTLY based on the provided TEXT.`;

        const systemPrompt = `
You are an expert flashcard generator. ${instructionText}
Difficulty: ${difficulty}
Target Quantity: ${quantity}

Reply with valid TOON format.
Structure:
title: String
description: String
items[${quantity}]{front,back,hint}

Example Output:
title: Biology Basics
description: Cell structure
items[2]{front,back,hint}:
  Powerhouse of cell,Mitochondria,Energy producer
  Control center,Nucleus,Contains DNA
`;

        const response = await llm.invoke([
            new SystemMessage(systemPrompt),
            new HumanMessage(prompt)
        ]);

        const toonText = cleanTOON(typeof response.content === 'string' ? response.content : "");
        const data = decode(toonText);

        return await saveFlashcardsToDB(data, difficulty, jwt);

    } catch (error: any) {
        console.error("AI Generation Error:", error);
        return { success: false, error: error.message || "Failed to generate flashcards." };
    }
}

// --- SPLIT & MERGE STRATEGIES ---

async function generateSplitQuiz(fullText: string, difficulty: string, totalQuantity: number, jwt?: string) {
    console.log("--> Triggering Split Strategy (TOON)...");

    const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 15000, chunkOverlap: 1000 });
    const chunks = await splitter.createDocuments([fullText]);
    const itemsPerChunk = Math.ceil(totalQuantity / chunks.length);

    const chunkPromises = chunks.map(async (chunk) => {
        const sysMsg = `Generate ${itemsPerChunk} questions based on this text. Difficulty: ${difficulty}. Return TOON format: items[N]{question,options,correctOption,explanation,hint,points}. Options should be JSON array string.`;
        const res = await llm.invoke([new SystemMessage(sysMsg), new HumanMessage(chunk.pageContent)]);
        const text = cleanTOON(typeof res.content === 'string' ? res.content : "");
        const json = decode(text);
        return json.items || [];
    });

    const results = await Promise.all(chunkPromises);
    const allItems = results.flat();

    // Verify format of options in case TOON decoding was partial
    // This is a safety step since LLM output varies
    // Assuming 'decode' creates objects.

    const finalQuiz = {
        title: "Long Text Quiz", // Simplified for split strategy to save a call, or add another small call if needed.
        description: "Generated from extensive context.",
        category: "General",
        items: allItems
    };

    return await saveQuizToDB(finalQuiz, difficulty, jwt);
}

async function generateSplitFlashcards(fullText: string, difficulty: string, totalQuantity: number, jwt?: string) {
    console.log("--> Triggering Split Strategy (Flashcards TOON)...");

    const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 15000, chunkOverlap: 1000 });
    const chunks = await splitter.createDocuments([fullText]);
    const itemsPerChunk = Math.ceil(totalQuantity / chunks.length);

    const chunkPromises = chunks.map(async (chunk) => {
        const sysMsg = `Generate ${itemsPerChunk} flashcards based on this text. Difficulty: ${difficulty}. Return TOON format: items[N]{front,back,hint}`;
        const res = await llm.invoke([new SystemMessage(sysMsg), new HumanMessage(chunk.pageContent)]);
        const text = cleanTOON(typeof res.content === 'string' ? res.content : "");
        const json = decode(text);
        return json.items || [];
    });

    const results = await Promise.all(chunkPromises);
    const allItems = results.flat();

    const finalDeck = {
        title: "Long Text Deck",
        description: "Generated from extensive context.",
        items: allItems
    };

    return await saveFlashcardsToDB(finalDeck, difficulty, jwt);
}


// --- DB SAVING HELPERS ---

async function saveQuizToDB(data: any, difficulty: string, jwt?: string) {
    if (!process.env.APPWRITE_API_KEY) return { success: true, data, warning: "API Key missing" };

    const user = await getLoggedInUser(jwt);
    if (!user) return { success: false, error: "Please login to save your quiz." };

    console.log("Saving to Appwrite...");
    const { database } = await createAdminClient();

    const quiz = await database.createDocument(DATABASE_ID, QUIZZES_COLLECTION_ID, ID.unique(), {
        title: data.title,
        description: data.description,
        category: data.category || "General",
        user_id: user.$id
    });

    const promises = (data.items || []).map((item: any) =>
        database.createDocument(DATABASE_ID, QUIZ_ITEMS_COLLECTION_ID, ID.unique(), {
            quiz_id: quiz.$id,
            user_id: user.$id,
            question: item.question,
            correctOption: item.correctOption,
            options: Array.isArray(item.options) ? item.options : JSON.parse(item.options || "[]"),
            hint: item.hint,
            difficulty: difficulty.toLowerCase(),
            points: Number(item.points) || 10
        })
    );

    await Promise.all(promises);
    return { success: true, data, quizId: quiz.$id };
}

async function saveFlashcardsToDB(data: any, difficulty: string, jwt?: string) {
    if (!process.env.APPWRITE_API_KEY) return { success: true, data, warning: "API Key missing" };

    const user = await getLoggedInUser(jwt);
    if (!user) return { success: false, error: "Please login to save your flashcards." };

    console.log("Saving Flashcards to Appwrite...");
    const { database } = await createAdminClient();

    const deck = await database.createDocument(DATABASE_ID, FLASHCARDS_COLLECTION_ID, ID.unique(), {
        title: data.title,
        description: data.description,
        user_id: user.$id
    });

    const promises = (data.items || []).map((item: any) =>
        database.createDocument(DATABASE_ID, FLASHCARD_ITEMS_COLLECTION_ID, ID.unique(), {
            flashcard_id: deck.$id,
            user_id: user.$id,
            front: item.front,
            back: item.back,
            hint: item.hint,
            difficulty: difficulty.toLowerCase(),
            points: 1
        })
    );

    await Promise.all(promises);
    return { success: true, data, deckId: deck.$id };
}
