"use server"

import { Client, Databases, Account } from "node-appwrite";
import { cookies } from "next/headers";

export async function createAdminClient() {
    const client = new Client()
        .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
        .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
        .setKey(process.env.APPWRITE_API_KEY!);

    return {
        get database() {
            return new Databases(client);
        },
    };
}

export async function createSessionClient(session: string) {
    const client = new Client()
        .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
        .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

    if (session) {
        client.setSession(session);
    }

    return {
        get database() {
            return new Databases(client);
        },
        get account() {
            return new Account(client);
        }
    };
}

export async function getLoggedInUser() {
    try {
        const cookieStore = await cookies();
        let session = "";

        // Find the Appwrite session cookie (starts with 'a_session_')
        const allCookies = cookieStore.getAll();
        for (const cookie of allCookies) {
            if (cookie.name.startsWith("a_session_")) {
                session = cookie.value;
                break;
            }
        }

        if (!session) return null;

        const { account } = await createSessionClient(session);
        return await account.get();
    } catch (error) {
        console.error("Error getting user session:", error);
        return null;
    }
}
