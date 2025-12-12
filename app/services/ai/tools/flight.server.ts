
// @ts-ignore
import Amadeus from "amadeus";

// Initialize Amadeus client
// Note: Amadeus constructor might not be fully typed depending on the valid types package version.
// Using 'any' for safety if types are stubborn, but trying standard import first.
const amadeus = new Amadeus({
    clientId: process.env.AMADEUS_CLIENT_ID,
    clientSecret: process.env.AMADEUS_CLIENT_SECRET,
});

export interface FlightOffer {
    id: string;
    airline: string;
    flightNumber: string;
    departure: {
        iataCode: string;
        at: string;
    };
    arrival: {
        iataCode: string;
        at: string;
    };
    duration: string;
    price: {
        currency: string;
        total: string;
    };
}

/**
 * Filter flights that depart within the specified hours from now
 * @param flights Array of flight offers
 * @param hoursFromNow Hours from current time (default: 6)
 * @returns Filtered and sorted flights (by departure time)
 */
export function filterFlightsWithinHours(
    flights: FlightOffer[],
    hoursFromNow: number = 6
): FlightOffer[] {
    const now = new Date();
    const cutoffTime = new Date(now.getTime() + hoursFromNow * 60 * 60 * 1000);

    const validFlights = flights.filter((flight) => {
        try {
            // Parse departure time (format: "2024-01-15T14:30:00" or "2024-01-15T14:30")
            const departureTime = new Date(flight.departure.at);

            // Check if departure is in the future and within the time window
            return departureTime > now && departureTime <= cutoffTime;
        } catch (e) {
            console.error(`Error parsing departure time for flight ${flight.id}:`, e);
            return false;
        }
    });

    // Sort by departure time (earliest first)
    return validFlights.sort((a, b) => {
        const timeA = new Date(a.departure.at).getTime();
        const timeB = new Date(b.departure.at).getTime();
        return timeA - timeB;
    });
}

export async function searchFlights(
    origin: string,
    destination: string,
    departureDate: string,
    filterWithinHours?: number // Optional: filter flights within N hours from now
): Promise<FlightOffer[] | string> {
    console.log(`✈️ Amadeus: Searching flights from ${origin} to ${destination} on ${departureDate}${filterWithinHours ? ` (within ${filterWithinHours}h)` : ''}`);

    if (!process.env.AMADEUS_CLIENT_ID || !process.env.AMADEUS_CLIENT_SECRET) {
        console.error("❌ Amadeus API keys missing.");
        return "Error: Flight search service is not configured (missing API keys).";
    }

    try {
        const response = await amadeus.shopping.flightOffersSearch.get({
            originLocationCode: origin,
            destinationLocationCode: destination,
            departureDate: departureDate,
            adults: '1',
            max: '20' // Increase limit to get more results for filtering
        });

        if (!response.data || response.data.length === 0) {
            return "No flights found for the given criteria.";
        }

        // Map response to a simpler format for the AI
        const offers: FlightOffer[] = response.data.map((offer: any) => {
            const itinerary = offer.itineraries[0]; // Assume one-way or first leg
            const segment = itinerary.segments[0]; // First segment (direct or first leg)

            // Basic carrier lookup
            const carrierCode = segment.carrierCode;
            const carrierMap: Record<string, string> = {
                "UO": "Hong Kong Express",
                "KE": "Korean Air",
                "OZ": "Asiana Airlines",
                "7C": "Jeju Air",
                "LJ": "Jin Air",
                "TW": "T'way Air",
                "RS": "Air Seoul",
                "ZE": "Eastar Jet",
                "BX": "Air Busan",
                "JL": "Japan Airlines",
                "NH": "All Nippon Airways (ANA)",
                "CX": "Cathay Pacific",
                "5J": "Cebu Pacific",
                "VN": "Vietnam Airlines",
                "VJ": "VietJet Air",
                "PR": "Philippine Airlines",
                "SQ": "Singapore Airlines",
                "TR": "Scoot",
                "TZ": "Scoot",
                "MH": "Malaysia Airlines",
                "AK": "AirAsia",
                "D7": "AirAsia X",
                "TG": "Thai Airways",
                "CI": "China Airlines",
                "BR": "EVA Air"
            };
            const airlineName = carrierMap[carrierCode] || carrierCode;

            return {
                id: offer.id,
                airline: airlineName,
                flightNumber: `${carrierCode}${segment.number}`,
                departure: {
                    iataCode: segment.departure.iataCode,
                    at: segment.departure.at
                },
                arrival: {
                    iataCode: segment.arrival.iataCode,
                    at: segment.arrival.at
                },
                duration: itinerary.duration,
                price: {
                    currency: offer.price.currency,
                    total: offer.price.total
                }
            };
        });

        // Apply time filter if specified
        if (filterWithinHours !== undefined) {
            const filtered = filterFlightsWithinHours(offers, filterWithinHours);
            console.log(`⏰ Filtered ${offers.length} flights to ${filtered.length} within ${filterWithinHours} hours`);
            return filtered;
        }

        return offers;

    } catch (error: any) {
        console.error("❌ Amadeus API Error:", error.response ? error.response.result : error);
        
        // Rate limit 에러 확인
        const errorResult = error.response?.result;
        if (errorResult?.errors) {
            const rateLimitError = errorResult.errors.find((e: any) => 
                e.status === 429 || e.code === 38194 || e.title?.includes('Too many requests')
            );
            if (rateLimitError) {
                return "RATE_LIMIT_ERROR: Too many requests. Please try again later.";
            }
            
            // INVALID DATE 에러 확인
            const invalidDateError = errorResult.errors.find((e: any) => 
                e.code === 425 || e.title?.includes('INVALID DATE')
            );
            if (invalidDateError) {
                return "INVALID_DATE_ERROR: Date/Time is in the past.";
            }
        }
        
        return `Error searching for flights: ${error.description || "Unknown error"}`;
    }
}
