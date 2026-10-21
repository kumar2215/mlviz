export function readFirebaseConfig(env: Record<string, unknown>) {
    const keys = ["API_KEY", "AUTH_DOMAIN", "PROJECT_ID", "APP_ID", "DATABASE_ID"] as const;
    const missing = keys.filter(key => typeof env[`VITE_FIREBASE_${key}`] !== "string" || !String(env[`VITE_FIREBASE_${key}`]).trim());
    if (missing.length) return { error: `Account services are unavailable. Configure ${missing.map(key => `VITE_FIREBASE_${key}`).join(", ")} and restart the app.` };
    return {
        options: {
            apiKey: String(env.VITE_FIREBASE_API_KEY).trim(),
            authDomain: String(env.VITE_FIREBASE_AUTH_DOMAIN).trim(),
            projectId: String(env.VITE_FIREBASE_PROJECT_ID).trim(),
            appId: String(env.VITE_FIREBASE_APP_ID).trim(),
        },
        databaseId: String(env.VITE_FIREBASE_DATABASE_ID).trim(),
    };
}
