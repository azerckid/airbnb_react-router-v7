
import "dotenv/config";
import { initializeVectorStore } from "../app/services/ai/core.server";

console.log("🔥 Warming up OpenAI Embedding Cache...");
// Call with 'openai' provider to generate embeddings_cache_openai.json
initializeVectorStore('openai')
    .then(() => console.log("✅ OpenAI Cache warmup complete! You can now use OpenAI for search."))
    .catch(console.error);
