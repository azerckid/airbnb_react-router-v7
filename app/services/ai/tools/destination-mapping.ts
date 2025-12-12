/**
 * Destination mapping for cities with accommodation data in the database
 * This mapping connects database cities to their nearest airports for flight search
 */

export interface DestinationMapping {
    country: string;
    city: string;
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
        airportCode: "FUK",
        airportName: "Fukuoka Airport",
    },
    {
        country: "Japan",
        city: "Hiroshima",
        airportCode: "HIJ",
        airportName: "Hiroshima Airport",
        alternativeAirports: [
            { code: "OKJ", name: "Okayama Airport" } // Alternative if HIJ not available
        ]
    },
    {
        country: "Japan",
        city: "Kyoto",
        airportCode: "KIX",
        airportName: "Kansai International Airport",
        alternativeAirports: [
            { code: "ITM", name: "Osaka International Airport (Itami)" }
        ]
    },
    {
        country: "Japan",
        city: "Osaka",
        airportCode: "KIX",
        airportName: "Kansai International Airport",
        alternativeAirports: [
            { code: "ITM", name: "Osaka International Airport (Itami)" }
        ]
    },
    {
        country: "Japan",
        city: "Tokyo",
        airportCode: "NRT",
        airportName: "Narita International Airport",
        alternativeAirports: [
            { code: "HND", name: "Haneda Airport" }
        ]
    },
    
    // United States (New York area)
    {
        country: "United States",
        city: "Brooklyn",
        airportCode: "JFK",
        airportName: "John F. Kennedy International Airport",
        alternativeAirports: [
            { code: "LGA", name: "LaGuardia Airport" },
            { code: "EWR", name: "Newark Liberty International Airport" }
        ]
    },
    {
        country: "United States",
        city: "Manhattan",
        airportCode: "JFK",
        airportName: "John F. Kennedy International Airport",
        alternativeAirports: [
            { code: "LGA", name: "LaGuardia Airport" },
            { code: "EWR", name: "Newark Liberty International Airport" }
        ]
    },
    {
        country: "United States",
        city: "Queens",
        airportCode: "JFK",
        airportName: "John F. Kennedy International Airport",
        alternativeAirports: [
            { code: "LGA", name: "LaGuardia Airport" },
            { code: "EWR", name: "Newark Liberty International Airport" }
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
export function getAllDestinationCities(): Array<{ country: string; city: string; airportCode: string }> {
    return DESTINATION_MAPPINGS.map(d => ({
        country: d.country,
        city: d.city,
        airportCode: d.airportCode
    }));
}

