"use server"

import { createAdminClient, getLoggedInUser } from "../appwrite-server";
import { Query } from "node-appwrite";

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const FLASHCARD_ITEMS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_FLASHCARD_ITEMS_COLLECTION_ID!;
const QUIZ_ITEMS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_QUIZ_ITEMS_COLLECTION_ID!;

interface SRSItem {
    $id: string;
    type: "flashcard" | "quiz";
    data: any;
    points: number;
    updatedAt: string;
}

function isDue(points: number, updatedAtStr: string): boolean {
    const updatedAt = new Date(updatedAtStr).getTime();
    const now = Date.now();
    const diffDays = (now - updatedAt) / (1000 * 60 * 60 * 24);

    if (points < 1) return true; // Daily (always show if not today? Or strictly > 1 day? Assume "Ready for review") 
    // Actually SRS implies: if (Now >= Updated + Interval) -> Due.

    // < 1: Daily (1 day)
    // 1-2: Weekly (7 days)
    // 2-3: 14 days
    // 3-4: 30 days
    // 4-5: 90 days
    // 5+: 365 days

    if (points < 1) return diffDays >= 0.5; // Allow review twice a day if really weak? or just 1 day. Let's say 12 hours.
    if (points < 2) return diffDays >= 7;
    if (points < 3) return diffDays >= 14;
    if (points < 4) return diffDays >= 30;
    if (points < 5) return diffDays >= 90;
    return diffDays >= 365;
}

export async function getDailyMixAction() {
    try {
        const user = await getLoggedInUser();
        if (!user) return { success: false, error: "Please login to view daily mix" };

        const { database } = await createAdminClient();

        // 1. Fetch potential Quiz candidates (Weakest first)
        const quizItemsReq = database.listDocuments(
            DATABASE_ID,
            QUIZ_ITEMS_COLLECTION_ID,
            [
                Query.equal("user_id", user.$id),
                Query.limit(50),
                Query.orderAsc("points"), // Focus on low points
                Query.orderAsc("$updatedAt") // Focus on oldest
            ]
        );

        // 2. Fetch potential Flashcard candidates (Weakest first)
        const flashItemsReq = database.listDocuments(
            DATABASE_ID,
            FLASHCARD_ITEMS_COLLECTION_ID,
            [
                Query.equal("user_id", user.$id),
                Query.limit(50),
                Query.orderAsc("points"),
                Query.orderAsc("$updatedAt")
            ]
        );

        // ... existing fetching logic ...

        const [quizRes, flashRes] = await Promise.all([quizItemsReq, flashItemsReq]);

        let items: SRSItem[] = [];

        // 1. First pass: strict SRS (Due items)
        quizRes.documents.forEach((doc: any) => {
            const points = doc.points || 0;
            if (isDue(points, doc.$updatedAt)) {
                items.push({ $id: doc.$id, type: "quiz", data: doc, points, updatedAt: doc.$updatedAt });
            }
        });

        flashRes.documents.forEach((doc: any) => {
            const points = doc.points || 0;
            if (isDue(points, doc.$updatedAt)) {
                items.push({ $id: doc.$id, type: "flashcard", data: doc, points, updatedAt: doc.$updatedAt });
            }
        });

        // 2. Second pass: Backfill if we don't have enough (Infinite feel)
        if (items.length < 20) {
            const allCandidates: SRSItem[] = [];

            quizRes.documents.forEach((doc: any) => {
                // Avoid duplicates if already added
                if (!items.some(i => i.$id === doc.$id)) {
                    allCandidates.push({ $id: doc.$id, type: "quiz", data: doc, points: doc.points || 0, updatedAt: doc.$updatedAt });
                }
            });
            flashRes.documents.forEach((doc: any) => {
                if (!items.some(i => i.$id === doc.$id)) {
                    allCandidates.push({ $id: doc.$id, type: "flashcard", data: doc, points: doc.points || 0, updatedAt: doc.$updatedAt });
                }
            });

            // Sort candidates by points (weakest first)
            allCandidates.sort((a, b) => a.points - b.points);

            // Fill up to 20, repeating candidates if necessary (Infinite feel even with few items)
            if (allCandidates.length > 0) {
                while (items.length < 20) {
                    // Add all candidates
                    items.push(...allCandidates);
                }
                // Trim to exactly 20
                items = items.slice(0, 20);
            }
        }

        // Shuffle
        for (let i = items.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [items[i], items[j]] = [items[j], items[i]];
        }

        return { success: true, data: items };

    } catch (error) {
        console.error("Error fetching daily mix:", error);
        return { success: false, error: "Failed to load mix" };
    }
}
