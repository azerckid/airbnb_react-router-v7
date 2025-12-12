import { getAllDestinationCities } from './app/services/ai/tools/destination-mapping';

console.log('\n🎯 목적지 도시 및 공항 매핑 확인\n');
console.log('='.repeat(70));

const destinations = getAllDestinationCities();

console.log(`\n총 ${destinations.length}개 도시가 목적지로 설정되었습니다.\n`);

// Group by country
const byCountry = new Map<string, typeof destinations>();
destinations.forEach(dest => {
    if (!byCountry.has(dest.country)) {
        byCountry.set(dest.country, []);
    }
    byCountry.get(dest.country)!.push(dest);
});

byCountry.forEach((cities, country) => {
    console.log(`📍 ${country} (${cities.length} cities):`);
    cities.forEach(city => {
        console.log(`   - ${city.city} → ${city.airportCode}`);
    });
    console.log();
});

console.log('='.repeat(70));
console.log('\n✅ 목적지 설정 완료\n');

