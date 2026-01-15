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

export async function createSessionClient(session: string, type: 'cookie' | 'jwt' = 'cookie') {
    const client = new Client()
        .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
        .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

    if (session) {
        if (type === 'jwt') {
            client.setJWT(session);
        } else {
            console.log(`[createSessionClient] Setting session: ${session.substring(0, 10)}... (Length: ${session.length})`);
            client.setSession(session);
        }
    } else {
        console.log(`[createSessionClient] No session provided!`);
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

export async function getLoggedInUser(jwt?: string) {
    try {
        // If JWT is provided (from Client SDK via Server Action arg), use it directly.
        if (jwt) {
            const { account } = await createSessionClient(jwt, 'jwt');
            return await account.get();
        }

        const cookieStore = await cookies();
        let session = "";

        // Find the Appwrite session cookie (starts with 'a_session_')
        const allCookies = cookieStore.getAll();
        console.log("[getLoggedInUser] Cookies found:", allCookies.map(c => c.name));

        for (const cookie of allCookies) {
            if (cookie.name.startsWith("a_session_")) {
                session = cookie.value;
                break;
            }
        }

        if (!session) return null;

        const { account } = await createSessionClient(session, 'cookie');
        return await account.get();
    } catch (error) {
        console.error("Error getting user session:", error);
        return null;
    }
}
