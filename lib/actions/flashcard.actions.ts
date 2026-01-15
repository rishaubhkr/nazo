"use server"

import { createAdminClient } from "../appwrite-server";
import { Query } from "node-appwrite";

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const FLASHCARDS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_FLASHCARDS_COLLECTION_ID!;
const FLASHCARD_ITEMS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_FLASHCARD_ITEMS_COLLECTION_ID!;

export async function getFlashcardsAction(page: number = 1, limit: number = 10) {
    try {
        const { database } = await createAdminClient();
        const offset = (page - 1) * limit;

        const result = await database.listDocuments(
            DATABASE_ID,
            FLASHCARDS_COLLECTION_ID,
            [
                Query.limit(limit),
                Query.offset(offset),
                Query.orderDesc("$createdAt")
            ]
        );

        return {
            success: true,
            data: result.documents,
            total: result.total,
            hasMore: offset + limit < result.total
        };
    } catch (error) {
        console.error("Error fetching flashcards:", error);
        return { success: false, error: "Failed to load flashcards", data: [], total: 0 };
    }
}

export async function getFlashcardDeckByIdAction(deckId: string) {
    try {
        console.log(`[getFlashcardDeckByIdAction] Fetching Deck: ${deckId}`);
        console.log(`[Debug] DB: ${DATABASE_ID}, Deck Col: ${FLASHCARDS_COLLECTION_ID}, Items Col: ${FLASHCARD_ITEMS_COLLECTION_ID}`);

        const { database } = await createAdminClient();

        // 1. Fetch Deck Details
        const deck = await database.getDocument(
            DATABASE_ID,
            FLASHCARDS_COLLECTION_ID,
            deckId
        );
        console.log(`[Debug] Deck Found: ${deck ? deck.$id : 'No'}`);

        // 2. Fetch Flashcards
        const items = await database.listDocuments(
            DATABASE_ID,
            FLASHCARD_ITEMS_COLLECTION_ID,
            [
                Query.equal("flashcard_id", deckId),
                Query.limit(100)
            ]
        );
        console.log(`[Debug] Items Found: ${items.total}`);

        return {
            success: true,
            deck: deck,
            cards: items.documents
        };

    } catch (error) {
        console.error("Error fetching full flashcard deck:", error);
        return { success: false, error: "Failed to load flashcard deck" };
    }
}
