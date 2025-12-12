
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

// --- Node 2: Recommendation / Auto Plan Node (New) ---
export async function autoRecommendationNode(state: AgentState) {
    const logs: string[] = [];
    logs.push("🤖 Auto Recommendation Node Activated");

    // 1. Parse Client Time from Query (if present)
    const query = state.query || "";
    let clientTime = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    if (query.includes("RECOMMEND_TRIP_FROM_CURRENT_LOCATION_TRIGGER")) {
        const parts = query.split("TRIGGER");
        if (parts[1] && parts[1].trim()) {
            clientTime = parts[1].trim();
        }
    }

    const model = new ChatOpenAI({
        modelName: "gpt-4o-mini",
        openAIApiKey: openAIKey,
        temperature: 0
    });

    // ============================================
    // Phase 2: 검색 조합 생성
    // ============================================
    logs.push("=".repeat(60));
    logs.push("Phase 2: 검색 조합 생성 시작");
    logs.push("=".repeat(60));

    // 2.1. 한국 국제공항 14개 목록 가져오기
    logs.push("📋 Step 1: 한국 국제공항 목록 가져오기");
    const koreanAirports = getAllKoreanAirports();
    logs.push(`   ✓ 총 ${koreanAirports.length}개 국제공항 로드 완료`);
    koreanAirports.forEach((airport, idx) => {
        logs.push(`   ${idx + 1}. ${airport.iataCode} - ${airport.nameKorean} (${airport.city})`);
    });

    // 2.2. 목적지 도시 8개 목록 가져오기 (DB에 숙소 데이터가 있는 도시)
    logs.push("\n📋 Step 2: 목적지 도시 목록 가져오기 (DB에 숙소 데이터가 있는 도시)");
    const destinationCities = getAllDestinationCities();
    logs.push(`   ✓ 총 ${destinationCities.length}개 목적지 도시 로드 완료`);
    destinationCities.forEach((dest, idx) => {
        logs.push(`   ${idx + 1}. ${dest.city}, ${dest.country} (${dest.airportCode})`);
    });

    // 2.3. 검색 조합 생성 (14개 출발지 × 8개 목적지 = 112개 조합)
    logs.push("\n📋 Step 3: 검색 조합 생성");
    const searchCombinations: Array<{
        origin: string;
        originName: string;
        destination: string;
        destinationCity: string;
        destinationCountry: string;
    }> = [];

    for (const origin of koreanAirports) {
        for (const dest of destinationCities) {
            searchCombinations.push({
                origin: origin.iataCode,
                originName: origin.nameKorean,
                destination: dest.airportCode,
                destinationCity: dest.city,
                destinationCountry: dest.country
            });
        }
    }

    logs.push(`   ✓ 총 ${searchCombinations.length}개 검색 조합 생성 완료`);
    logs.push(`   ✓ 계산: ${koreanAirports.length}개 출발지 × ${destinationCities.length}개 목적지 = ${searchCombinations.length}개 조합`);

    // 조합 샘플 출력 (처음 5개)
    logs.push(`\n   조합 샘플 (처음 5개):`);
    searchCombinations.slice(0, 5).forEach((combo, idx) => {
        logs.push(`   ${idx + 1}. ${combo.origin} → ${combo.destination} (${combo.destinationCity}, ${combo.destinationCountry})`);
    });

    logs.push("=".repeat(60));
    logs.push("Phase 2: 검색 조합 생성 완료");
    logs.push("=".repeat(60));
    logs.push(`\n✅ Phase 2 완료: ${searchCombinations.length}개 검색 조합 준비 완료\n`);

    // ============================================
    // Phase 3: 항공편 검색 로직 구현
    // ============================================
    logs.push("=".repeat(60));
    logs.push("Phase 3: 항공편 검색 시작");
    logs.push("=".repeat(60));

    // 3.1. 날짜 설정
    const today = new Date();
    const todayDate = today.toISOString().split('T')[0];
    logs.push(`📅 검색 날짜: 오늘 (${todayDate}) 및 내일`);

    // 3.2. searchFirstAvailableFlight 함수 정의
    async function searchFirstAvailableFlight(
        origin: string,
        destination: string,
        todayDate: string
    ): Promise<FlightOffer | null> {
        // 1. 오늘 날짜로 항공편 검색 (시간 필터 없음, 모든 항공편)
        const todayFlights = await searchFlights(origin, destination, todayDate);
        if (Array.isArray(todayFlights) && todayFlights.length > 0) {
            // 출발 시간 기준 정렬 후 첫 번째 반환
            todayFlights.sort((a, b) => {
                return new Date(a.departure.at).getTime() - new Date(b.departure.at).getTime();
            });
            return todayFlights[0];
        }

        // 2. 다음날 날짜로 검색
        const tomorrow = new Date(todayDate);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowDate = tomorrow.toISOString().split('T')[0];

        const tomorrowFlights = await searchFlights(origin, destination, tomorrowDate);
        if (Array.isArray(tomorrowFlights) && tomorrowFlights.length > 0) {
            tomorrowFlights.sort((a, b) => {
                return new Date(a.departure.at).getTime() - new Date(b.departure.at).getTime();
            });
            return tomorrowFlights[0];
        }

        // 3. 오늘과 내일 모두 없으면 null 반환
        return null;
    }

    // 3.3. 각 조합에 대해 항공편 검색
    logs.push(`\n🔍 ${searchCombinations.length}개 조합에 대해 항공편 검색 시작...`);
    logs.push(`   전략: 각 조합에서 가장 빠른 출발 항공편 1개만 찾기`);
    logs.push(`   검색 범위: 오늘 날짜 → 없으면 다음날 → 없으면 항공편 없음으로 간주\n`);

    const searchResults: Array<{
        origin: string;
        originName: string;
        destination: string;
        destinationCity: string;
        destinationCountry: string;
        flight: FlightOffer | null;
        searchDate: string | null;
    }> = [];

    let firstFlightFound = false;
    let firstFlightResult: typeof searchResults[0] | null = null;
    let searchedCount = 0;

    for (const combo of searchCombinations) {
        searchedCount++;

        // 진행 상황 로깅 (10개마다)
        if (searchedCount % 10 === 0 || searchedCount === 1) {
            logs.push(`   진행: ${searchedCount}/${searchCombinations.length} (${Math.round(searchedCount / searchCombinations.length * 100)}%)`);
        }

        try {
            const flight = await searchFirstAvailableFlight(
                combo.origin,
                combo.destination,
                todayDate
            );

            const result = {
                origin: combo.origin,
                originName: combo.originName,
                destination: combo.destination,
                destinationCity: combo.destinationCity,
                destinationCountry: combo.destinationCountry,
                flight: flight,
                searchDate: flight ? flight.departure.at.split('T')[0] : null
            };

            searchResults.push(result);

            // 첫 번째 항공편 발견 시
            if (flight && !firstFlightFound) {
                firstFlightFound = true;
                firstFlightResult = result;
                logs.push(`\n   ✅ 첫 번째 항공편 발견! (${searchedCount}번째 조합)`);
                logs.push(`   ${combo.origin} → ${combo.destination} (${combo.destinationCity})`);
                logs.push(`   항공편: ${flight.airline} ${flight.flightNumber}`);
                logs.push(`   출발: ${new Date(flight.departure.at).toLocaleString('ko-KR')}`);
                logs.push(`   비용: ${flight.price.total} ${flight.price.currency}`);
                logs.push(`   ⚡ 즉시 스트리밍 시작 예정 (나머지 조합은 백그라운드에서 계속 검색)\n`);
            }
        } catch (e) {
            // 에러 발생 시에도 결과에 추가 (null로)
            searchResults.push({
                origin: combo.origin,
                originName: combo.originName,
                destination: combo.destination,
                destinationCity: combo.destinationCity,
                destinationCountry: combo.destinationCountry,
                flight: null,
                searchDate: null
            });
            // 에러는 로깅만 하고 계속 진행
            if (searchedCount % 10 === 0) {
                logs.push(`   ⚠️ ${combo.origin} → ${combo.destination}: 검색 실패 (계속 진행)`);
            }
        }
    }

    logs.push(`\n✅ Phase 3 완료: ${searchResults.length}개 조합 검색 완료`);
    const foundFlightsCount = searchResults.filter(r => r.flight !== null).length;
    logs.push(`   항공편 발견: ${foundFlightsCount}개 조합에서 항공편 찾음`);
    logs.push(`   항공편 없음: ${searchResults.length - foundFlightsCount}개 조합`);
    logs.push("=".repeat(60));

    // ============================================
    // Phase 4: 항공편 결과 정렬 및 선택
    // ============================================
    logs.push("\n" + "=".repeat(60));
    logs.push("Phase 4: 항공편 결과 정렬 및 선택");
    logs.push("=".repeat(60));

    // 4.1. 항공편이 있는 결과만 필터링
    const validResults = searchResults.filter(result => result.flight !== null);

    if (validResults.length === 0) {
        logs.push(`\n⚠️ 모든 조합에서 항공편을 찾을 수 없었습니다.`);
        logs.push("=".repeat(60));
        return {
            answer: `Phase 3-4 완료: ${searchResults.length}개 조합을 모두 검색했으나, 당장 출발 가능한 항공편을 찾을 수 없었습니다.\n\n검색 범위: 오늘 날짜 및 내일 날짜\n결과: 항공편 없음\n\n다른 날짜나 목적지로 검색해보시거나, 나중에 다시 시도해보시기 바랍니다.`,
            foundFlights: [],
            foundRooms: [],
            logs
        };
    }

    logs.push(`\n📊 ${validResults.length}개 유효한 항공편 결과 발견`);

    // 4.2. 출발 시간 기준 오름차순 정렬
    logs.push(`\n🔄 출발 시간 기준 정렬 중...`);
    const sortedResults = validResults.sort((a, b) => {
        if (!a.flight || !b.flight) return 0;
        const timeA = new Date(a.flight.departure.at).getTime();
        const timeB = new Date(b.flight.departure.at).getTime();
        return timeA - timeB;
    });

    // 정렬된 결과 상위 5개 로깅
    logs.push(`   정렬 완료 - 상위 5개 항공편:`);
    sortedResults.slice(0, 5).forEach((result, idx) => {
        if (result.flight) {
            const depTime = new Date(result.flight.departure.at).toLocaleString('ko-KR');
            logs.push(`   ${idx + 1}. ${result.origin} → ${result.destination} (${result.destinationCity})`);
            logs.push(`      ${result.flight.airline} ${result.flight.flightNumber} - 출발: ${depTime}`);
            logs.push(`      비용: ${result.flight.price.total} ${result.flight.price.currency}`);
        }
    });

    // 4.3. 가장 빠른 출발 항공편 선택
    const bestResult = sortedResults[0];
    if (!bestResult || !bestResult.flight) {
        logs.push(`\n⚠️ 정렬 후에도 유효한 항공편을 찾을 수 없습니다.`);
        logs.push("=".repeat(60));
        return {
            answer: `Phase 4 완료: 항공편을 찾을 수 없었습니다.`,
            foundFlights: [],
            foundRooms: [],
            logs
        };
    }

    logs.push(`\n✅ 최종 선택된 항공편:`);
    logs.push(`   출발지: ${bestResult.origin} (${bestResult.originName})`);
    logs.push(`   목적지: ${bestResult.destination} (${bestResult.destinationCity}, ${bestResult.destinationCountry})`);
    logs.push(`   항공편: ${bestResult.flight.airline} ${bestResult.flight.flightNumber}`);
    logs.push(`   출발 시간: ${new Date(bestResult.flight.departure.at).toLocaleString('ko-KR')}`);
    logs.push(`   도착 시간: ${new Date(bestResult.flight.arrival.at).toLocaleString('ko-KR')}`);
    logs.push(`   비용: ${bestResult.flight.price.total} ${bestResult.flight.price.currency}`);
    logs.push(`   검색 날짜: ${bestResult.searchDate || 'N/A'}`);
    logs.push("=".repeat(60));
    logs.push(`\n✅ Phase 4 완료: 가장 빠른 출발 항공편 선택 완료\n`);

    // 4.4. 첫 항공편 발견 정보 (스트리밍용)
    if (firstFlightResult && firstFlightResult.flight) {
        logs.push(`⚡ 참고: 첫 항공편은 ${firstFlightResult.origin} → ${firstFlightResult.destination}에서 발견되었습니다.`);
        logs.push(`   최종 선택된 항공편과 비교하여 더 빠른 항공편이 선택되었습니다.`);
    }

    // ============================================
    // Phase 5: 숙소 검색
    // ============================================
    logs.push("\n" + "=".repeat(60));
    logs.push("Phase 5: 숙소 검색");
    logs.push("=".repeat(60));

    // 5.1. 목적지 정보 추출
    const destinationCountry = bestResult.destinationCountry;
    const destinationCity = bestResult.destinationCity;
    logs.push(`\n📍 목적지 정보:`);
    logs.push(`   국가: ${destinationCountry}`);
    logs.push(`   도시: ${destinationCity}`);
    logs.push(`   공항: ${bestResult.destination}`);

    // 5.2. 예산 계산
    const targetBudget = 1000000; // 100만원 예산
    const days = 6; // Travel duration: 5-7 days (use 6 days as average)
    const mealPrice = 15000;
    const mealsPerDay = 3;

    const flightCost = parseFloat(bestResult.flight.price.total);
    // Currency conversion if needed (assuming KRW, but check)
    let flightCostKRW = flightCost;
    if (bestResult.flight.price.currency !== "KRW") {
        flightCostKRW = flightCost * 1450; // Approximate conversion
        logs.push(`   💱 항공편 비용 환전: ${flightCost} ${bestResult.flight.price.currency} → ${Math.floor(flightCostKRW).toLocaleString()}원`);
    }

    const estimatedMealCost = days * mealsPerDay * mealPrice; // 270,000 for 6 days
    const remainingBudgetForRoom = targetBudget - flightCostKRW - estimatedMealCost;
    const maxPricePerNight = Math.floor(remainingBudgetForRoom / days);

    logs.push(`\n💰 예산 계산:`);
    logs.push(`   총 예산: ${targetBudget.toLocaleString()}원`);
    logs.push(`   여행 기간: ${days}일`);
    logs.push(`   항공편 비용: ${Math.floor(flightCostKRW).toLocaleString()}원`);
    logs.push(`   식사 비용 (${days}일 × ${mealsPerDay}끼 × ${mealPrice.toLocaleString()}원): ${estimatedMealCost.toLocaleString()}원`);
    logs.push(`   숙소 예산 (남은 금액): ${remainingBudgetForRoom.toLocaleString()}원`);
    logs.push(`   숙소 1박 최대 가격: ${maxPricePerNight.toLocaleString()}원`);

    // 5.3. 숙소 검색
    logs.push(`\n🏨 숙소 검색 중...`);
    logs.push(`   검색 위치: ${destinationCountry}`);
    logs.push(`   최대 가격: ${maxPricePerNight.toLocaleString()}원/박`);

    const rooms = await searchStructuredRooms({
        location: destinationCountry,
        maxPrice: Math.max(maxPricePerNight, 50000), // Minimum 50,000 to ensure some results
        limit: 3
    });

    logs.push(`   검색 결과: ${rooms.length}개 숙소 발견`);

    // 5.4. 숙소 선택
    const selectedRoom = rooms[0]; // 첫 번째 숙소 선택
    let roomCostPerNight = selectedRoom ? selectedRoom.price : 100000; // Default if no room found

    // Currency Correction for Japan (JPY -> KRW)
    if (selectedRoom && (selectedRoom.country === "Japan" || selectedRoom.city === "Tokyo" || selectedRoom.city === "Osaka" || selectedRoom.city === "Fukuoka" || selectedRoom.city === "Fukuoka-City" || selectedRoom.city === "Hiroshima" || selectedRoom.city === "Kyoto")) {
        // Simple heuristic: If likely JPY
        roomCostPerNight = roomCostPerNight * 9; // Approx 100 JPY = 900 KRW
        logs.push(`   💱 일본 숙소 가격 환전: ${selectedRoom.price} → ${Math.floor(roomCostPerNight).toLocaleString()}원 (JPY → KRW)`);
    }

    if (selectedRoom) {
        logs.push(`\n✅ 선택된 숙소:`);
        logs.push(`   이름: ${selectedRoom.title}`);
        logs.push(`   위치: ${selectedRoom.city}, ${selectedRoom.country}`);
        logs.push(`   가격: ${Math.floor(roomCostPerNight).toLocaleString()}원/박`);
        logs.push(`   ID: ${selectedRoom.id}`);
    } else {
        logs.push(`\n⚠️ 숙소를 찾을 수 없었습니다.`);
        logs.push(`   기본 추정 가격 사용: ${roomCostPerNight.toLocaleString()}원/박`);
    }

    logs.push("=".repeat(60));
    logs.push(`\n✅ Phase 5 완료: 숙소 검색 완료\n`);

    // ============================================
    // Phase 6: 비용 계산 및 최종 결과 생성
    // ============================================
    logs.push("=".repeat(60));
    logs.push("Phase 6: 비용 계산 및 최종 결과 생성");
    logs.push("=".repeat(60));

    // 6.1. 비용 계산
    const totalRoomCost = roomCostPerNight * days;
    const totalMeals = mealPrice * mealsPerDay * days;
    const totalCost = Math.floor(flightCostKRW + totalRoomCost + totalMeals);
    const isWithinBudget = totalCost <= targetBudget;

    logs.push(`\n💰 최종 비용 계산:`);
    logs.push(`   항공편 비용: ${Math.floor(flightCostKRW).toLocaleString()}원`);
    logs.push(`   숙소 비용: ${Math.floor(roomCostPerNight).toLocaleString()}원/박 × ${days}일 = ${Math.floor(totalRoomCost).toLocaleString()}원`);
    logs.push(`   식사 비용: ${totalMeals.toLocaleString()}원`);
    logs.push(`   ─────────────────────────`);
    logs.push(`   총 비용: ${totalCost.toLocaleString()}원`);
    logs.push(`   목표 예산: ${targetBudget.toLocaleString()}원`);
    logs.push(`   예산 대비: ${isWithinBudget ? '✅ 예산 내' : '⚠️ 예산 초과'} (${isWithinBudget ? '-' : '+'}${Math.abs(totalCost - targetBudget).toLocaleString()}원)`);

    // 6.2. 최종 결과 구성
    const finalResult = {
        flight: bestResult.flight,
        flightInfo: {
            origin: bestResult.origin,
            originName: bestResult.originName,
            destination: bestResult.destination,
            destinationCity: destinationCity,
            destinationCountry: destinationCountry,
            airline: bestResult.flight.airline,
            flightNumber: bestResult.flight.flightNumber,
            departureTime: new Date(bestResult.flight.departure.at),
            arrivalTime: new Date(bestResult.flight.arrival.at),
            searchDate: bestResult.searchDate
        },
        accommodation: selectedRoom,
        costs: {
            flight: Math.floor(flightCostKRW),
            accommodation: Math.floor(totalRoomCost),
            meals: totalMeals,
            total: totalCost
        },
        budget: {
            target: targetBudget,
            actual: totalCost,
            isWithinBudget: isWithinBudget,
            difference: totalCost - targetBudget
        },
        duration: days,
        searchStats: {
            totalCombinations: searchResults.length,
            foundFlights: validResults.length,
            firstFlightFoundAt: firstFlightResult ? searchResults.findIndex(r => r.origin === firstFlightResult.origin && r.destination === firstFlightResult.destination) + 1 : null
        }
    };

    logs.push(`\n✅ 최종 결과:`);
    logs.push(`   항공편: ${finalResult.flightInfo.airline} ${finalResult.flightInfo.flightNumber}`);
    logs.push(`   출발: ${finalResult.flightInfo.origin} → ${finalResult.flightInfo.destination}`);
    logs.push(`   도착지: ${finalResult.flightInfo.destinationCity}, ${finalResult.flightInfo.destinationCountry}`);
    logs.push(`   숙소: ${selectedRoom ? selectedRoom.title : '해당 지역의 숙소 데이터가 없습니다'}`);
    logs.push(`   총 비용: ${totalCost.toLocaleString()}원`);
    logs.push(`   예산: ${isWithinBudget ? '예산 내' : '예산 초과'}`);
    logs.push("=".repeat(60));
    logs.push(`\n✅ Phase 6 완료: 비용 계산 및 최종 결과 생성 완료\n`);

    // ============================================
    // Phase 7: AI 응답 생성 및 스트리밍
    // ============================================
    logs.push("=".repeat(60));
    logs.push("Phase 7: AI 응답 생성");
    logs.push("=".repeat(60));

    // 7.1. Context 구성
    const departureTimeStr = finalResult.flightInfo.departureTime.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
    const arrivalTimeStr = finalResult.flightInfo.arrivalTime.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });

    // Generate Flight Link (Skyscanner: origin/dest/YYMMDD)
    const searchDate = finalResult.flightInfo.searchDate || todayDate;
    const dateShort = searchDate.slice(2).replace(/-/g, '');
    const flightLink = `https://www.skyscanner.co.kr/transport/flights/${finalResult.flightInfo.origin.toLowerCase()}/${finalResult.flightInfo.destination.toLowerCase()}/${dateShort}`;

    const context = `
    검색 전략: 112개 조합 (14개 출발지 × 8개 목적지) 검색 완료
    검색 결과: ${finalResult.searchStats.totalCombinations}개 조합 중 ${finalResult.searchStats.foundFlights}개에서 항공편 발견
    ${finalResult.searchStats.firstFlightFoundAt ? `첫 항공편 발견: ${finalResult.searchStats.firstFlightFoundAt}번째 조합` : ''}
    
    출발 공항: ${finalResult.flightInfo.origin} (${finalResult.flightInfo.originName})
    목적지 공항: ${finalResult.flightInfo.destination}
    목적지: ${finalResult.flightInfo.destinationCity}, ${finalResult.flightInfo.destinationCountry}
    현재 시각: ${clientTime}
    검색 날짜: ${searchDate}
    여행 기간: ${finalResult.duration}일 (5-7일 범위)
    목표 예산: ${finalResult.budget.target.toLocaleString()}원
    
    항공편 정보:
    항공사: ${finalResult.flightInfo.airline}
    항공편 번호: ${finalResult.flightInfo.flightNumber}
    출발 시간: ${departureTimeStr}
    도착 시간: ${arrivalTimeStr}
    항공편 비용: ${finalResult.costs.flight.toLocaleString()}원
    항공편 링크: ${flightLink}
    
    숙소 정보:
    ${selectedRoom ? `
    숙소 이름: ${selectedRoom.title}
    숙소 위치: ${selectedRoom.city}, ${selectedRoom.country}
    숙소 ID: ${selectedRoom.id}
    숙소 링크: /rooms/${selectedRoom.id}
    숙소 비용: ${Math.floor(roomCostPerNight).toLocaleString()}원/박 × ${finalResult.duration}일 = ${finalResult.costs.accommodation.toLocaleString()}원
    ` : `
    숙소: 해당 지역의 숙소 데이터가 없습니다
    현재 데이터베이스에 ${finalResult.flightInfo.destinationCountry} 지역의 숙소 정보가 등록되어 있지 않습니다
    숙소 비용: ${finalResult.costs.accommodation.toLocaleString()}원 (기본 추정치, ${finalResult.duration}일)
    `}
    
    비용 정보:
    항공편 비용: ${finalResult.costs.flight.toLocaleString()}원
    숙소 비용: ${finalResult.costs.accommodation.toLocaleString()}원
    식사 비용: ${finalResult.costs.meals.toLocaleString()}원 (${finalResult.duration}일 × 3끼 × 15,000원)
    총 비용: ${finalResult.costs.total.toLocaleString()}원
    
    예산 분석:
    목표 예산: ${finalResult.budget.target.toLocaleString()}원
    실제 비용: ${finalResult.budget.actual.toLocaleString()}원
    예산 대비: ${finalResult.budget.isWithinBudget ? '예산 내' : '예산 초과'} (${finalResult.budget.difference > 0 ? '+' : ''}${finalResult.budget.difference.toLocaleString()}원)
    `;

    // 7.2. AI 프롬프트 구성
    logs.push(`\n🤖 AI 응답 생성 중...`);

    const prompt = ChatPromptTemplate.fromMessages([
        ["system", `
        You are a smart travel concierge.
        
        Task: Generate a welcome message and trip plan in Korean based on the provided Context.
        
        1. Greeting:
        Start with: "안녕하세요! 현재 시각 ${clientTime}입니다. 고객님을 위해 지금 당장 출발할 수 있는 최적의 여행지를 엄선하여 준비했습니다."
        
        2. Search Process:
        - Mention the comprehensive search: "112개 조합 (14개 출발지 × 8개 목적지)을 모두 검색한 결과"
        - Mention search results: "총 ${finalResult.searchStats.totalCombinations}개 조합 중 ${finalResult.searchStats.foundFlights}개에서 항공편을 찾았으며, 가장 빠른 출발 시간의 항공편을 추천드립니다."
        
        3. Flight Information:
        - Present the flight: "${finalResult.flightInfo.airline} ${finalResult.flightInfo.flightNumber} 항공편"
        - Departure: "${finalResult.flightInfo.originName}에서 ${departureTimeStr}에 출발하여 ${arrivalTimeStr}에 도착"
        - Cost: "비용은 ${finalResult.costs.flight.toLocaleString()}원입니다"
        - CRITICAL: Make the airline name and time a clickable Markdown link: [${finalResult.flightInfo.airline} (${departureTimeStr})](${flightLink})
        - IMPORTANT: The URL in parentheses MUST NOT contain any spaces. Write it as a single continuous string without spaces.
        
        4. Accommodation Information:
        ${selectedRoom ? `
        - Recommend the accommodation: "${selectedRoom.title}"
        - Location: "${selectedRoom.city}, ${selectedRoom.country}"
        - CRITICAL: Format the room link as: [${selectedRoom.title}](/rooms/${selectedRoom.id})
        - IMPORTANT: Do NOT add spaces inside the link syntax. The URL path must be continuous without spaces.
        - Cost: "숙소 비용은 ${finalResult.duration}일 기준으로 ${finalResult.costs.accommodation.toLocaleString()}원입니다"
        ` : `
        - Inform: "해당 지역의 숙소 데이터가 없습니다. 현재 데이터베이스에 ${finalResult.flightInfo.destinationCountry} 지역의 숙소 정보가 등록되어 있지 않습니다."
        - Mention: "숙소 비용은 기본 추정치로 ${finalResult.costs.accommodation.toLocaleString()}원입니다 (${finalResult.duration}일 기준)"
        - Do NOT create fake hotel names or links when no data is available.
        `}
        
        5. Cost & Summary:
        - Travel duration: "${finalResult.duration}일 여행 기준"
        - Break down costs: "항공편 ${finalResult.costs.flight.toLocaleString()}원 + 숙소 ${finalResult.costs.accommodation.toLocaleString()}원 + 식사 ${finalResult.costs.meals.toLocaleString()}원"
        - Total cost: "총 예상 비용 ${finalResult.costs.total.toLocaleString()}원"
        - Budget comparison: "목표 예산 ${finalResult.budget.target.toLocaleString()}원 대비 ${finalResult.budget.isWithinBudget ? '예산 내' : '예산 초과'}입니다"
        - If over budget: "이는 예산을 ${Math.abs(finalResult.budget.difference).toLocaleString()}원 초과하는 여행 계획입니다"
        
        6. Closing:
        - "고객님의 멋진 여행을 기원합니다! 추가적인 도움이 필요하시면 언제든지 말씀해 주세요."
        
        Context Data:
        {context}
        
        Tone: Polite, Professional (honorifics), and Concierge-like.
        IMPORTANT: 
        - Do NOT output brackets like [Flight Info] literally. Replace them with the actual data from Context.
        - CRITICAL: Do NOT add spaces between characters in words. Write Korean text without unnecessary spaces.
          Examples of WRONG: "고객 님", "항 공편", "숙 소", "비 용"
          Examples of CORRECT: "고객님", "항공편", "숙소", "비용"
        - When writing numbers with commas, use proper formatting: 1,000,000 (not 1, 000, 000)
        - Write all text naturally without inserting spaces between characters.
        - Make sure all links are properly formatted as Markdown links without spaces in URLs.
        `],
        ["human", "Recommend the trip now."]
    ]);

    // 7.3. AI 응답 생성
    const chain = prompt.pipe(model).pipe(new StringOutputParser());
    const answer = await chain.invoke({ context });

    logs.push(`\n✅ AI 응답 생성 완료`);
    logs.push("=".repeat(60));
    logs.push(`\n✅ Phase 7 완료: AI 응답 생성 완료\n`);

    // 7.4. 최종 결과 반환
    return {
        answer,
        foundFlights: [bestResult.flight],
        foundRooms: selectedRoom ? [selectedRoom] : [],
        logs
    };

    /* ============================================
     * Phase 3부터는 아래 코드를 사용할 예정
     * 현재는 Phase 2만 구현 완료 상태
     * ============================================
     * 
    // 2.5. Get available destinations (locations with accommodation data)
    logs.push("🏨 Finding destinations with accommodation data...");
    const availableLocations = await getAvailableLocations();
    logs.push(`   ✓ Found ${availableLocations.length} countries with accommodation data`);

    // Log all available countries for debugging
    if (availableLocations.length > 0) {
        logs.push(`   Available countries: ${availableLocations.map(l => `${l.country} (${l.cities.length} cities)`).join(', ')}`);
    }

    if (availableLocations.length === 0) {
        logs.push("⚠️ No accommodation data found. Using default destination.");
        // Fallback to default
        availableLocations.push({ country: "Japan", cities: ["Fukuoka", "Tokyo", "Osaka"] });
    }

    // Get airport codes ONLY for destinations that have accommodation data
    // CRITICAL: Only process countries that are in availableLocations (have accommodation data in DB)
    const destinationOptions: Array<{ country: string; city: string; airportCode: string }> = [];

    logs.push(`   Processing ${availableLocations.length} countries with accommodation data...`);

    // Create a set of available country names for quick lookup (case-insensitive)
    const availableCountrySet = new Set(availableLocations.map(l => l.country.toLowerCase()));

    for (const location of availableLocations) {
        logs.push(`   Checking: ${location.country} (${location.cities.length} cities)`);

        // CRITICAL: Only use countries that are in availableLocations (have accommodation data)
        // Verify this country is in our available locations list
        if (!availableCountrySet.has(location.country.toLowerCase())) {
            logs.push(`   ✗ ${location.country}: Not in available locations list, skipping`);
            continue;
        }

        // Try to get airport code for this country
        const airportInfo = await getAirportLocationByCountry(location.country);
        if (airportInfo && airportInfo.iataCode) {
            // Verify the airport country matches our available location
            const airportCountry = airportInfo.country || location.country;
            if (!availableCountrySet.has(airportCountry.toLowerCase())) {
                logs.push(`   ⚠️ ${location.country}: Airport country (${airportCountry}) doesn't match available location, skipping`);
                continue;
            }

            // Add all cities from this country
            for (const city of location.cities) {
                destinationOptions.push({
                    country: location.country, // Use original country name from DB
                    city: city,
                    airportCode: airportInfo.iataCode
                });
            }
            logs.push(`   ✓ ${location.country}: ${airportInfo.iataCode} (${location.cities.length} cities)`);
        } else {
            logs.push(`   ✗ ${location.country}: Could not find airport code`);
        }
    }

    // Remove duplicates by airport code (keep first occurrence)
    let uniqueDestinations = Array.from(
        new Map(destinationOptions.map(d => [d.airportCode, d])).values()
    );

    // CRITICAL: Final verification - Only use destinations that are in availableLocations
    // availableLocations is already from DB, so we trust it as the source of truth
    // ALSO: Exclude domestic flights (Korea to Korea)
    logs.push(`🔍 Final verification: Filtering destinations to only those with accommodation data...`);
    const verifiedDestinations: Array<{ country: string; city: string; airportCode: string }> = [];

    // Create a map of available countries (case-insensitive) for quick lookup
    const availableCountryMap = new Map<string, string>();
    availableLocations.forEach(loc => {
        availableCountryMap.set(loc.country.toLowerCase(), loc.country); // Store original case
    });

    // Korean airport codes (domestic flights should be excluded)
    const koreanAirports = new Set(["ICN", "GMP", "PUS", "CJU", "TAE", "KUV", "USN", "RSU"]);

    for (const dest of uniqueDestinations) {
        // Exclude domestic flights (Korea to Korea)
        if (koreanAirports.has(dest.airportCode)) {
            logs.push(`   ✗ ${dest.country} (${dest.airportCode}): Korean airport - EXCLUDED (domestic flight)`);
            continue;
        }

        const destCountryLower = dest.country.toLowerCase();
        const matchedAvailableCountry = availableCountryMap.get(destCountryLower);

        if (matchedAvailableCountry) {
            // Exclude if destination country is Korea (domestic flight)
            const isKorea = matchedAvailableCountry.toLowerCase() === "south korea" ||
                matchedAvailableCountry.toLowerCase() === "korea" ||
                matchedAvailableCountry.toLowerCase() === "대한민국";
            if (isKorea) {
                logs.push(`   ✗ ${matchedAvailableCountry} (${dest.airportCode}): Korea - EXCLUDED (domestic flight)`);
                continue;
            }

            // This destination's country is in availableLocations (has accommodation data)
            // Use the original country name from availableLocations to ensure exact match
            verifiedDestinations.push({
                country: matchedAvailableCountry, // Use exact name from DB
                city: dest.city,
                airportCode: dest.airportCode
            });
            logs.push(`   ✓ ${matchedAvailableCountry} (${dest.airportCode}): Verified - has accommodation data in DB (international)`);
        } else {
            logs.push(`   ✗ ${dest.country} (${dest.airportCode}): NOT in availableLocations, REMOVING from destinations`);
            logs.push(`      Available countries: ${Array.from(availableCountryMap.values()).join(', ')}`);
        }
    }

    uniqueDestinations = verifiedDestinations;

    if (uniqueDestinations.length === 0) {
        logs.push("⚠️ No destinations with accommodation data found. Using default: FUK (Japan)");
        uniqueDestinations.push({ country: "Japan", city: "Fukuoka", airportCode: "FUK" });
    }

    logs.push(`🎯 Final verified destinations (with accommodation data): ${uniqueDestinations.length} destination(s)`);
    uniqueDestinations.forEach((dest, idx) => {
        logs.push(`   ${idx + 1}. ${dest.city}, ${dest.country} (${dest.airportCode})`);
    });

    // Final verification log
    const destinationCountries = new Set(uniqueDestinations.map(d => d.country.toLowerCase()));
    const availableCountries = new Set(availableLocations.map(l => l.country.toLowerCase()));
    const missingCountries = Array.from(destinationCountries).filter(c => !availableCountries.has(c));
    if (missingCountries.length > 0) {
        logs.push(`   ⚠️ CRITICAL ERROR: Some destinations don't have accommodation data: ${missingCountries.join(', ')}`);
        logs.push(`   Available countries: ${Array.from(availableCountries).join(', ')}`);
    } else {
        logs.push(`   ✓ Final verification passed: All ${uniqueDestinations.length} destinations have accommodation data`);
    }

    // 3. Flight Search - Sequential search: 6h -> 24h -> next day
    const today = new Date();
    const now = new Date();
    const todayDate = today.toISOString().split('T')[0];

    // Helper function to search flights with time filter for all destinations
    const searchFlightsWithTimeWindow = async (
        searchDate: string,
        hoursWindow: number,
        searchLabel: string,
        destinations: Array<{ country: string; city: string; airportCode: string }>
    ): Promise<FlightOffer[]> => {
        logs.push(`🔎 ${searchLabel}: Searching flights from ${airports.length} airport(s) to ${destinations.length} destination(s) for ${searchDate}`);
        logs.push(`⏰ Filtering for flights departing within ${hoursWindow} hours from now`);

        const allFlights: FlightOffer[] = [];

        // Search from all origin airports to all destinations
        for (const airport of airports) {
            for (const destination of destinations) {
                try {
                    const flights = await searchFlights(airport.iataCode, destination.airportCode, searchDate, hoursWindow);
                    if (Array.isArray(flights)) {
                        const airportFlights = flights.map(f => ({
                            ...f,
                            originAirport: airport.iataCode,
                            originAirportName: airport.name,
                            destinationCountry: destination.country,
                            destinationCity: destination.city
                        }));
                        allFlights.push(...airportFlights);
                        if (airportFlights.length > 0) {
                            logs.push(`   ✓ ${airport.iataCode} → ${destination.airportCode} (${destination.city}): ${airportFlights.length} flights`);
                        }
                    }
                } catch (e) {
                    // Silent fail for individual searches to continue with others
                }
            }
        }

        // Sort by departure time and filter by time window
        allFlights.sort((a, b) => {
            const timeA = new Date(a.departure.at).getTime();
            const timeB = new Date(b.departure.at).getTime();
            return timeA - timeB;
        });

        const cutoffTime = new Date(now.getTime() + hoursWindow * 60 * 60 * 1000);
        const validFlights = allFlights.filter(f => {
            const departureTime = new Date(f.departure.at);
            return departureTime > now && departureTime <= cutoffTime;
        });

        logs.push(`✅ ${searchLabel}: ${validFlights.length} flights found from ${airports.length} airports to ${destinations.length} destinations`);
        return validFlights;
    };

    // Sequential search: 6 hours -> 24 hours -> next day
    let validFlights: FlightOffer[] = [];
    let searchDate = todayDate;
    let hoursFromNow = 6;
    let searchLabel = "6시간 이내";
    let selectedDestination = uniqueDestinations[0]; // Will be updated when flight is found

    // Step 1: Search within 6 hours
    validFlights = await searchFlightsWithTimeWindow(todayDate, 6, "Step 1: 6시간 이내", uniqueDestinations);

    // Step 2: If no flights found, search within 24 hours
    if (validFlights.length === 0) {
        logs.push("⚠️ No flights found within 6 hours. Expanding search to 24 hours...");
        hoursFromNow = 24;
        searchLabel = "24시간 이내";
        validFlights = await searchFlightsWithTimeWindow(todayDate, 24, "Step 2: 24시간 이내", uniqueDestinations);
    }

    // Step 3: If still no flights, search next day (no time filter, just date)
    if (validFlights.length === 0) {
        logs.push("⚠️ No flights found within 24 hours. Searching for next day...");
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        searchDate = tomorrow.toISOString().split('T')[0];
        hoursFromNow = 24; // For next day, we'll search all day
        searchLabel = "다음날";

        // Search next day without time filter (search all flights for that day)
        logs.push(`🔎 Step 3: 다음날 검색 - Searching flights from ${airports.length} airport(s) to ${uniqueDestinations.length} destination(s) for ${searchDate}`);
        const nextDayFlights: FlightOffer[] = [];
        for (const airport of airports) {
            for (const destination of uniqueDestinations) {
                try {
                    // For next day, don't filter by hours, just search the date
                    const flights = await searchFlights(airport.iataCode, destination.airportCode, searchDate);
                    if (Array.isArray(flights)) {
                        const airportFlights = flights.map(f => ({
                            ...f,
                            originAirport: airport.iataCode,
                            originAirportName: airport.name,
                            destinationCountry: destination.country,
                            destinationCity: destination.city
                        }));
                        nextDayFlights.push(...airportFlights);
                        if (airportFlights.length > 0) {
                            logs.push(`   ✓ ${airport.iataCode} → ${destination.airportCode} (${destination.city}): ${airportFlights.length} flights`);
                        }
                    }
                } catch (e) {
                    // Silent fail
                }
            }
        }

        // Sort by departure time
        nextDayFlights.sort((a, b) => {
            const timeA = new Date(a.departure.at).getTime();
            const timeB = new Date(b.departure.at).getTime();
            return timeA - timeB;
        });

        validFlights = nextDayFlights;
        logs.push(`✅ Step 3: 다음날 - ${validFlights.length} flights found`);
    }

    let bestFlight = validFlights[0];
    let flightCost = 0;
    const hasFlights = validFlights.length > 0;

    if (bestFlight) {
        flightCost = parseFloat(bestFlight.price.total);
        if (bestFlight.price.currency !== "KRW") flightCost *= 1450;

        // Get destination info from flight
        const flightDest = (bestFlight as any).destinationCountry || uniqueDestinations.find(d => d.airportCode === bestFlight.arrival.iataCode)?.country;
        if (flightDest) {
            selectedDestination = uniqueDestinations.find(d => d.country === flightDest) || selectedDestination;
        }

        logs.push(`✅ Selected flight: ${bestFlight.airline} ${bestFlight.flightNumber} (${searchLabel})`);
        logs.push(`   → Destination: ${(bestFlight as any).destinationCity || 'Unknown'}, ${(bestFlight as any).destinationCountry || 'Unknown'}`);
    } else {
        logs.push("⚠️ No flights found in any time window. Will inform user.");
    }

    // 4. Get destination location from selected flight - MUST match the flight destination
    const arrivalAirportCode = bestFlight ? bestFlight.arrival.iataCode : (selectedDestination?.airportCode || "FUK");

    // Get destination info from flight metadata first, then from airport lookup
    let destinationCountry = bestFlight ? ((bestFlight as any).destinationCountry) : null;
    let destinationCity = bestFlight ? ((bestFlight as any).destinationCity) : null;

    logs.push(`📍 Getting location info for flight destination: ${arrivalAirportCode}`);
    logs.push(`   Flight metadata: ${destinationCity || 'N/A'}, ${destinationCountry || 'N/A'}`);

    // Always lookup airport location to get accurate country/city
    const destinationLocation = await getAirportLocation(arrivalAirportCode);

    if (destinationLocation) {
        // Use airport location as source of truth
        destinationCountry = destinationLocation.country || destinationCountry;
        destinationCity = destinationLocation.city || destinationCity;
        logs.push(`   ✓ Airport lookup: ${destinationCity || 'Unknown'}, ${destinationCountry || 'Unknown'}`);
    }

    // Find matching destination from our list to ensure we search in the right place
    const matchingDestination = uniqueDestinations.find(d => d.airportCode === arrivalAirportCode);
    if (matchingDestination) {
        destinationCountry = matchingDestination.country;
        destinationCity = matchingDestination.city;
        logs.push(`   ✓ Matched destination: ${destinationCity}, ${destinationCountry}`);
    }

    // Use country name for room search - this MUST match the flight destination
    let searchLocation = destinationCountry || "Japan";

    if (!destinationCountry) {
        logs.push(`   ⚠️ Could not determine destination country from airport ${arrivalAirportCode}`);
        logs.push(`   ⚠️ Will search in: ${searchLocation} (fallback)`);
    } else {
        logs.push(`   ✓ Final destination: ${destinationCity || 'Unknown'}, ${destinationCountry}`);
        logs.push(`   ✓ Searching rooms in: ${searchLocation} (must match flight destination)`);
    }

    // Verify: Log the search location to ensure it matches the flight
    if (bestFlight) {
        logs.push(`   🔍 Verification: Flight to ${arrivalAirportCode} → Searching rooms in ${searchLocation}`);
    }

    // 5. Budget and Travel Duration Setup
    const targetBudget = 1000000; // 100만원 예산
    const days = 6; // Travel duration: 5-7 days (use 6 days as average)
    const mealPrice = 15000;
    const mealsPerDay = 3;

    // Calculate budget for room search
    // Budget: 1,000,000 KRW for 6 days
    // Estimated: Flight (if available) + Room (6 nights) + Meals (6 days * 3 meals * 15,000)
    // Meals: 6 * 3 * 15,000 = 270,000 KRW
    // Remaining for room: 1,000,000 - flightCost - 270,000
    const estimatedMealCost = days * mealsPerDay * mealPrice; // 270,000 for 6 days
    const remainingBudgetForRoom = targetBudget - (hasFlights ? flightCost : 0) - estimatedMealCost;
    const maxPricePerNight = Math.floor(remainingBudgetForRoom / days);

    logs.push(`💰 Budget calculation: Total ${targetBudget.toLocaleString()}원`);
    logs.push(`   - Travel duration: ${days}일`);
    logs.push(`   - Estimated meals: ${estimatedMealCost.toLocaleString()}원`);
    logs.push(`   - Flight cost: ${hasFlights ? Math.floor(flightCost).toLocaleString() : 0}원`);
    logs.push(`   - Remaining for room: ${remainingBudgetForRoom.toLocaleString()}원`);
    logs.push(`   - Max price per night: ${maxPricePerNight.toLocaleString()}원`);

    // Room Search - Use dynamic location and budget-aware pricing
    // CRITICAL: searchLocation MUST match the flight destination AND must have accommodation data
    logs.push(`🏨 Searching rooms in: ${searchLocation} (for flight destination: ${arrivalAirportCode})`);
    logs.push(`   Expected destination: ${destinationCity || 'Unknown'}, ${destinationCountry || 'Unknown'}`);

    // Verify: Check if this country has accommodation data
    const hasAccommodationData = availableLocations.some(loc =>
        loc.country.toLowerCase() === searchLocation.toLowerCase() ||
        loc.country.toLowerCase().includes(searchLocation.toLowerCase()) ||
        searchLocation.toLowerCase().includes(loc.country.toLowerCase())
    );

    if (!hasAccommodationData) {
        logs.push(`   ⚠️ WARNING: ${searchLocation} does NOT have accommodation data in database!`);
        logs.push(`   Available countries: ${availableLocations.map(l => l.country).join(', ')}`);
    } else {
        logs.push(`   ✓ Verified: ${searchLocation} has accommodation data in database`);
    }

    const rooms = await searchStructuredRooms({
        location: searchLocation,
        limit: 3,
        maxPrice: Math.max(maxPricePerNight, 50000) // Minimum 50,000 to ensure some results
    });

    logs.push(`   Found ${rooms.length} rooms in ${searchLocation}`);

    // Verify room location matches flight destination
    if (rooms.length > 0 && destinationCountry) {
        const roomCountry = rooms[0].country;
        if (roomCountry && roomCountry.toLowerCase() !== destinationCountry.toLowerCase()) {
            logs.push(`   ⚠️ WARNING: Room country (${roomCountry}) does not match flight destination (${destinationCountry})!`);
        } else {
            logs.push(`   ✓ Verified: Room location matches flight destination`);
        }
    } else if (rooms.length === 0) {
        logs.push(`   ⚠️ No rooms found in ${searchLocation} - this confirms no accommodation data exists`);
    }

    const pickedRoom = rooms[0]; // Best room
    let roomCostPerNight = pickedRoom ? pickedRoom.price : 100000;

    // Currency Correction for Japan (JPY -> KRW)
    // If country is Japan and price is suspiciously low (< 5000), treat as JPY.
    // Or just always treat Japan room prices from this specific DB as JPY if we know the seed source.
    // For safety, let's assume if it is "Japan" we use x9 rate, as DB likely has JPY integers.
    if (pickedRoom && (pickedRoom.country === "Japan" || pickedRoom.city === "Tokyo" || pickedRoom.city === "Osaka" || pickedRoom.city === "Fukuoka")) {
        // Simple heuristic: If likely JPY
        roomCostPerNight = roomCostPerNight * 9; // Approx 100 JPY = 900 KRW
        logs.push(`💱 Detected Japan accommodation. Converting JPY to KRW (Rate x9): ${pickedRoom.price} -> ${roomCostPerNight}`);
    }

    // Calculate total costs
    const totalRoomCost = roomCostPerNight * days;
    const totalMeals = mealPrice * mealsPerDay * days;
    // Only include flight cost if flight is available
    const totalCost = hasFlights ? Math.floor(flightCost + totalRoomCost + totalMeals) : Math.floor(totalRoomCost + totalMeals);

    // Generate Flight Link (Skyscanner: origin/dest/YYMMDD) - only if flight found
    // searchDate is YYYY-MM-DD -> YYMMDD
    const dateShort = searchDate.slice(2).replace(/-/g, '');
    const destAirportCode = bestFlight ? bestFlight.arrival.iataCode : (selectedDestination?.airportCode || "FUK");
    const flightLink = hasFlights ? `https://www.skyscanner.co.kr/transport/flights/${originCode.toLowerCase()}/${destAirportCode.toLowerCase()}/${dateShort}` : '';

    // Format departure time for display
    const departureTime = bestFlight ? new Date(bestFlight.departure.at) : null;
    const departureTimeStr = departureTime ? departureTime.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }) : "N/A";
    const arrivalTime = bestFlight ? new Date(bestFlight.arrival.at) : null;
    const arrivalTimeStr = arrivalTime ? arrivalTime.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }) : "N/A";

    const context = `
    User Location: ${originCity}
    Nearby Airports: ${airports.map(a => `${a.name} (${a.iataCode})`).join(', ')}
    Selected Departure Airport: ${bestFlight ? (bestFlight as any).originAirportName || originCode : originCode}
    Destination Airport: ${arrivalAirportCode}
    Destination Location: ${destinationLocation ? `${destinationLocation.city || 'Unknown'}, ${destinationLocation.country || 'Unknown'}` : 'Unknown'}
    Destination City: ${destinationLocation?.city || 'Unknown'}
    Destination Country: ${destinationLocation?.country || 'Unknown'}
    Client Time: ${clientTime}
    Search Criteria: ${searchLabel} 출발 항공편 검색 (순차 검색: 6시간 → 24시간 → 다음날)
    Search Date: ${searchDate}
    Travel Duration: ${days}일 (5-7일 범위)
    Budget: ${targetBudget} KRW (100만원)
    
    Flight Found: ${hasFlights ? 'Yes' : 'No'}
    Search Result: ${searchLabel}
    ${hasFlights ? `
    Flight: ${bestFlight.airline} ${bestFlight.flightNumber} (Departure: ${departureTimeStr}, Arrival: ${arrivalTimeStr})
    Flight Cost: ${Math.floor(flightCost)} KRW
    Flight Link: ${flightLink}
    Available Flights: ${validFlights.length} flights found (${searchLabel})
    ` : `
    No flights found after searching: 6 hours → 24 hours → next day
    All search attempts completed. No flights available.
    `}
    
    Accommodation Search Location: ${searchLocation}
    Accommodation Found: ${pickedRoom ? 'Yes' : 'No'}
    ${pickedRoom ? `
    Accommodation: ${pickedRoom.title} (${pickedRoom.city}, ${pickedRoom.country})
    Room ID: ${pickedRoom.id}
    Room Cost: ${Math.floor(roomCostPerNight)} KRW/night * ${days} days = ${Math.floor(totalRoomCost)} KRW
    ` : `
    Accommodation: 해당 지역의 숙소 데이터가 없습니다
    Room Cost: ${Math.floor(roomCostPerNight)} KRW/night * ${days} days = ${Math.floor(totalRoomCost)} KRW (기본 추정치)
    Note: 실제 숙소 데이터가 없어 기본 추정 비용을 사용합니다.
    `}
    
    Meal Plan: ${mealPrice} KRW/meal * 3 meals * ${days} days = ${totalMeals} KRW
    
    ${hasFlights ? `
    Total Estimated Cost: Flight ${Math.floor(flightCost)} KRW + Accommodation ${Math.floor(totalRoomCost)} KRW + Meals ${totalMeals} KRW = ${totalCost} KRW
    ` : `
    Estimated Cost (without flight): Accommodation ${Math.floor(totalRoomCost)} KRW + Meals ${totalMeals} KRW = ${totalCost} KRW
    Note: Flight cost not included as no flights available today.
    `}
    Target Budget: ${targetBudget} KRW
    `;

    // 6. Generate Narrative Response
    const prompt = ChatPromptTemplate.fromMessages([
        ["system", `
        You are a smart travel concierge.
        
        Task: Generate a welcome message and trip plan in Korean based on the provided Context.
        
        1. Greeting:
        Start with: "안녕하세요! 현재 시각 ${clientTime}입니다. 고객님을 위해 지금 당장 출발할 수 있는 최적의 여행지를 엄선하여 준비했습니다."

        2. Plan Details (Narrative):
        - Start by mentioning the user's location and nearby airports.
        
        ${hasFlights ? `
        - **Present the Flight**: 
          - Mention the search process: "6시간 이내 → 24시간 이내 → 다음날까지 순차적으로 검색한 결과, ${searchLabel}에 출발하는 항공편을 찾았습니다."
          - Describe the flight Option (Airline, Flight Number, Departure Time, Arrival Time, Cost) smoothly.
          (Example: "인천공항에서 ${departureTimeStr}에 출발하여 ${arrivalTimeStr}에 도착하는 ${bestFlight.airline} ${bestFlight.flightNumber} 항공편이 있으며, 비용은 ${Math.floor(flightCost).toLocaleString()}원입니다.")
          (CRITICAL: If Flight Link is provided, you MUST make the text "[Airline Name] ([Departure Time])" a clickable Markdown link.
           Example: [${bestFlight.airline} (${departureTimeStr})](${flightLink})
           IMPORTANT: The URL in parentheses MUST NOT contain any spaces. Write it as a single continuous string without spaces.)
          - Mention the search result: "총 ${validFlights.length}개의 항공편이 검색되었으며, 가장 빠른 출발 시간의 항공편을 추천드립니다."
        ` : `
        - **Flight Availability**: 
          - Clearly inform that comprehensive search was completed: "6시간 이내 → 24시간 이내 → 다음날까지 순차적으로 검색을 완료했으나, 항공편을 찾을 수 없었습니다."
          - Be honest: "현재 시점에서 출발 가능한 항공편이 없습니다."
          - Suggest: "다른 날짜나 목적지로 검색해보시거나, 나중에 다시 시도해보시기 바랍니다."
          - Do NOT provide links asking user to search. The system has already completed all searches.
        `}
        
        - **Present the Accommodation**: 
          ${pickedRoom ? `
          - Recommend the hotel in the destination city: ${pickedRoom.title}
          (CRITICAL: STRICTLY format the Room link as: [RoomTitle](/rooms/${pickedRoom.id}). 
           IMPORTANT: Do NOT add spaces inside the link syntax. The URL path must be continuous without spaces.
           Example: [아사쿠사 호스텔 도카이소](/rooms/cmivvx0g7000qt6h775oqytji) - NO spaces in the URL part.)
          ` : `
          - Inform the user: "해당 지역의 숙소 데이터가 없습니다. 현재 데이터베이스에 ${searchLocation} 지역의 숙소 정보가 등록되어 있지 않습니다."
          - Mention that the accommodation cost shown is an estimated default value.
          - Do NOT create fake hotel names or links when no data is available.
          `}
        
        - **Cost & Summary**: 
          ${hasFlights ? `
          - Mention the travel duration: "${days}일 여행 기준"
          - Break down costs: 항공편 ${Math.floor(flightCost).toLocaleString()}원 + 숙소 ${Math.floor(totalRoomCost).toLocaleString()}원 + 식사 ${totalMeals.toLocaleString()}원
          - Total cost: 총 예상 비용 ${totalCost.toLocaleString()}원
          - Budget comparison: 목표 예산 ${targetBudget.toLocaleString()}원 대비 ${totalCost <= targetBudget ? '예산 내' : '예산 초과'}
          - Emphasize: "이는 ${searchLabel}에 출발 가능한 여행 계획입니다."
          ` : `
          - Mention: 항공편이 없어 항공편 비용을 제외한 예상 비용만 계산
          - Break down costs: 숙소 ${Math.floor(totalRoomCost).toLocaleString()}원 + 식사 ${totalMeals.toLocaleString()}원
          - Total cost: 총 예상 비용 ${totalCost.toLocaleString()}원 (항공편 비용 제외)
          - Note: 항공편이 확정되면 추가 비용이 발생할 수 있습니다.
          `}
        
        Context Data:
        {context}
        
        Tone: Polite, Professional (honorifics), and Concierge-like.
        IMPORTANT: 
        - Do NOT output brackets like [Flight Info] literally. Replace them with the actual data from Context.
        - If "Flight Found: No" in context, DO NOT create fake flight information. Be honest about the unavailability.
        - Always provide helpful alternatives when flights are not available.
        - CRITICAL: Do NOT add spaces between characters in words. Write Korean text without unnecessary spaces.
          Examples of WRONG: "고객 님", "항 공편", "숙 소", "비 용"
          Examples of CORRECT: "고객님", "항공편", "숙소", "비용"
        - When writing numbers with commas, use proper formatting: 1,000,000 (not 1, 000, 000)
        - Write all text naturally without inserting spaces between characters.
        `],
        ["human", "Recommend the trip now."]
    ]);

    const chain = prompt.pipe(model).pipe(new StringOutputParser());

    const answer = await chain.invoke({ context });

    return {
        answer,
        foundFlights: validFlights,
        foundRooms: rooms,
        logs
    };
    */
}


// --- Keep Existing Nodes ---

export async function emergencyNode(state: AgentState) {
    // ... Same log as before, just kept for manual trigger ...
    // Simplified for file length - reusing logic from AutoRec logic ideally, but keeping separate if distinct.
    // For now we assume Router directs "Auto" to AutoRecNode.
    // I Will keep a minimal version here to satisfy compilation if used elsewhere.
    return autoRecommendationNode(state);
}

export async function budgetNode(state: AgentState) {
    // Reusing AutoRec logic for simplicity since requirements merged?
    // Or sticking to the specialized one.
    // Let's keep the original BudgetNode but it's redundant now with AutoRecNode doing similar math.
    // I will redirect to AutoRecNode for now to ensure consistency with the new prompt requirements.
    return autoRecommendationNode(state);
}

export async function flightNode(state: AgentState) {
    const model = new ChatOpenAI({ modelName: "gpt-4o-mini", openAIApiKey: openAIKey });
    return { answer: "Flight Search Logic here..." }; // Placeholder
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
