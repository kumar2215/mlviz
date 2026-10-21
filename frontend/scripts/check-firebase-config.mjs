const missing = ["API_KEY", "AUTH_DOMAIN", "PROJECT_ID", "APP_ID", "DATABASE_ID"]
    .map(key => `VITE_FIREBASE_${key}`)
    .filter(key => !process.env[key]?.trim());

if (missing.length) {
    console.error(`Missing Firebase build configuration: ${missing.join(", ")}`);
    process.exitCode = 1;
}
