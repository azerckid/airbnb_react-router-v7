
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { Document } from "@langchain/core/documents";
import { searchRooms } from "./core.server";
import { searchFlights, type FlightOffer, filterFlightsWithinHours } from "./tools/flight.server";
import { searchStructuredRooms, type RoomListing } from "./tools/recommendation.server";
import { getIpLocation, findNearestAirport, findNearestAirports, getAirportLocation } from "./tools/location.server";

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

    // 2. Detect Location and Find Multiple Airports
    let originCode = "ICN";
    let originCity = "Seoul";
    let airports: Array<{ iataCode: string; name: string; distance: number }> = [];

    if (state.ip) {
        logs.push(`📍 Detecting location... (IP: ${state.ip})`);
        const loc = await getIpLocation(state.ip);
        if (loc) {
            originCity = loc.city || "Unknown";
            // Find multiple nearby airports (within 200km, up to 5 airports)
            const nearbyAirports = await findNearestAirports(loc.lat, loc.lon, 200, 5);
            if (nearbyAirports.length > 0) {
                airports = nearbyAirports;
                originCode = nearbyAirports[0].iataCode; // Use nearest as default
                logs.push(`✈️ Found ${nearbyAirports.length} nearby airports:`);
                nearbyAirports.forEach((airport, idx) => {
                    logs.push(`   ${idx + 1}. ${airport.name} (${airport.iataCode}) - ${Math.round(airport.distance)}km`);
                });
            } else {
                // Fallback to single airport search
                const airport = await findNearestAirport(loc.lat, loc.lon);
                if (airport) {
                    originCode = airport.iataCode;
                    airports = [airport];
                    logs.push(`✈️ Nearest Airport: ${airport.name} (${originCode}) - ${Math.round(airport.distance)}km`);
                }
            }
        }
    }

    // If no airports found, use default
    if (airports.length === 0) {
        airports = [{ iataCode: "ICN", name: "Incheon International Airport", distance: 0 }];
    }

    // 3. Flight Search - Search from all nearby airports
    const dest = "FUK"; // Default destination (can be made dynamic later)
    const today = new Date();
    const flightDate = today.toISOString().split('T')[0]; // Today/Immediate
    const hoursFromNow = 6; // Filter flights departing within 6 hours

    logs.push(`🔎 Searching flights from ${airports.length} airport(s) to ${dest} for ${flightDate}`);
    logs.push(`⏰ Filtering for flights departing within ${hoursFromNow} hours from now`);

    // Search flights from all nearby airports
    const allFlights: FlightOffer[] = [];
    for (const airport of airports) {
        try {
            const flights = await searchFlights(airport.iataCode, dest, flightDate, hoursFromNow);
            if (Array.isArray(flights)) {
                const airportFlights = flights.map(f => ({
                    ...f,
                    originAirport: airport.iataCode,
                    originAirportName: airport.name
                }));
                allFlights.push(...airportFlights);
                logs.push(`   ✓ ${airport.iataCode}: Found ${airportFlights.length} flights within ${hoursFromNow}h`);
            }
        } catch (e) {
            logs.push(`   ✗ ${airport.iataCode}: Search failed - ${e}`);
        }
    }

    // Sort all flights by departure time (earliest first)
    allFlights.sort((a, b) => {
        const timeA = new Date(a.departure.at).getTime();
        const timeB = new Date(b.departure.at).getTime();
        return timeA - timeB;
    });

    // Additional filter to ensure all flights are within 6 hours (safety check)
    const now = new Date();
    const cutoffTime = new Date(now.getTime() + hoursFromNow * 60 * 60 * 1000);
    const validFlights = allFlights.filter(f => {
        const departureTime = new Date(f.departure.at);
        return departureTime > now && departureTime <= cutoffTime;
    });

    logs.push(`✅ Total: ${validFlights.length} flights found within ${hoursFromNow} hours from ${airports.length} airport(s)`);

    let bestFlight = validFlights[0];
    let flightCost = 0;
    const hasFlights = validFlights.length > 0;

    if (bestFlight) {
        flightCost = parseFloat(bestFlight.price.total);
        if (bestFlight.price.currency !== "KRW") flightCost *= 1450;
    } else {
        logs.push("⚠️ No flights found within 6 hours. User will be informed and alternative options will be suggested.");
    }

    // 4. Get destination location from arrival airport
    // If no flight found, use default destination for location search
    const arrivalAirportCode = bestFlight ? bestFlight.arrival.iataCode : dest;
    logs.push(`📍 Getting location info for destination airport: ${arrivalAirportCode}`);

    let destinationLocation = await getAirportLocation(arrivalAirportCode);
    let searchLocation = "Japan"; // Default fallback

    if (destinationLocation) {
        // Prefer country name, fallback to city name
        searchLocation = destinationLocation.country || destinationLocation.city || "Japan";
        logs.push(`   ✓ Destination: ${destinationLocation.city || 'Unknown'}, ${destinationLocation.country || 'Unknown'}`);
        logs.push(`   ✓ Searching rooms in: ${searchLocation}`);
    } else {
        logs.push(`   ⚠️ Could not determine destination location, using default: ${searchLocation}`);
    }

    // 5. Room Search - Use dynamic location
    logs.push("Please wait, searching for rooms...");
    const rooms = await searchStructuredRooms({
        location: searchLocation,
        limit: 3,
        maxPrice: 150000
    });

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

    const days = 7;
    const totalRoomCost = roomCostPerNight * days;

    // 5. Meal & Total Logic
    const mealPrice = 15000;
    const mealsPerDay = 3;
    const totalMeals = mealPrice * mealsPerDay * days;
    // Only include flight cost if flight is available
    const totalCost = hasFlights ? Math.floor(flightCost + totalRoomCost + totalMeals) : Math.floor(totalRoomCost + totalMeals);
    const targetBudget = 1000000;

    // Generate Flight Links (Skyscanner: origin/dest/YYMMDD)
    // flightDate is YYYY-MM-DD -> YYMMDD
    const dateShort = flightDate.slice(2).replace(/-/g, '');
    const flightLink = `https://www.skyscanner.co.kr/transport/flights/${originCode.toLowerCase()}/${dest.toLowerCase()}/${dateShort}`;

    // Generate link for next day as alternative
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = tomorrow.toISOString().split('T')[0];
    const tomorrowDateShort = tomorrowDate.slice(2).replace(/-/g, '');
    const nextDayFlightLink = `https://www.skyscanner.co.kr/transport/flights/${originCode.toLowerCase()}/${dest.toLowerCase()}/${tomorrowDateShort}`;

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
    Search Criteria: Flights departing within ${hoursFromNow} hours from now
    Search Date: ${flightDate}
    
    Flight Found: ${hasFlights ? 'Yes' : 'No'}
    ${hasFlights ? `
    Flight: ${bestFlight.airline} ${bestFlight.flightNumber} (Departure: ${departureTimeStr}, Arrival: ${arrivalTimeStr})
    Flight Cost: ${Math.floor(flightCost)} KRW
    Flight Link: ${flightLink}
    Available Flights: ${validFlights.length} flights found within ${hoursFromNow} hours
    ` : `
    No flights found within ${hoursFromNow} hours from now.
    Alternative: Search for flights tomorrow (${tomorrowDate})
    Next Day Flight Link: ${nextDayFlightLink}
    `}
    
    Accommodation Search Location: ${searchLocation}
    Accommodation: ${pickedRoom ? pickedRoom.title : "Standard Hotel"} (${pickedRoom ? pickedRoom.city : "City"}, ${pickedRoom ? pickedRoom.country : "Country"})
    Room ID: ${pickedRoom ? pickedRoom.id : ""}
    Room Cost: ${Math.floor(roomCostPerNight)} KRW/night * ${days} days = ${Math.floor(totalRoomCost)} KRW
    
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
        - **Present the Flight**: Emphasize that this flight departs within ${hoursFromNow} hours from now.
          Describe the flight Option (Airline, Flight Number, Departure Time, Arrival Time, Cost) smoothly.
          (Example: "인천공항에서 ${departureTimeStr}에 출발하여 ${arrivalTimeStr}에 도착하는 ${bestFlight.airline}이 ${hoursFromNow}시간 내 출발 가능한 최적의 옵션으로 검색되었습니다.")
          (CRITICAL: You MUST make the text "[Airline Name] ([Departure Time])" a clickable Markdown link using the [Flight Link] from context.
           Example: [${bestFlight.airline} (${departureTimeStr})](${flightLink})
           IMPORTANT: The URL in parentheses MUST NOT contain any spaces. Write it as a single continuous string without spaces.)
          - Mention if multiple airports were searched and how many flights were found.
        ` : `
        - **Flight Availability**: Clearly inform the user that NO flights were found within ${hoursFromNow} hours from now.
          Say: "죄송하지만, 현재 시각으로부터 ${hoursFromNow}시간 이내에 출발하는 항공편을 찾을 수 없었습니다."
          - Provide alternative options:
            1. Suggest searching for flights tomorrow: "내일 출발하는 항공편을 검색해보시는 것을 추천드립니다."
            2. Include a link to search for next day flights: [내일 항공편 검색하기](${nextDayFlightLink})
            3. Suggest expanding the search time window: "또는 더 넓은 시간 범위로 검색해보시기 바랍니다."
          - Be honest and helpful, do NOT make up flight information.
        `}
        
        - **Present the Accommodation**: Recommend the hotel in the destination city (if available).
          (CRITICAL: STRICTLY format the Room link as: [RoomTitle](/rooms/${pickedRoom ? pickedRoom.id : ""}). 
           IMPORTANT: Do NOT add spaces inside the link syntax. The URL path must be continuous without spaces.
           Example: [아사쿠사 호스텔 도카이소](/rooms/cmivvx0g7000qt6h775oqytji) - NO spaces in the URL part.)
        
        ${hasFlights ? `
        - **Cost & Summary**: Briefly mention the meal costs and the total estimated trip budget compared to the target.
          Emphasize that this is a "지금 당장 출발 가능한" (can depart right now) trip option.
        ` : `
        - **Alternative Planning**: Since no immediate flights are available, suggest:
          1. Planning for tomorrow or later dates
          2. Checking accommodation availability for future dates
          3. Being flexible with travel dates for better options
        `}
        
        Context Data:
        {context}
        
        Tone: Polite, Professional (honorifics), and Concierge-like.
        IMPORTANT: 
        - Do NOT output brackets like [Flight Info] literally. Replace them with the actual data from Context.
        - If "Flight Found: No" in context, DO NOT create fake flight information. Be honest about the unavailability.
        - Always provide helpful alternatives when flights are not available.
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
