"use server"

import { createAdminClient, getLoggedInUser } from "../appwrite-server";
import { Query } from "node-appwrite";

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const QUIZZES_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_QUIZZES_COLLECTION_ID!;
const QUIZ_ITEMS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_QUIZ_ITEMS_COLLECTION_ID!;
const FLASHCARDS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_FLASHCARDS_COLLECTION_ID!;
const FLASHCARD_ITEMS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_FLASHCARD_ITEMS_COLLECTION_ID!;

export async function getUserPerformanceAction(jwt?: string) {
    try {
        const user = await getLoggedInUser(jwt);
        if (!user) return { success: false, error: "Please login to view your performance" };

        const { database } = await createAdminClient();

        // Fetch all user's quizzes
        const quizzes = await database.listDocuments(
            DATABASE_ID,
            QUIZZES_COLLECTION_ID,
            [
                Query.equal("user_id", user.$id),
                Query.limit(1000)
            ]
        );

        // Fetch all quiz items for the user
        const quizItems = await database.listDocuments(
            DATABASE_ID,
            QUIZ_ITEMS_COLLECTION_ID,
            [
                Query.equal("user_id", user.$id),
                Query.limit(5000)
            ]
        );

        // Fetch all flashcard decks
        const flashcardDecks = await database.listDocuments(
            DATABASE_ID,
            FLASHCARDS_COLLECTION_ID,
            [
                Query.equal("user_id", user.$id),
                Query.limit(1000)
            ]
        );

        // Fetch all flashcard items
        const flashcardItems = await database.listDocuments(
            DATABASE_ID,
            FLASHCARD_ITEMS_COLLECTION_ID,
            [
                Query.equal("user_id", user.$id),
                Query.limit(5000)
            ]
        );

        // Calculate quiz statistics
        const quizStats = {
            totalQuizzes: quizzes.total,
            totalQuestions: quizItems.total,
            averageScore: 0,
            strongAreas: [] as string[],
            weakAreas: [] as string[],
            itemsByCategory: {} as Record<string, { total: number, avgPoints: number }>,
            recentActivity: [] as any[]
        };

        // Calculate flashcard statistics
        const flashcardStats = {
            totalDecks: flashcardDecks.total,
            totalCards: flashcardItems.total,
            averageScore: 0,
            masteredCards: 0,
            strugglingCards: 0,
            recentActivity: [] as any[]
        };

        // Process quiz items
        let totalQuizPoints = 0;
        const categoryMap = new Map<string, { points: number[], count: number }>();

        quizItems.documents.forEach((item: any) => {
            const points = item.points || 0;
            totalQuizPoints += points;

            // Group by quiz to get category
            const quiz = quizzes.documents.find((q: any) => q.$id === item.quiz_id);
            if (quiz && quiz.category) {
                const category = quiz.category;
                if (!categoryMap.has(category)) {
                    categoryMap.set(category, { points: [], count: 0 });
                }
                const cat = categoryMap.get(category)!;
                cat.points.push(points);
                cat.count++;
            }
        });

        quizStats.averageScore = quizItems.total > 0 ? totalQuizPoints / quizItems.total : 0;

        // Identify strong and weak areas
        categoryMap.forEach((data, category) => {
            const avgPoints = data.points.reduce((a, b) => a + b, 0) / data.count;
            quizStats.itemsByCategory[category] = {
                total: data.count,
                avgPoints: avgPoints
            };

            if (avgPoints >= 2) {
                quizStats.strongAreas.push(category);
            } else if (avgPoints < 0) {
                quizStats.weakAreas.push(category);
            }
        });

        // Process flashcard items
        let totalFlashcardPoints = 0;
        flashcardItems.documents.forEach((item: any) => {
            const points = item.points || 0;
            totalFlashcardPoints += points;

            if (points >= 3) {
                flashcardStats.masteredCards++;
            } else if (points < 0) {
                flashcardStats.strugglingCards++;
            }
        });

        flashcardStats.averageScore = flashcardItems.total > 0 ? totalFlashcardPoints / flashcardItems.total : 0;

        // Overall statistics
        const overallStats = {
            totalItems: quizItems.total + flashcardItems.total,
            totalPoints: totalQuizPoints + totalFlashcardPoints,
            averagePerformance: (quizItems.total + flashcardItems.total) > 0
                ? (totalQuizPoints + totalFlashcardPoints) / (quizItems.total + flashcardItems.total)
                : 0,
            studyStreak: 0, // Can be calculated based on $createdAt dates
            lastStudyDate: null as string | null
        };

        // Calculate study streak (simplified - based on quiz/deck creation)
        const allDates = [
            ...quizzes.documents.map((q: any) => new Date(q.$createdAt)),
            ...flashcardDecks.documents.map((d: any) => new Date(d.$createdAt))
        ].sort((a, b) => b.getTime() - a.getTime());

        if (allDates.length > 0) {
            overallStats.lastStudyDate = allDates[0].toISOString();
        }

        return {
            success: true,
            data: {
                quizStats,
                flashcardStats,
                overallStats
            }
        };

    } catch (error) {
        console.error("Error fetching user performance:", error);
        return { success: false, error: "Failed to load performance data" };
    }
}
