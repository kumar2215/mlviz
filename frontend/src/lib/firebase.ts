import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { readFirebaseConfig } from "./firebaseConfig";

export function initializeFirebase() {
    const config = readFirebaseConfig(import.meta.env);
    if (config.error || !config.options) return { error: config.error ?? "Firebase configuration is missing." };
    try {
        const app = getApps().length ? getApp() : initializeApp(config.options);
        return { auth: getAuth(app), db: getFirestore(app, config.databaseId!) };
    } catch {
        return { error: "Account services couldn't initialize. Check the Firebase environment settings and restart the app." };
    }
}
