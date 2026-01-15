"use server"

import { createAdminClient, getLoggedInUser } from "../appwrite-server";
import { ID } from "node-appwrite";

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const FLASHCARDS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_FLASHCARDS_COLLECTION_ID!;
const FLASHCARD_ITEMS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_FLASHCARD_ITEMS_COLLECTION_ID!;
const QUIZ_ITEMS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_QUIZ_ITEMS_COLLECTION_ID!;

export async function updateFlashcardPointsAction(itemId: string, pointsDelta: number) {
    try {
        const user = await getLoggedInUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const { database } = await createAdminClient();

        // 1. Get current item to know current points
        const item = await database.getDocument(
            DATABASE_ID,
            FLASHCARD_ITEMS_COLLECTION_ID,
            itemId
        );

        if (item.user_id && item.user_id !== user.$id) {
            return { success: false, error: "Unauthorized access" };
        }

        const currentPoints = item.points || 0;
        const newPoints = Math.round(currentPoints + pointsDelta);

        // 2. Update item
        await database.updateDocument(
            DATABASE_ID,
            FLASHCARD_ITEMS_COLLECTION_ID,
            itemId,
            {
                points: newPoints
            }
        );

        return { success: true, newPoints };
    } catch (error) {
        console.error("Error updating flashcard points:", error);
        return { success: false, error: "Failed to update points" };
    }
}

export async function updateQuizPointsAction(itemId: string, pointsDelta: number) {
    try {
        const user = await getLoggedInUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const { database } = await createAdminClient();

        // 1. Get current item
        const item = await database.getDocument(
            DATABASE_ID,
            QUIZ_ITEMS_COLLECTION_ID,
            itemId
        );

        if (item.user_id && item.user_id !== user.$id) {
            return { success: false, error: "Unauthorized access" };
        }

        const currentPoints = item.points || 0;
        const newPoints = Math.round(currentPoints + pointsDelta);

        // 2. Update item
        await database.updateDocument(
            DATABASE_ID,
            QUIZ_ITEMS_COLLECTION_ID,
            itemId,
            {
                points: newPoints
            }
        );

        return { success: true, newPoints };
    } catch (error) {
        console.error("Error updating quiz points:", error);
        return { success: false, error: "Failed to update points" };
    }
}
