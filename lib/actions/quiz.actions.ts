"use server"

import { createAdminClient } from "../appwrite-server";
import { Query } from "node-appwrite";

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const QUIZZES_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_QUIZZES_COLLECTION_ID!;
const QUIZ_ITEMS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_QUIZ_ITEMS_COLLECTION_ID!;

export async function getQuizzesAction(page: number = 1, limit: number = 10) {
    try {
        const { database } = await createAdminClient();
        const offset = (page - 1) * limit;

        const result = await database.listDocuments(
            DATABASE_ID,
            QUIZZES_COLLECTION_ID,
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
        console.error("Error fetching quizzes:", error);
        return { success: false, error: "Failed to load quizzes", data: [], total: 0 };
    }
}

export async function getQuizByIdAction(quizId: string) {
    try {
        const { database } = await createAdminClient();

        // 1. Fetch Quiz Details
        const quiz = await database.getDocument(
            DATABASE_ID,
            QUIZZES_COLLECTION_ID,
            quizId
        );

        // 2. Fetch Quiz Items (Questions)
        const items = await database.listDocuments(
            DATABASE_ID,
            QUIZ_ITEMS_COLLECTION_ID,
            [
                Query.equal("quiz_id", quizId),
                Query.limit(100) // Fetch all questions (up to 100 for now)
            ]
        );

        return {
            success: true,
            quiz: quiz,
            questions: items.documents
        };

    } catch (error) {
        console.error("Error fetching full quiz:", error);
        return { success: false, error: "Failed to load quiz" };
    }
}
