"use server"

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

import { createAdminClient, getLoggedInUser } from "../appwrite-server";
import { ID } from "node-appwrite";

// Define IDs - Users should update these in .env
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const QUIZZES_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_QUIZZES_COLLECTION_ID!;
const QUIZ_ITEMS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_QUIZ_ITEMS_COLLECTION_ID!;

export async function generateQuizAction(prompt: string, difficulty: string, quantity: string, sourceType: "topic" | "text" = "topic", jwt?: string) {
    try {
        // ... (existing prompt logic) ...
        let instructionText = "";
        if (sourceType === "topic") {
            instructionText = `Generate a quiz based on the provided TOPIC. Use your internal knowledge base to create relevant and accurate questions suitable for the specified difficulty.`;
        } else {
            instructionText = `Generate a quiz STRICTLY based on the provided TEXT. Do not use external knowledge or add information not present in the text. If the text is insufficient, create the best possible questions from what is available.`;
        }

        const systemInstruction = `
      You are an expert quiz generator. ${instructionText}
      Difficulty: ${difficulty}
      Number of questions: ${quantity}
      
      Format the output as a JSON object with:
      - title: A creative title for the quiz.
      - description: A short description (max 1 sentence).
      - category: The general topic (e.g., Science, History).
      - items: An array of questions ("items"). Each item must have:
        - question: The question text.
        - options: An array of 4 possible answers.
        - correctOption: The correct answer text (must match one of the options).
        - explanation: A brief explanation.
        - hint: A subtle clue.
        - points: Integer (default 1).

      Return ONLY the JSON object. No markdown, no extra text.
    `;

        const result = await model.generateContent([systemInstruction, prompt]);
        const response = await result.response;
        const text = response.text();

        // Clean potential markdown artifacts
        const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();

        try {
            const jsonResponse = JSON.parse(cleanedText);
            console.log("--- GENERATED QUIZ JSON ---");
            console.log(JSON.stringify(jsonResponse, null, 2));

            // Save to Appwrite
            if (process.env.APPWRITE_API_KEY && DATABASE_ID && QUIZZES_COLLECTION_ID) {
                console.log("Saving to Appwrite...");
                const user = await getLoggedInUser(jwt);
                if (!user) {
                    console.error("User not found during save.");
                    return { success: false, error: "Please login to save your quiz." };
                }

                const { database } = await createAdminClient();

                // 1. Create Quiz Header
                const quiz = await database.createDocument(
                    DATABASE_ID,
                    QUIZZES_COLLECTION_ID,
                    ID.unique(),
                    {
                        title: jsonResponse.title,
                        description: jsonResponse.description,
                        category: jsonResponse.category,
                        user_id: user ? user.$id : null,
                    }
                );

                // 2. Create Quiz Items
                const itemPromises = jsonResponse.items.map((item: any) =>
                    database.createDocument(
                        DATABASE_ID,
                        QUIZ_ITEMS_COLLECTION_ID,
                        ID.unique(),
                        {
                            quiz_id: quiz.$id,
                            user_id: user ? user.$id : null,
                            question: item.question,
                            correctOption: item.correctOption,
                            options: item.options,
                            hint: item.hint,
                            difficulty: difficulty.toLowerCase(),
                            points: item.points || 1
                        }
                    )
                );

                await Promise.all(itemPromises);
                console.log(`Saved Quiz ID: ${quiz.$id} with ${itemPromises.length} items.`);
                return { success: true, data: jsonResponse, quizId: quiz.$id };
            } else {
                console.warn("Appwrite credentials missing. Returning JSON only.");
                return { success: true, data: jsonResponse, warning: "Not saved to DB (Missing Credentials)" };
            }

        } catch (parseError) {
            console.error("Failed to parse/save:", parseError);
            return { success: false, error: "AI returned invalid JSON or DB save failed." };
        }

    } catch (error) {
        console.error("AI Generation Error:", error);
        return { success: false, error: "Something went wrong during generation." };
    }
}

const FLASHCARDS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_FLASHCARDS_COLLECTION_ID!;
const FLASHCARD_ITEMS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_FLASHCARD_ITEMS_COLLECTION_ID!;

export async function generateFlashcardsAction(prompt: string, difficulty: string, quantity: string, sourceType: "topic" | "text" = "topic", jwt?: string) {
    try {
        let instructionText = "";
        if (sourceType === "topic") {
            instructionText = `Generate a flashcard deck based on the provided TOPIC. Use your internal knowledge.`;
        } else {
            instructionText = `Generate a flashcard deck STRICTLY based on the provided TEXT. Do not use external knowledge.`;
        }

        const systemInstruction = `
        You are an expert flashcard generator. ${instructionText}
        Difficulty: ${difficulty}
        Number of flashcards: ${quantity}
        
        Format the output as a JSON object with:
        - title: A creative title for the flashcard deck.
        - description: A short description (max 1 sentence).
        - items: An array of flashcards. Each item must have:
            - front: The question or term (front of the card).
            - back: The answer or definition (back of the card).
            - hint: A subtle clue to help the user guess the answer.
  
        Return ONLY the JSON object. No markdown, no extra text.
      `;

        const result = await model.generateContent([systemInstruction, prompt]);
        const response = await result.response;
        const text = response.text();

        const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();

        try {
            const jsonResponse = JSON.parse(cleanedText);
            console.log("--- GENERATED FLASHCARDS JSON ---");
            console.log(JSON.stringify(jsonResponse, null, 2));

            // Save to Appwrite
            if (process.env.APPWRITE_API_KEY && DATABASE_ID && FLASHCARDS_COLLECTION_ID) {
                console.log("Saving Flashcards to Appwrite...");
                const user = await getLoggedInUser(jwt);
                if (!user) {
                    console.error("User not found during save.");
                    return { success: false, error: "Please login to save your flashcards." };
                }

                const { database } = await createAdminClient();

                // 1. Create Flashcard Deck Header
                const deck = await database.createDocument(
                    DATABASE_ID,
                    FLASHCARDS_COLLECTION_ID,
                    ID.unique(),
                    {
                        title: jsonResponse.title,
                        description: jsonResponse.description,
                        user_id: user ? user.$id : null,
                    }
                );

                // 2. Create Flashcard Items
                const itemPromises = jsonResponse.items.map((item: any) =>
                    database.createDocument(
                        DATABASE_ID,
                        FLASHCARD_ITEMS_COLLECTION_ID,
                        ID.unique(),
                        {
                            flashcard_id: deck.$id,
                            user_id: user ? user.$id : null,
                            front: item.front,
                            back: item.back,
                            hint: item.hint,
                            difficulty: difficulty.toLowerCase(),
                            points: 1,
                        }
                    )
                );

                await Promise.all(itemPromises);
                console.log(`Saved Flashcard Deck ID: ${deck.$id} with ${itemPromises.length} items.`);
                return { success: true, data: jsonResponse, deckId: deck.$id };
            } else {
                console.warn("Appwrite credentials missing (Flashcards). Returning JSON only.");
                return { success: true, data: jsonResponse, warning: "Not saved to DB (Missing Credentials)" };
            }

        } catch (parseError) {
            console.error("Failed to parse JSON:", cleanedText);
            return { success: false, error: "AI returned invalid JSON format." };
        }

    } catch (error) {
        console.error("AI Generation Error:", error);
        return { success: false, error: "Something went wrong during generation." };
    }
}
