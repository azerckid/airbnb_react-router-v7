import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { Document } from "@langchain/core/documents";
import { prisma } from "../../db.server";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai"; // Added missing import
import { TaskType } from "@google/generative-ai";
import fs from "fs";
import path from "path";

// === Custom Simple Vector Store ===
class SimpleMemoryVectorStore {
    public documents: (Document & { embedding?: number[] })[] = [];
    private embeddings: GoogleGenerativeAIEmbeddings | OpenAIEmbeddings;

    constructor(embeddings: GoogleGenerativeAIEmbeddings | OpenAIEmbeddings) {
        this.embeddings = embeddings;
    }

    static async fromDocuments(docs: Document[], embeddings: GoogleGenerativeAIEmbeddings | OpenAIEmbeddings) {
        const store = new SimpleMemoryVectorStore(embeddings);
        await store.addDocuments(docs);
        return store;
    }

    // Load from cached documents (with embeddings)
    static fromCachedDocuments(cachedDocs: (Document & { embedding?: number[] })[], embeddings: GoogleGenerativeAIEmbeddings | OpenAIEmbeddings) {
        const store = new SimpleMemoryVectorStore(embeddings);
        store.documents = cachedDocs;
        return store;
    }

    async addDocuments(docs: Document[]) {
        if (docs.length === 0) return;

        const texts = docs.map(d => d.pageContent);
        console.log(`Generating embeddings for ${docs.length} documents...`);

        // Batch processing for Free Tier safety
        const BATCH_SIZE = 2;
        const vectors: number[][] = [];

        for (let i = 0; i < texts.length; i += BATCH_SIZE) {
            const batchTexts = texts.slice(i, i + BATCH_SIZE);
            console.log(`  - Embedding batch ${i / BATCH_SIZE + 1}/${Math.ceil(texts.length / BATCH_SIZE)}...`);

            try {
                const batchVectors = await this.embeddings.embedDocuments(batchTexts);
                vectors.push(...batchVectors);

                // Rate limit protection: Sleep 5s between batches
                if (i + BATCH_SIZE < texts.length) {
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            } catch (e) {
                console.error("Error embedding batch:", e);
                // Optionally handle partial failures or rethrow
                throw e;
            }
        }

        docs.forEach((d, i) => {
            const docWithEmbedding = d as (Document & { embedding?: number[] });
            docWithEmbedding.embedding = vectors[i];
            this.documents.push(docWithEmbedding);
        });
    }

    async similaritySearch(query: string, k: number) {
        // Embed query
        const queryEmbedding = await this.embeddings.embedQuery(query);

        const scored = this.documents
            .filter(d => d.embedding) // Ensure embedding exists
            .map(d => ({
                doc: d,
                score: this.cosineSimilarity(queryEmbedding, d.embedding!)
            }));

        // Sort descending by score
        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, k).map(s => s.doc);
    }

    private cosineSimilarity(a: number[], b: number[]) {
        if (!a || !b || a.length !== b.length) return 0;
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        if (normA === 0 || normB === 0) return 0;
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
}

import { OpenAIEmbeddings } from "@langchain/openai";

// Singleton pattern for VectorStore
// We need separate stores for Gemini and OpenAI
let vectorStoreGemini: SimpleMemoryVectorStore | null = null;
let vectorStoreOpenAI: SimpleMemoryVectorStore | null = null;

const CACHE_FILE_GEMINI = path.join(process.cwd(), "embeddings_cache.json");
const CACHE_FILE_OPENAI = path.join(process.cwd(), "embeddings_cache_openai.json");

export async function initializeVectorStore(provider: 'gemini' | 'openai' = 'gemini') {
    if (provider === 'gemini' && vectorStoreGemini) return vectorStoreGemini;
    if (provider === 'openai' && vectorStoreOpenAI) return vectorStoreOpenAI;

    const apiKey = process.env.GOOGLE_API_KEY;
    const openAIKey = process.env.OPENAI_API_KEY;

    const cacheFile = provider === 'gemini' ? CACHE_FILE_GEMINI : CACHE_FILE_OPENAI;

    // 1. Check for Cache
    if (fs.existsSync(cacheFile)) {
        try {
            console.log(`📂 Loading ${provider} embeddings from cache...`);
            const cachedData = fs.readFileSync(cacheFile, "utf-8");
            const cachedDocs = JSON.parse(cachedData);

            let embeddings;
            if (provider === 'gemini') {
                if (!apiKey) throw new Error("GOOGLE_API_KEY missing");
                embeddings = new GoogleGenerativeAIEmbeddings({ apiKey, taskType: TaskType.RETRIEVAL_DOCUMENT });
            } else {
                if (!openAIKey) throw new Error("OPENAI_API_KEY missing");
                embeddings = new OpenAIEmbeddings({ openAIApiKey: openAIKey, modelName: "text-embedding-3-small" });
            }

            const store = SimpleMemoryVectorStore.fromCachedDocuments(cachedDocs, embeddings);
            if (provider === 'gemini') vectorStoreGemini = store;
            else vectorStoreOpenAI = store;

            console.log(`✅ Loaded ${cachedDocs.length} documents from ${provider} cache.`);
            return store;
        } catch (e) {
            console.error("Failed to load cache, regenerating...", e);
        }
    }

    console.log(`⚡ initializing ${provider} Vector Store (Fetching & Embedding)...`);

    // 2. Fetch from DB if no cache
    const rooms = await prisma.room.findMany({
        take: 200,
        select: { id: true, title: true, description: true, city: true, price: true, category: { select: { name: true } } }
    });

    let embeddings;
    if (provider === 'gemini') {
        if (!apiKey) throw new Error("GOOGLE_API_KEY missing");
        embeddings = new GoogleGenerativeAIEmbeddings({ apiKey, taskType: TaskType.RETRIEVAL_DOCUMENT });
    } else {
        if (!openAIKey) throw new Error("OPENAI_API_KEY missing");
        embeddings = new OpenAIEmbeddings({ openAIApiKey: openAIKey, modelName: "text-embedding-3-small" });
    }

    if (rooms.length === 0) {
        const store = new SimpleMemoryVectorStore(embeddings);
        if (provider === 'gemini') vectorStoreGemini = store;
        else vectorStoreOpenAI = store;
        return store;
    }

    const docs = rooms.map((room) => new Document({
        pageContent: `
Title: ${room.title}
Type: ${room.category?.name || "Stay"}
Location: ${room.city}
Price: $${room.price} per night
Description: ${room.description}
    `.trim(),
        metadata: { id: room.id, title: room.title, city: room.city, price: room.price }
    }));

    // 3. Generate Embeddings
    const store = await SimpleMemoryVectorStore.fromDocuments(docs, embeddings);

    // 4. Save Cache
    try {
        fs.writeFileSync(cacheFile, JSON.stringify(store.documents, null, 2));
        console.log(`💾 ${provider} embeddings saved to cache.`);
    } catch (e) {
        console.error("Failed to save cache:", e);
    }

    if (provider === 'gemini') vectorStoreGemini = store;
    else vectorStoreOpenAI = store;

    console.log(`✅ Vector Store initialized with ${docs.length} rooms.`);
    return store;
}

// 2. Fetch from DB if no cache
// const rooms = await prisma.room.findMany({
//     take: 200,
//     select: { id: true, title: true, description: true, city: true, price: true, category: { select: { name: true } } }
// });

// (Previous edit artifact removal: The previous edit inserted a partial function copy. 
// I need to clean up the mess at lines 200-211 which duplicates logic and adds a brace)


export async function searchRooms(query: string, k = 4, provider: 'gemini' | 'openai' = 'gemini') {
    // If Gemini fails, we can fallback to OpenAI if implemented in the logic calling this
    // For now, this function just forwards the provider choice.
    const store = await initializeVectorStore(provider);
    if (!store) return [];
    const results = await store.similaritySearch(query, k);
    return results;
}

// === Real-time Update Function ===
export async function updateVectorStore(roomId: string) {
    console.log(`⚡ Updating Vector Store for room ${roomId}...`);

    // 1. Fetch the new room
    const room = await prisma.room.findUnique({
        where: { id: roomId },
        select: { id: true, title: true, description: true, city: true, price: true, category: { select: { name: true } } }
    });

    if (!room) {
        console.error(`❌ Room ${roomId} not found for vector update.`);
        return;
    }

    // 2. Refresh both stores if they exist (or initialize them)
    // We try to add to both to keep them in sync if used.
    const providers: ('gemini' | 'openai')[] = ['gemini', 'openai'];

    for (const provider of providers) {
        // Only update if store is already initialized or we want to force init?
        // Let's just try to get the store. If not initialized, this will init it with ALL rooms including new one.
        // If initialized, we should add this one document.

        let store;
        if (provider === 'gemini') store = vectorStoreGemini;
        else store = vectorStoreOpenAI;

        if (store) {
            // Store exists, append single document
            const doc = new Document({
                pageContent: `
Title: ${room.title}
Type: ${room.category?.name || "Stay"}
Location: ${room.city}
Price: $${room.price} per night
Description: ${room.description}
            `.trim(),
                metadata: { id: room.id, title: room.title, city: room.city, price: room.price }
            });

            // We need embedding.
            // SimpleMemoryVectorStore.addDocuments handles embedding generation.
            await store.addDocuments([doc]);

            // Save cache (optional but good for persistence across quick restarts if file based)
            const cacheFile = provider === 'gemini' ? CACHE_FILE_GEMINI : CACHE_FILE_OPENAI;
            try {
                fs.writeFileSync(cacheFile, JSON.stringify(store.documents, null, 2));
                console.log(`💾 ${provider} cache updated with new room.`);
            } catch (e) {
                console.error("Failed to update cache file:", e);
            }

        } else {
            // Store not loaded yet. initializeVectorStore will fetch DB (including new room) automatically.
            // So we don't need to do anything explicit here, checking init is enough? 
            // BUT, if we want to ensure it's ready:
            // await initializeVectorStore(provider); 
            // Doing this might be heavy if we just want to update. 
            // Let's skip valid update if store is offline to save resources, 
            // as next init will pick it up.
            console.log(`ℹ️ ${provider} store not loaded, skipping incremental update.`);
        }
    }
}


// import { ChatOpenAI } from "@langchain/openai"; // Already imported at top

export async function generateStreamingResponse(query: string) {
    const apiKey = process.env.GOOGLE_API_KEY;
    const openAIKey = process.env.OPENAI_API_KEY;

    if (!apiKey) throw new Error("GOOGLE_API_KEY missing");

    // 1. Retrieve context
    let context = "";
    try {
        const docs = await searchRooms(query);
        context = docs.map((d: Document) => d.pageContent).join("\n\n");
    } catch (e) {
        console.error("Retrieval failed:", e);
        // Continue without context or fail? 
        // If retrieval fails (embedding 429), we might still want to chat?
        // But for "Concierge" functionality, retrieval is key. 
        // For now, let's proceed with empty context if retrieval fails, or standard error.
    }

    const template = `
You are an expert Airbnb Concierge. Your goal is to help users find the perfect place to stay.
Use the following context (retrieved listings) to answer the user's question.

If the user asks for a recommendation, recommend specific rooms from the context.
Include the price and location in your recommendation.
If the context doesn't have relevant rooms, say "I couldn't find any rooms matching your criteria," but try to be helpful.
Do not make up listings that are not in the context.

Context:
{context}

User Question: {question}

Answer (in clean Markdown, use bullet points for listings):
    `.trim();

    const prompt = ChatPromptTemplate.fromTemplate(template);

    // Helper to run chain with fallback
    const runChain = async (model: any) => {
        const chain = prompt.pipe(model).pipe(new StringOutputParser());
        return chain.stream({
            context,
            question: query
        });
    };

    try {
        console.log("🤖 Trying Gemini 2.5 Flash...");
        const geminiModel = new ChatGoogleGenerativeAI({
            model: "gemini-2.5-flash",
            apiKey,
            streaming: true,
        });
        return await runChain(geminiModel);
    } catch (geminiError) {
        console.error("⚠️ Gemini failed, trying fallback...", geminiError);

        if (openAIKey) {
            console.log("🤖 Fallback to OpenAI GPT-4o-mini...");
            try {
                const openAIModel = new ChatOpenAI({
                    modelName: "gpt-4o-mini",
                    openAIApiKey: openAIKey,
                    streaming: true,
                    temperature: 0.7
                });
                return await runChain(openAIModel);
            } catch (openAIError) {
                console.error("⚠️ OpenAI also failed:", openAIError);
                // Return a simple stream with the error message so the UI shows something
                return new ReadableStream({
                    start(controller) {
                        controller.enqueue(new TextEncoder().encode("Sorry, both AI services are currently unavailable. Please check your API keys or quotas."));
                        controller.close();
                    }
                });
            }
        } else {
            console.error("❌ No OpenAI key found for fallback.");
            // Return a simple stream with the error message
            return new ReadableStream({
                start(controller) {
                    controller.enqueue(new TextEncoder().encode("I'm having trouble connecting to the AI service (Gemini). OpenAI fallback is not configured."));
                    controller.close();
                }
            });
        }
    }
}
