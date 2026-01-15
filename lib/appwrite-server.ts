"use server"

import { Client, Databases } from "node-appwrite";

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
    };
}
