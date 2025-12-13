
import { type FlightOffer } from "../tools/flight.server";
import { type RoomListing } from "../tools/recommendation.server";

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
