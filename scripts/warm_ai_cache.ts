
import "dotenv/config"; // Load env vars
import { initializeVectorStore } from "../app/services/ai/core.server";

console.log("🔥 Warming up AI Cache...");
initializeVectorStore()
    .then(() => console.log("✅ Cache warmup complete! You can now use the chat."))
    .catch(console.error);
