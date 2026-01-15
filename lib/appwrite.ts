import { Client, Account } from 'appwrite';

export const client = new Client();

const appwriteConfig = {
    endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!,
    projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!
}

client
    .setEndpoint(appwriteConfig.endpoint)
    .setProject(appwriteConfig.projectId); // Replace with your project ID

export const account = new Account(client);
export { ID } from 'appwrite';