"use server"

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { createAdminClient, getLoggedInUser } from "../appwrite-server";
import { ID } from "node-appwrite";
import { z } from "zod";

// --- ENV & CONFIG ---
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const QUIZZES_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_QUIZZES_COLLECTION_ID!;
const QUIZ_ITEMS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_QUIZ_ITEMS_COLLECTION_ID!;
const FLASHCARDS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_FLASHCARDS_COLLECTION_ID!;
const FLASHCARD_ITEMS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_FLASHCARD_ITEMS_COLLECTION_ID!;

// Initialize LangChain Gemini Model
const llm = new ChatGoogleGenerativeAI({
    modelName: "gemini-2.0-flash",
    apiKey: process.env.GEMINI_API_KEY,
    temperature: 0.7,
    maxOutputTokens: 8192,
});

// --- ZOD SCHEMAS for Structured Output (Saves Tokens & Parsing Time) ---

const QuizItemSchema = z.object({
    question: z.string().describe("The question text"),
    options: z.array(z.string()).length(4).describe("Array of exactly 4 options"),
    correctOption: z.string().describe("The correct answer matching one option"),
    explanation: z.string().describe("Brief explanation of the answer"),
    hint: z.string().describe("A subtle clue"),
    points: z.number().default(10).describe("Points value, default 10"),
});

const QuizOutputSchema = z.object({
    title: z.string().describe("Creative title for the quiz"),
    description: z.string().describe("Short description"),
    category: z.string().describe("Topic category"),
    items: z.array(QuizItemSchema).describe("List of questions"),
});

const FlashcardItemSchema = z.object({
    front: z.string().describe("Question or term"),
    back: z.string().describe("Answer or definition"),
    hint: z.string().describe("Subtle clue"),
});

const FlashcardOutputSchema = z.object({
    title: z.string().describe("Title for the deck"),
    description: z.string().describe("Short description"),
    items: z.array(FlashcardItemSchema).describe("List of flashcards"),
});


// --- CORE ACTIONS ---

export async function generateQuizAction(
    prompt: string,
    difficulty: string,
    quantity: string,
    sourceType: "topic" | "text" = "topic",
    jwt?: string
) {
    try {
        console.log(`[AI] Generating Quiz via LangChain (Structured) | Source: ${sourceType}`);

        if (sourceType === "text" && prompt.length > 20000) {
            return await generateSplitQuiz(prompt, difficulty, parseInt(quantity), jwt);
        }

        const instructionText = sourceType === "topic"
            ? `Generate a quiz based on the provided TOPIC.`
            : `Generate a quiz STRICTLY based on the provided TEXT.`;

        const structuredLlm = llm.withStructuredOutput(QuizOutputSchema);

        const response = await structuredLlm.invoke([
            new SystemMessage(`You are a quiz generator. ${instructionText} Difficulty: ${difficulty}. Amount: ${quantity}.`),
            new HumanMessage(prompt)
        ]);

        return await saveQuizToDB(response, difficulty, jwt);

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
        console.log(`[AI] Generating Flashcards via LangChain (Structured) | Source: ${sourceType}`);

        if (sourceType === "text" && prompt.length > 20000) {
            return await generateSplitFlashcards(prompt, difficulty, parseInt(quantity), jwt);
        }

        const instructionText = sourceType === "topic"
            ? `Generate flashcards based on the provided TOPIC.`
            : `Generate flashcards STRICTLY based on the provided TEXT.`;

        const structuredLlm = llm.withStructuredOutput(FlashcardOutputSchema);

        const response = await structuredLlm.invoke([
            new SystemMessage(`You are a flashcard generator. ${instructionText} Difficulty: ${difficulty}. Amount: ${quantity}.`),
            new HumanMessage(prompt)
        ]);

        return await saveFlashcardsToDB(response, difficulty, jwt);

    } catch (error: any) {
        console.error("AI Generation Error:", error);
        return { success: false, error: error.message || "Failed to generate flashcards." };
    }
}

// --- SPLIT & MERGE STRATEGIES (Updated for Structured Output) ---

async function generateSplitQuiz(fullText: string, difficulty: string, totalQuantity: number, jwt?: string) {
    console.log("--> Triggering Split Strategy (Structured)...");

    const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 15000, chunkOverlap: 1000 });
    const chunks = await splitter.createDocuments([fullText]);
    const itemsPerChunk = Math.ceil(totalQuantity / chunks.length);

    console.log(`--> Split into ${chunks.length} chunks. Generating ~${itemsPerChunk} items per chunk.`);

    // Define a schema just for items to save overhead
    const ChunkSchema = z.object({
        items: z.array(QuizItemSchema)
    });
    const structuredChunkLlm = llm.withStructuredOutput(ChunkSchema);

    const chunkPromises = chunks.map(chunk =>
        structuredChunkLlm.invoke([
            new SystemMessage(`Generate ${itemsPerChunk} questions based on this text. Difficulty: ${difficulty}.`),
            new HumanMessage(chunk.pageContent)
        ])
    );

    const results = await Promise.all(chunkPromises);
    const allItems = results.flatMap(r => r?.items || []);

    // Generate Header
    const HeaderSchema = z.object({ title: z.string(), description: z.string(), category: z.string() });
    const headRes = await llm.withStructuredOutput(HeaderSchema).invoke([
        new SystemMessage("Generate metadata for a quiz based on this text."),
        new HumanMessage(chunks[0].pageContent.slice(0, 5000))
    ]);

    const finalQuiz = {
        title: headRes?.title || "Long Text Quiz",
        description: headRes?.description || "Generated from extensive notes.",
        category: headRes?.category || "General",
        items: allItems
    };

    return await saveQuizToDB(finalQuiz, difficulty, jwt);
}

async function generateSplitFlashcards(fullText: string, difficulty: string, totalQuantity: number, jwt?: string) {
    console.log("--> Triggering Split Strategy (Flashcards Styled)...");

    const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 15000, chunkOverlap: 1000 });
    const chunks = await splitter.createDocuments([fullText]);
    const itemsPerChunk = Math.ceil(totalQuantity / chunks.length);

    const ChunkSchema = z.object({ items: z.array(FlashcardItemSchema) });
    const structuredChunkLlm = llm.withStructuredOutput(ChunkSchema);

    const chunkPromises = chunks.map(chunk =>
        structuredChunkLlm.invoke([
            new SystemMessage(`Generate ${itemsPerChunk} flashcards based on this text. Difficulty: ${difficulty}.`),
            new HumanMessage(chunk.pageContent)
        ])
    );

    const results = await Promise.all(chunkPromises);
    const allItems = results.flatMap(r => r?.items || []);

    const HeaderSchema = z.object({ title: z.string(), description: z.string() });
    const headRes = await llm.withStructuredOutput(HeaderSchema).invoke([
        new SystemMessage("Generate metadata for a flashcard deck based on this text."),
        new HumanMessage(chunks[0].pageContent.slice(0, 5000))
    ]);

    const finalDeck = {
        title: headRes?.title || "Long Text Deck",
        description: headRes?.description || "Generated from extensive notes.",
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
        category: data.category,
        user_id: user.$id
    });

    const promises = data.items.map((item: any) =>
        database.createDocument(DATABASE_ID, QUIZ_ITEMS_COLLECTION_ID, ID.unique(), {
            quiz_id: quiz.$id,
            user_id: user.$id,
            question: item.question,
            correctOption: item.correctOption,
            options: item.options,
            hint: item.hint,
            difficulty: difficulty.toLowerCase(),
            points: item.points || 10
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

    const promises = data.items.map((item: any) =>
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
