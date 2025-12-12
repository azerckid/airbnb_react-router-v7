// @ts-ignore
import Amadeus from "amadeus";

const amadeus = new Amadeus({
    clientId: process.env.AMADEUS_CLIENT_ID,
    clientSecret: process.env.AMADEUS_CLIENT_SECRET,
});

export interface GeoLocation {
    lat: number;
    lon: number;
    city?: string;
    country?: string;
}

export interface Airport {
    iataCode: string;
    name: string;
    distance: number; // km
    cityCode: string;
}

export async function getIpLocation(ip: string): Promise<GeoLocation | null> {
    try {
        // Handle localhost or private IPs
        if (ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.")) {
            // Default to Seoul for testing
            return { lat: 37.5665, lon: 126.9780, city: "Seoul", country: "South Korea" };
        }

        const response = await fetch(`http://ip-api.com/json/${ip}`);
        if (!response.ok) throw new Error("IP API failed");

        const data = await response.json();
        if (data.status !== "success") return null;

        return {
            lat: data.lat,
            lon: data.lon,
            city: data.city,
            country: data.country
        };
    } catch (e) {
        console.error("GeoIP Error:", e);
        return null;
    }
}

export async function findNearestAirport(lat: number, lon: number): Promise<Airport | null> {
    try {
        const response = await amadeus.referenceData.locations.airports.get({
            latitude: lat,
            longitude: lon,
            radius: 100, // Search within 100km
            page: { limit: 1 },
            sort: 'distance'
        });

        if (!response.data || response.data.length === 0) return null;

        const airport = response.data[0];

        return {
            iataCode: airport.iataCode,
            name: airport.name,
            distance: airport.distance.value,
            cityCode: airport.address.cityCode
        };
    } catch (e) {
        console.error("Amadeus Airport Search Error:", e);
        return null;
    }
}

/**
 * Find multiple nearest airports within a radius
 * @param lat Latitude
 * @param lon Longitude
 * @param radiusKm Search radius in kilometers (default: 200km)
 * @param limit Maximum number of airports to return (default: 5)
 * @returns Array of airports sorted by distance
 */
export async function findNearestAirports(
    lat: number,
    lon: number,
    radiusKm: number = 200,
    limit: number = 5
): Promise<Airport[]> {
    try {
        const response = await amadeus.referenceData.locations.airports.get({
            latitude: lat,
            longitude: lon,
            radius: radiusKm,
            page: { limit },
            sort: 'distance'
        });

        if (!response.data || response.data.length === 0) return [];

        return response.data.map((airport: any) => ({
            iataCode: airport.iataCode,
            name: airport.name,
            distance: airport.distance.value,
            cityCode: airport.address.cityCode
        }));
    } catch (e) {
        console.error("Amadeus Multiple Airport Search Error:", e);
        return [];
    }
}

export interface AirportLocation {
    city?: string;
    country?: string;
    cityCode?: string;
    countryCode?: string;
}

/**
 * Get location information (city, country) from airport IATA code
 * @param airportCode IATA airport code (e.g., "FUK", "ICN", "NRT")
 * @returns Location information including city and country
 */
export async function getAirportLocation(airportCode: string): Promise<AirportLocation | null> {
    try {
        const response = await amadeus.referenceData.locations.get({
            subType: 'AIRPORT',
            keyword: airportCode,
            page: { limit: 1 }
        });

        if (!response.data || response.data.length === 0) {
            // Fallback: Use common airport mapping for known codes
            return getAirportLocationFallback(airportCode);
        }

        const airport = response.data[0];
        return {
            city: airport.address?.cityName,
            country: airport.address?.countryName,
            cityCode: airport.address?.cityCode,
            countryCode: airport.address?.countryCode
        };
    } catch (e) {
        console.error(`Amadeus Airport Location Error for ${airportCode}:`, e);
        // Fallback to mapping table
        return getAirportLocationFallback(airportCode);
    }
}

/**
 * Fallback mapping for common airports when API fails
 */
function getAirportLocationFallback(airportCode: string): AirportLocation | null {
    const airportMap: Record<string, { city: string; country: string; cityCode?: string }> = {
        // Japan
        "FUK": { city: "Fukuoka", country: "Japan", cityCode: "FUK" },
        "NRT": { city: "Tokyo", country: "Japan", cityCode: "TYO" },
        "HND": { city: "Tokyo", country: "Japan", cityCode: "TYO" },
        "KIX": { city: "Osaka", country: "Japan", cityCode: "OSA" },
        "CTS": { city: "Sapporo", country: "Japan", cityCode: "SPK" },
        // Korea
        "ICN": { city: "Seoul", country: "South Korea", cityCode: "SEL" },
        "GMP": { city: "Seoul", country: "South Korea", cityCode: "SEL" },
        // China
        "PEK": { city: "Beijing", country: "China", cityCode: "BJS" },
        "PVG": { city: "Shanghai", country: "China", cityCode: "SHA" },
        "CAN": { city: "Guangzhou", country: "China", cityCode: "CAN" },
        // Southeast Asia
        "BKK": { city: "Bangkok", country: "Thailand", cityCode: "BKK" },
        "SIN": { city: "Singapore", country: "Singapore", cityCode: "SIN" },
        "KUL": { city: "Kuala Lumpur", country: "Malaysia", cityCode: "KUL" },
        "HKG": { city: "Hong Kong", country: "Hong Kong", cityCode: "HKG" },
        "TPE": { city: "Taipei", country: "Taiwan", cityCode: "TPE" },
        "MNL": { city: "Manila", country: "Philippines", cityCode: "MNL" },
        "SGN": { city: "Ho Chi Minh City", country: "Vietnam", cityCode: "SGN" },
        "HAN": { city: "Hanoi", country: "Vietnam", cityCode: "HAN" },
        // Others
        "DXB": { city: "Dubai", country: "UAE", cityCode: "DXB" },
        "DOH": { city: "Doha", country: "Qatar", cityCode: "DOH" },
    };

    const location = airportMap[airportCode.toUpperCase()];
    if (location) {
        return {
            city: location.city,
            country: location.country,
            cityCode: location.cityCode
        };
    }

    return null;
}
