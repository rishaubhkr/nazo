import { OAuthProvider } from "appwrite";
import { account } from "../appwrite"

export async function getUser(retries = 3) {
    if (process.env.NODE_ENV === 'development') {
        console.log("🔍 Checking session for project:", process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID);
        console.log("🌐 Current Origin:", typeof window !== 'undefined' ? window.location.origin : 'SSR');
    }

    for (let i = 0; i < retries; i++) {
        try {
            const user = await account.get();
            return user;
        } catch (error: any) {
            // Appwrite error 401 usually means no session
            if (error.code === 401) {
                if (i < retries - 1) {
                    console.log(`⏳ Session not found yet, retrying... (${i + 1}/${retries})`);
                    await new Promise(resolve => setTimeout(resolve, 800)); // Increased wait
                    continue;
                }
                return null;
            }

            console.error("❌ Appwrite getUser error:", error);
            return null;
        }
    }
    return null;
}

export function loginWithGoogle() {
    const origin = typeof window !== 'undefined' ? window.location.origin : "http://localhost:4000";

    return account.createOAuth2Session(
        OAuthProvider.Google,
        `${origin}/`,
        `${origin}/login`
    )
}

export async function logout() {
    try {
        await account.deleteSession("current");
        window.location.href = "/login";
    } catch (error) {
        console.error("Logout failed:", error);
    }
}