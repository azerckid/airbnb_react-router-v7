import { getAllKoreanAirports, getMajorKoreanAirports, getKoreanAirportCodes } from './app/services/ai/tools/korean-airports';

console.log('\n🇰🇷 한국 국제공항 목록\n');
console.log('='.repeat(80));

const allAirports = getAllKoreanAirports();
const majorAirports = getMajorKoreanAirports();
const allCodes = getKoreanAirportCodes(false);
const majorCodes = getKoreanAirportCodes(true);

console.log(`\n📊 통계:`);
console.log(`   - 전체 국제공항: ${allAirports.length}개`);
console.log(`   - 주요 국제공항: ${majorAirports.length}개 (${majorCodes.join(', ')})`);
console.log(`   - 지역 국제공항: ${allAirports.length - majorAirports.length}개`);

console.log(`\n✈️ 주요 국제공항 (${majorAirports.length}개):`);
console.log('-'.repeat(80));
majorAirports.forEach((airport, idx) => {
    console.log(`   ${idx + 1}. ${airport.iataCode} - ${airport.nameKorean} (${airport.name})`);
    console.log(`      도시: ${airport.city}, 지역: ${airport.region}`);
});

console.log(`\n✈️ 지역 국제공항 (${allAirports.length - majorAirports.length}개):`);
console.log('-'.repeat(80));
allAirports
    .filter(airport => !airport.isMajor)
    .forEach((airport, idx) => {
        console.log(`   ${idx + 1}. ${airport.iataCode} - ${airport.nameKorean} (${airport.name})`);
        console.log(`      도시: ${airport.city}, 지역: ${airport.region}`);
    });

console.log(`\n📋 전체 공항 코드 목록:`);
console.log(`   ${allCodes.join(', ')}`);

console.log('\n' + '='.repeat(80));
console.log('\n✅ 한국 국제공항 목록 확인 완료\n');

