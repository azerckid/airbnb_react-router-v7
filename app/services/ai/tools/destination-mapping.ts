/**
 * Destination mapping for cities with accommodation data in the database
 * This mapping connects database cities to their nearest airports for flight search
 */

export interface DestinationMapping {
    country: string;
    city: string;
    cityKorean?: string; // Add Korean name field
    airportCode: string;
    airportName: string;
    alternativeAirports?: Array<{ code: string; name: string }>;
}

/**
 * Mapping of cities with accommodation data to their nearest airports
 * Based on database query results:
 * - Japan: Fukuoka-City, Hiroshima, Kyoto, Osaka, Tokyo
 * - United States: Brooklyn, Manhattan, Queens
 */
export const DESTINATION_MAPPINGS: DestinationMapping[] = [
    // Japan
    {
        country: "Japan",
        city: "Fukuoka-City",
        cityKorean: "후쿠오카",
        airportCode: "FUK",
        airportName: "Fukuoka Airport",
    },
    {
        country: "Japan",
        city: "Hiroshima",
        cityKorean: "히로시마",
        airportCode: "HIJ",
        airportName: "Hiroshima Airport",
        alternativeAirports: [
            { code: "OKJ", name: "Okayama Airport" } // Alternative if HIJ not available
        ]
    },
    {
        country: "Japan",
        city: "Kyoto",
        cityKorean: "교토",
        airportCode: "KIX",
        airportName: "Kansai International Airport",
        alternativeAirports: [
            { code: "ITM", name: "Osaka International Airport (Itami)" }
        ]
    },
    {
        country: "Japan",
        city: "Osaka",
        cityKorean: "오사카",
        airportCode: "KIX",
        airportName: "Kansai International Airport",
        alternativeAirports: [
            { code: "ITM", name: "Osaka International Airport (Itami)" }
        ]
    },
    {
        country: "Japan",
        city: "Tokyo",
        cityKorean: "도쿄",
        airportCode: "NRT",
        airportName: "Narita International Airport",
        alternativeAirports: [
            { code: "HND", name: "Haneda Airport" }
        ]
    },

];

/**
 * Get airport code for a city
 * @param country Country name
 * @param city City name
 * @returns Airport code or null if not found
 */
export function getAirportCodeForCity(country: string, city: string): string | null {
    const mapping = DESTINATION_MAPPINGS.find(
        d => d.country === country && d.city === city
    );
    return mapping?.airportCode || null;
}

/**
 * Get all destination mappings for a country
 * @param country Country name
 * @returns Array of destination mappings
 */
export function getDestinationsByCountry(country: string): DestinationMapping[] {
    return DESTINATION_MAPPINGS.filter(d => d.country === country);
}

/**
 * Get all unique airport codes from destinations
 * @returns Set of airport codes
 */
export function getAllDestinationAirportCodes(): Set<string> {
    const codes = new Set<string>();
    DESTINATION_MAPPINGS.forEach(d => {
        codes.add(d.airportCode);
        d.alternativeAirports?.forEach(alt => codes.add(alt.code));
    });
    return codes;
}

/**
 * Get destination mapping by airport code
 * @param airportCode Airport IATA code
 * @returns Destination mapping or null
 */
export function getDestinationByAirportCode(airportCode: string): DestinationMapping | null {
    return DESTINATION_MAPPINGS.find(d => d.airportCode === airportCode) || null;
}

/**
 * Get all cities with accommodation data
 * @returns Array of { country, city, airportCode }
 */
// Update return type in function signature (implicit or explicit)
export function getAllDestinationCities(): Array<{ country: string; city: string; cityKorean?: string; airportCode: string }> {
    return DESTINATION_MAPPINGS.map(d => ({
        country: d.country,
        city: d.city,
        cityKorean: d.cityKorean,
        airportCode: d.airportCode
    }));
}

