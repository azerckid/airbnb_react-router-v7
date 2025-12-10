
// @ts-ignore
import Amadeus from 'amadeus';

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

export async function searchFlights(
    origin: string,
    destination: string,
    departureDate: string
): Promise<FlightOffer[] | string> {
    console.log(`✈️ Amadeus: Searching flights from ${origin} to ${destination} on ${departureDate}`);

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
            max: '5' // Limit to top 5 results
        });

        if (!response.data || response.data.length === 0) {
            return "No flights found for the given criteria.";
        }

        // Map response to a simpler format for the AI
        const offers: FlightOffer[] = response.data.map((offer: any) => {
            const itinerary = offer.itineraries[0]; // Assume one-way or first leg
            const segment = itinerary.segments[0]; // First segment (direct or first leg)

            // Basic carrier lookup (could be improved with dictionary)
            const carrierCode = segment.carrierCode;

            return {
                id: offer.id,
                airline: carrierCode,
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

        return offers;

    } catch (error: any) {
        console.error("❌ Amadeus API Error:", error.response ? error.response.result : error);
        return `Error searching for flights: ${error.description || "Unknown error"}`;
    }
}
