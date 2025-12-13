

import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { Document } from "@langchain/core/documents";
import { searchRooms } from "./core.server";
import { searchFlights, type FlightOffer, filterFlightsWithinHours } from "./tools/flight.server";
import { searchStructuredRooms, type RoomListing, getAvailableLocations } from "./tools/recommendation.server";
import { getIpLocation, findNearestAirport, findNearestAirports, getAirportLocation, getAirportLocationByCountry } from "./tools/location.server";
import { getAllKoreanAirports } from "./tools/korean-airports";
import { getAllDestinationCities } from "./tools/destination-mapping";

// 1. Define State
export interface AgentState {
    query: string;
    classification?: "GREETING" | "SEARCH" | "FLIGHT" | "EMERGENCY" | "BUDGET" | "AUTO_PLAN";
    context?: string;
    answer?: string;
    logs?: string[];
    params?: {
        origin?: string;
        destination?: string;
        budget?: number;
        days?: number;
        date?: string;
    };
    foundFlights?: FlightOffer[];
    foundRooms?: RoomListing[];
    ip?: string;
    // New fields for batch processing
    combinations?: Array<{
        origin: string;
        originName: string;
        destination: string;
        destinationCity: string;
        destinationCityKorean?: string;
        destinationCountry: string;
    }>;
    batchIndex?: number;
    searchResults?: Array<{
        origin: string;
        originName: string;
        destination: string;
        destinationCity: string;
        destinationCityKorean?: string;
        destinationCountry: string;
        flight: FlightOffer | null;
        searchDate: string | null;
    }>;
}

const openAIKey = process.env.OPENAI_API_KEY;

// --- Node 1: Router (Supervisor) ---
export async function routerNode(state: AgentState) {
    console.log("🚦 Router: Classifying intent...", state.query);

    // HACK: Logic to detect Auto-Plan prompt from Concierge UI
    if (state.query && state.query.includes("RECOMMEND_TRIP_FROM_CURRENT_LOCATION_TRIGGER")) {
        console.log("🚦 Classification: AUTO_PLAN (Detected special trigger)");
        return { classification: "AUTO_PLAN" };
    }

    const model = new ChatOpenAI({
        modelName: "gpt-4o-mini",
        openAIApiKey: openAIKey,
        temperature: 0,
    });

    const template = `
Classify the user input into one of these categories:
1. "GREETING": Simple hellos, thankyous.
2. "FLIGHT": Specific flight search questions (e.g., "flight to Tokyo").
3. "SEARCH": General accommodation search (e.g., "rooms in Seoul").
4. "EMERGENCY": Urgent requests to leave *now*, *today*, or *within 2 hours*.
5. "BUDGET": Requests specifying a *total budget* for a trip (e.g., "1 million KRW trip", "Trip under $1000").
6. "AUTO_PLAN": Requests for a full automatic recommendation or "daily plan".

Input: {query}

Output only the category name.
    `.trim();

    const prompt = ChatPromptTemplate.fromTemplate(template);
    const chain = prompt.pipe(model).pipe(new StringOutputParser());

    try {
        const result = await chain.invoke({ query: state.query });
        const classification = result.trim().toUpperCase() as any;
        console.log("🚦 Classification:", classification);
        return { classification };
    } catch (e) {
        console.error("Router failed, defaulting to SEARCH", e);
        return { classification: "SEARCH" };
    }
}

// --- Helper Functions (Moved to Module Scope for Sharing) ---
const getKoreaDate = (date: Date): string => {
    return date.toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
};

const addDaysToKoreaDate = (dateStr: string, days: number): string => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + days);
    return getKoreaDate(date);
};

// 3.2. searchFirstAvailableFlight 함수 정의 (Rate limiting 포함)
async function searchFirstAvailableFlight(
    origin: string,
    destination: string,
    todayDate: string,
    retryCount: number = 0,
    logs: string[] = []
): Promise<FlightOffer | null> {
    // Rate limiting: 각 요청 사이에 딜레이 추가 (300ms)
    // if (retryCount === 0) {
    //     await new Promise(resolve => setTimeout(resolve, 300));
    // }

    try {
        // 1. 오늘 날짜로 항공편 검색 (시간 필터 없음, 모든 항공편)
        const todayResult = await searchFlights(origin, destination, todayDate);

        // 에러 체크: searchFlights가 문자열을 반환하면 에러
        if (typeof todayResult === 'string') {
            // Rate limit 에러 확인
            if (todayResult.includes('RATE_LIMIT_ERROR') || todayResult.includes('rate limit') || todayResult.includes('Too many requests')) {
                if (retryCount < 3) {
                    const delay = Math.pow(2, retryCount + 1) * 1000; // 2초, 4초, 8초
                    logs.push(`   ⚠️ Rate limit 감지 (${origin} → ${destination}). ${delay / 1000}초 후 재시도... (${retryCount + 1}/3)`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    return searchFirstAvailableFlight(origin, destination, todayDate, retryCount + 1, logs);
                } else {
                    logs.push(`   ❌ Rate limit: 재시도 횟수 초과. 이 조합은 건너뜁니다.`);
                    return null;
                }
            }
            // INVALID DATE 에러는 무시하고 다음날 검색 시도
            if (todayResult.includes('INVALID_DATE_ERROR')) {
                // 오늘 날짜가 과거이면 다음날만 검색
            } else {
                // 다른 에러는 로그만 남기고 다음날 검색 시도
                logs.push(`   ⚠️ 오늘 날짜 검색 에러 (${origin} → ${destination}): ${todayResult.substring(0, 50)}`);
            }
        } else if (Array.isArray(todayResult) && todayResult.length > 0) {
            // 출발 시간 기준 정렬 후 첫 번째 반환
            todayResult.sort((a, b) => {
                return new Date(a.departure.at).getTime() - new Date(b.departure.at).getTime();
            });
            return todayResult[0];
        }

        // 2. 다음날 날짜로 검색 (한국 시간대 기준)
        const tomorrowDate = addDaysToKoreaDate(todayDate, 1);

        // Rate limiting: 다음날 검색 전에도 딜레이
        await new Promise(resolve => setTimeout(resolve, 300));

        const tomorrowResult = await searchFlights(origin, destination, tomorrowDate);

        // 에러 체크
        if (typeof tomorrowResult === 'string') {
            // Rate limit 에러 확인
            if (tomorrowResult.includes('RATE_LIMIT_ERROR') || tomorrowResult.includes('rate limit') || tomorrowResult.includes('Too many requests')) {
                if (retryCount < 3) {
                    const delay = Math.pow(2, retryCount + 1) * 1000;
                    logs.push(`   ⚠️ Rate limit 감지 (${origin} → ${destination}, 내일). ${delay / 1000}초 후 재시도... (${retryCount + 1}/3)`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    return searchFirstAvailableFlight(origin, destination, todayDate, retryCount + 1, logs);
                } else {
                    logs.push(`   ❌ Rate limit: 재시도 횟수 초과. 이 조합은 건너뜁니다.`);
                    return null;
                }
            }
            // 다른 에러는 로그만 남기고 null 반환
            logs.push(`   ⚠️ 내일 날짜 검색 에러 (${origin} → ${destination}): ${tomorrowResult.substring(0, 50)}`);
            return null;
        } else if (Array.isArray(tomorrowResult) && tomorrowResult.length > 0) {
            tomorrowResult.sort((a, b) => {
                return new Date(a.departure.at).getTime() - new Date(b.departure.at).getTime();
            });
            return tomorrowResult[0];
        }

        // 3. 오늘과 내일 모두 없으면 null 반환
        return null;
    } catch (error: any) {
        // 예상치 못한 에러
        logs.push(`   ❌ 예상치 못한 에러 (${origin} → ${destination}): ${error.message || 'Unknown error'}`);
        return null;
    }
}


// --- Node 2a: Init Auto Plan (Setup & Phase 1-2) ---
export async function initAutoPlanNode(state: AgentState) {
    const logs: string[] = [];
    logs.push(`🤖 자동 여행 계획을 시작합니다...`);

    // 1. Get Data
    const koreanAirports = getAllKoreanAirports();
    const destinationCities = getAllDestinationCities();

    // 2. Generate Combinations
    const searchCombinations: Array<{
        origin: string;
        originName: string;
        destination: string;
        destinationCity: string;
        destinationCityKorean?: string;
        destinationCountry: string;
    }> = [];

    for (const origin of koreanAirports) {
        for (const dest of destinationCities) {
            searchCombinations.push({
                origin: origin.iataCode,
                originName: origin.nameKorean,
                destination: dest.airportCode,
                destinationCity: dest.city,
                destinationCityKorean: dest.cityKorean,
                destinationCountry: dest.country
            });
        }
    }

    logs.push(`   검색 조합 생성 완료: ${koreanAirports.length}개 출발지 × ${destinationCities.length}개 목적지 = ${searchCombinations.length}개 경로`);
    logs.push(`🔍 ${searchCombinations.length}개 경로에 대해 항공편 검색을 시작합니다 (실시간 업데이트)...`);

    return {
        combinations: searchCombinations,
        batchIndex: 0,
        searchResults: [],
        logs
    };
}

// --- Node 2b: Batch Flight Search (Phase 3 Loop) ---
export async function batchAutoPlanNode(state: AgentState) {
    const logs: string[] = [];
    const combinations = state.combinations || [];
    const batchIndex = state.batchIndex || 0;
    const searchResults = state.searchResults || [];

    // Batch Setting: Process 2 items per step for frequent updates
    const BATCH_SIZE = 2;

    // Calculate Slice
    const currentBatch = combinations.slice(batchIndex, batchIndex + BATCH_SIZE);

    if (currentBatch.length === 0) {
        // No more items, logic should have caught this in Conditional Edge, but just in case
        return { batchIndex: batchIndex + BATCH_SIZE }; // Force Move
    }

    // Prepare Dates
    const now = new Date();
    const todayDate = getKoreaDate(now);

    logs.push(`   📦 배치 처리 중... (${batchIndex + 1} ~ ${Math.min(batchIndex + BATCH_SIZE, combinations.length)} / ${combinations.length})`);

    for (const combo of currentBatch) {
        // Searched Count (total so far)
        // const currentCount = batchIndex + currentBatch.indexOf(combo) + 1;

        try {
            const flight = await searchFirstAvailableFlight(
                combo.origin,
                combo.destination,
                todayDate,
                0,
                logs
            );

            const result = {
                origin: combo.origin,
                originName: combo.originName,
                destination: combo.destination,
                destinationCity: combo.destinationCity,
                destinationCityKorean: combo.destinationCityKorean,
                destinationCountry: combo.destinationCountry,
                flight: flight,
                searchDate: flight ? flight.departure.at.split('T')[0] : null
            };

            searchResults.push(result);

            if (!flight) {
                const msg = `      ${combo.originName} 출발 ${combo.destinationCity} 도착 항공권이 없습니다.`;
                logs.push(msg);
                console.log(msg);
            }

            if (flight) {
                const cityName = combo.destinationCityKorean || combo.destinationCity;
                const price = typeof flight.price.total === 'string' ? `${parseInt(flight.price.total).toLocaleString()}원` : `${flight.price.total} ${flight.price.currency}`;
                logs.push(`      ✅ ${cityName} 항공권 발견! (가격: ${price})`);
                console.log(`      ✅ ${cityName} 항공권 발견! (가격: ${price})`);
            }

        } catch (e: any) {
            logs.push(`      ⚠️ 검색 에러: ${e.message}`);
            // Push null result to keep index sync if needed, or just ignore
            searchResults.push({
                origin: combo.origin,
                originName: combo.originName,
                destination: combo.destination,
                destinationCity: combo.destinationCity,
                destinationCityKorean: combo.destinationCityKorean,
                destinationCountry: combo.destinationCountry,
                flight: null,
                searchDate: null
            });
        }
    }

    return {
        batchIndex: batchIndex + BATCH_SIZE,
        searchResults: searchResults,
        logs: logs // Return new logs for this step
    };
}


// --- Node 2c: Finalize (Phase 4-7) ---
export async function finalizeAutoPlanNode(state: AgentState) {
    const logs: string[] = [];
    const searchResults = state.searchResults || [];
    const query = state.query || "";

    logs.push(`✅ Phase 3 완료: ${searchResults.length}개 조합 검색 완료`);

    // ============================================
    // Phase 4: 항공편 결과 정렬 및 선택
    // ============================================
    logs.push("=".repeat(60));
    logs.push("Phase 4: 항공편 결과 정렬 및 선택");
    logs.push("=".repeat(60));

    // 4.1. 항공편이 있는 결과만 필터링
    const validResults = searchResults.filter(result => result.flight !== null);

    if (validResults.length === 0) {
        logs.push(`⚠️ 모든 조합에서 항공편을 찾을 수 없었습니다.`);
        return {
            answer: `Phase 3-4 완료: ${searchResults.length}개 조합을 모두 검색했으나, 당장 출발 가능한 항공편을 찾을 수 없었습니다.\n\n검색 범위: 오늘 날짜 및 내일 날짜\n결과: 항공편 없음`,
            foundFlights: [],
            foundRooms: [],
            logs
        };
    }

    logs.push(`📊 ${validResults.length}개 유효한 항공편 결과 발견`);

    // 4.2. Group by Destination City and find best flight for each city
    const bestFlightsByCity = new Map<string, any>();

    for (const result of validResults) {
        const cityKey = result.destinationCityKorean || result.destinationCity; // Group by Korean name if possible
        if (!bestFlightsByCity.has(cityKey)) {
            bestFlightsByCity.set(cityKey, result);
        } else {
            // Compare with existing best for this city
            const existing = bestFlightsByCity.get(cityKey);

            // Logic: Cheapest first
            const priceA = parseFloat(result.flight!.price.total);
            const priceB = parseFloat(existing.flight!.price.total);

            if (priceA < priceB) {
                bestFlightsByCity.set(cityKey, result);
            }
        }
    }

    // Convert map to array and sort by price (Cheapest destinations first)
    const topDestinations = Array.from(bestFlightsByCity.values())
        .sort((a, b) => {
            const priceA = parseFloat(a.flight!.price.total);
            const priceB = parseFloat(b.flight!.price.total);
            return priceA - priceB;
        })
        .slice(0, 5); // Top 5 destinations

    logs.push(`✅ 최종 선택된 TOP 5 여행지:`);
    topDestinations.forEach((dest, idx) => {
        const price = parseFloat(dest.flight!.price.total);
        logs.push(`   ${idx + 1}. ${dest.destinationCityKorean || dest.destinationCity} (항공권: ${Math.floor(price).toLocaleString()} ${dest.flight!.price.currency})`);
    });


    // ============================================
    // Phase 5: 숙소 검색 (Top 5 각각)
    // ============================================
    logs.push("=".repeat(60));
    logs.push("Phase 5: TOP 5 여행지별 숙소 검색");
    logs.push("=".repeat(60));

    // (Declarations and loop follow below)

    const finalOptions = [];
    const allFoundFlights: FlightOffer[] = [];
    const allFoundRooms: RoomListing[] = [];

    for (const dest of topDestinations) {
        const flightCost = parseFloat(dest.flight!.price.total);
        let flightCostKRW = flightCost;
        if (dest.flight!.price.currency !== "KRW") {
            flightCostKRW = flightCost * 1450; // Simplistic conversion
        }

        // Budget Logic
        const targetBudget = 1000000;
        const days = 6;
        const mealPrice = 15000;
        const mealsPerDay = 3;
        const estimatedMealCost = days * mealsPerDay * mealPrice;
        const remainingBudgetForRoom = targetBudget - flightCostKRW - estimatedMealCost;
        const maxPricePerNight = Math.floor(remainingBudgetForRoom / days);

        // Room Search
        // Use English city name for DB search if needed, usually passed as `location`
        const searchLocation = dest.destinationCity; // The DB uses English names usually? Or mixed?
        // Actually `searchStructuredRooms` does fuzzy search. Let's try English city name first.

        const rooms = await searchStructuredRooms({
            location: searchLocation, // e.g. "Fukuoka-City", "Osaka"
            maxPrice: Math.max(maxPricePerNight, 50000), // Min 50k guarantee
            limit: 1
        });

        const selectedRoom = rooms.length > 0 ? rooms[0] : null;

        allFoundFlights.push(dest.flight!);
        if (selectedRoom) allFoundRooms.push(selectedRoom);

        // Formatting for Prompt
        const linkDate = dest.searchDate?.slice(2).replace(/-/g, '') || "";
        const flightLink = `https://www.skyscanner.co.kr/transport/flights/${dest.origin.toLowerCase()}/${dest.destination.toLowerCase()}/${linkDate}`;
        const roomLink = selectedRoom ? `/rooms/${selectedRoom.id}` : "";

        finalOptions.push({
            city: dest.destinationCityKorean || dest.destinationCity,
            flight: dest.flight,
            flightCostKRW,
            room: selectedRoom,
            roomCostKRW: selectedRoom ? selectedRoom.price : null,
            totalCost: flightCostKRW + (selectedRoom ? selectedRoom.price * days : 0) + estimatedMealCost,
            flightLink,
            roomLink
        });
    }

    // ============================================
    // Phase 6 & 7: Final Resp
    // ============================================

    // Construct Prompt Context
    let context = `Found Top ${finalOptions.length} Options:\n\n`;
    finalOptions.forEach((opt, idx) => {
        const roomInfo = opt.room ? `${opt.room.title} (⭐ High Rating)` : "No Room Found";
        const roomLinkMd = opt.room ? `[숙소 보기](${opt.roomLink})` : "";
        const flightPriceStr = `${Math.floor(opt.flightCostKRW).toLocaleString()} KRW`;

        context += `Option ${idx + 1}: ${opt.city}\n`;
        context += ` - Flight: ${opt.flight!.airline} (${flightPriceStr}) [항공권 보기](${opt.flightLink})\n`;
        context += ` - Room: ${roomInfo} ${roomLinkMd}\n`;
        context += ` - Total Est Cost (6 days): ${Math.floor(opt.totalCost).toLocaleString()} KRW\n`;
        context += `--------------------------------------------------\n`;
    });

    // 7.2. AI Response
    const clientTime = new Date().toLocaleTimeString('ko-KR');
    const model = new ChatOpenAI({
        modelName: "gpt-4o-mini",
        openAIApiKey: process.env.OPENAI_API_KEY,
        temperature: 0.5 // Slightly lower temp for better formatting adherence
    });

    const prompt = ChatPromptTemplate.fromMessages([
        ["system", `You are a professional travel concierge.
        The user wants a trip recommendation. We found ${finalOptions.length} best options.
        
        Context:
        {context}
        
        Instructions:
        1. **Present ALL ${finalOptions.length} options** provided in the context. Do not skip any.
        2. Use the exact following Markdown format for EACH option:
        
           ## N. City Name
           **✈️ Flight**: Airline Name (Price in KRW) [Link]
           **🏨 Accommodation**: Hotel Name [Link]
           **💰 Total Estimated Cost (6 Days)**: Price KRW
           *(Brief 1-sentence description of why this city is good)*
           
           ---
        
        3. **Formatting Rules**:
           - Use "KRW" for currency (not "KR W").
           - Do not add random spaces inside words (e.g., use "후쿠오카" not "후 쿠오 카").
           - Make the links clickable and distinguishable.
           - Be concise and easy to read.
        
        4. End with a polite closing remark.
        `],
        ["human", "Please recommend these trips now."]
    ]);

    const chain = prompt.pipe(model).pipe(new StringOutputParser());
    const answer = await chain.invoke({ context, clientTime });

    logs.push(`✅ AI 응답 생성 완료`);

    return {
        answer,
        foundFlights: allFoundFlights,
        foundRooms: allFoundRooms,
        logs
    };
}


// --- Keep Existing Nodes ---
// (Copy previous emergency/budget/flight/greeter/searcher logic exactly as is or with minimal changes)

export async function emergencyNode(state: AgentState) {
    // Redirect to InitAutoPlan
    return initAutoPlanNode(state);
}

export async function budgetNode(state: AgentState) {
    // Redirect to InitAutoPlan
    return initAutoPlanNode(state);
}

export async function flightNode(state: AgentState) {
    const model = new ChatOpenAI({ modelName: "gpt-4o-mini", openAIApiKey: openAIKey });
    return { answer: "Flight Search Logic here..." };
}

export async function greeterNode(state: AgentState) {
    const model = new ChatOpenAI({ modelName: "gpt-4o-mini", openAIApiKey: openAIKey, temperature: 0.7 });
    const response = await ChatPromptTemplate.fromTemplate("Reply warmly to: {query}").pipe(model).pipe(new StringOutputParser()).invoke({ query: state.query });
    return { answer: response };
}

export async function searcherNode(state: AgentState) {
    const docs = await searchRooms(state.query);
    const context = docs.map((d: any) => d.pageContent).join("\n");
    const model = new ChatOpenAI({ modelName: "gpt-4o-mini", openAIApiKey: openAIKey });
    const response = await ChatPromptTemplate.fromTemplate(`Context: {context} \n\n Answer {query}`).pipe(model).pipe(new StringOutputParser()).invoke({ context, query: state.query });
    return { answer: response, context };
}

// Temporary alias for backward compatibility during refactor if needed, 
// but we will update graph.server.ts to use new nodes.
export const autoRecommendationNode = initAutoPlanNode;
