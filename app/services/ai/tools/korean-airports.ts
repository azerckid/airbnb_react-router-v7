/**
 * Korean International Airports
 * List of all international airports in South Korea for flight search
 */

export interface KoreanAirport {
    iataCode: string;
    name: string;
    nameKorean: string;
    city: string;
    region: string;
    isMajor: boolean; // Major international hub
}

/**
 * All international airports in South Korea
 * Includes major hubs and regional international airports
 */
export const KOREAN_INTERNATIONAL_AIRPORTS: KoreanAirport[] = [
    // Major International Hubs
    {
        iataCode: "ICN",
        name: "Incheon International Airport",
        nameKorean: "인천국제공항",
        city: "Incheon",
        region: "Gyeonggi",
        isMajor: true
    },
    {
        iataCode: "GMP",
        name: "Gimpo International Airport",
        nameKorean: "김포국제공항",
        city: "Seoul",
        region: "Seoul",
        isMajor: true
    },
    {
        iataCode: "PUS",
        name: "Gimhae International Airport",
        nameKorean: "김해국제공항",
        city: "Busan",
        region: "Gyeongsangnam",
        isMajor: true
    },
    {
        iataCode: "CJU",
        name: "Jeju International Airport",
        nameKorean: "제주국제공항",
        city: "Jeju",
        region: "Jeju",
        isMajor: true
    },
    
    // Regional International Airports
    {
        iataCode: "TAE",
        name: "Daegu International Airport",
        nameKorean: "대구국제공항",
        city: "Daegu",
        region: "Gyeongsangbuk",
        isMajor: false
    },
    {
        iataCode: "YNY",
        name: "Yangyang International Airport",
        nameKorean: "양양국제공항",
        city: "Yangyang",
        region: "Gangwon",
        isMajor: false
    },
    {
        iataCode: "KUV",
        name: "Gunsan Airport",
        nameKorean: "군산공항",
        city: "Gunsan",
        region: "Jeollabuk",
        isMajor: false
    },
    {
        iataCode: "USN",
        name: "Ulsan Airport",
        nameKorean: "울산공항",
        city: "Ulsan",
        region: "Ulsan",
        isMajor: false
    },
    {
        iataCode: "RSU",
        name: "Yeosu Airport",
        nameKorean: "여수공항",
        city: "Yeosu",
        region: "Jeollanam",
        isMajor: false
    },
    {
        iataCode: "WJU",
        name: "Wonju Airport",
        nameKorean: "원주공항",
        city: "Wonju",
        region: "Gangwon",
        isMajor: false
    },
    {
        iataCode: "MWX",
        name: "Muan International Airport",
        nameKorean: "무안국제공항",
        city: "Muan",
        region: "Jeollanam",
        isMajor: false
    },
    {
        iataCode: "CJJ",
        name: "Cheongju International Airport",
        nameKorean: "청주국제공항",
        city: "Cheongju",
        region: "Chungcheongbuk",
        isMajor: false
    },
    {
        iataCode: "KWJ",
        name: "Gwangju Airport",
        nameKorean: "광주공항",
        city: "Gwangju",
        region: "Gwangju",
        isMajor: false
    },
    {
        iataCode: "KPO",
        name: "Pohang Airport",
        nameKorean: "포항공항",
        city: "Pohang",
        region: "Gyeongsangbuk",
        isMajor: false
    },
];

/**
 * Get all Korean international airports
 * @returns Array of all Korean airports
 */
export function getAllKoreanAirports(): KoreanAirport[] {
    return KOREAN_INTERNATIONAL_AIRPORTS;
}

/**
 * Get only major international hubs (ICN, GMP, PUS, CJU)
 * @returns Array of major Korean airports
 */
export function getMajorKoreanAirports(): KoreanAirport[] {
    return KOREAN_INTERNATIONAL_AIRPORTS.filter(airport => airport.isMajor);
}

/**
 * Get airports by region
 * @param region Region name
 * @returns Array of airports in the region
 */
export function getAirportsByRegion(region: string): KoreanAirport[] {
    return KOREAN_INTERNATIONAL_AIRPORTS.filter(airport => 
        airport.region.toLowerCase() === region.toLowerCase()
    );
}

/**
 * Get airport by IATA code
 * @param iataCode Airport IATA code
 * @returns Airport information or null
 */
export function getAirportByCode(iataCode: string): KoreanAirport | null {
    return KOREAN_INTERNATIONAL_AIRPORTS.find(
        airport => airport.iataCode.toUpperCase() === iataCode.toUpperCase()
    ) || null;
}

/**
 * Get airport codes as array
 * @param majorOnly If true, returns only major airports
 * @returns Array of IATA codes
 */
export function getKoreanAirportCodes(majorOnly: boolean = false): string[] {
    const airports = majorOnly ? getMajorKoreanAirports() : getAllKoreanAirports();
    return airports.map(airport => airport.iataCode);
}

