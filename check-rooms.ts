import { prisma } from './app/db.server';

async function checkRooms() {
    try {
        // Get all unique country and city combinations
        const rooms = await prisma.room.findMany({
            select: {
                country: true,
                city: true,
            },
            distinct: ['country', 'city'],
            where: {
                isActive: true
            }
        });

        console.log(`\n📊 Total unique locations: ${rooms.length}\n`);

        // Group by country
        const locationMap = new Map<string, Set<string>>();
        
        rooms.forEach(room => {
            if (room.country && room.city) {
                if (!locationMap.has(room.country)) {
                    locationMap.set(room.country, new Set());
                }
                locationMap.get(room.country)!.add(room.city);
            }
        });

        // Print results
        console.log('🏨 숙소 데이터가 있는 지역 목록:\n');
        console.log('='.repeat(60));
        
        const sortedCountries = Array.from(locationMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
        
        sortedCountries.forEach(([country, cities]) => {
            console.log(`\n📍 ${country} (${cities.size} cities):`);
            const sortedCities = Array.from(cities).sort();
            sortedCities.forEach(city => {
                console.log(`   - ${city}`);
            });
        });

        console.log('\n' + '='.repeat(60));
        console.log(`\n총 ${locationMap.size}개 국가, ${rooms.length}개 도시\n`);

        // Also show raw data
        console.log('\n📋 Raw Data (Country, City):');
        console.log('-'.repeat(60));
        rooms
            .filter(r => r.country && r.city)
            .sort((a, b) => {
                if (a.country !== b.country) {
                    return (a.country || '').localeCompare(b.country || '');
                }
                return (a.city || '').localeCompare(b.city || '');
            })
            .forEach(room => {
                console.log(`  ${room.country || 'N/A'}, ${room.city || 'N/A'}`);
            });

    } catch (e) {
        console.error("❌ Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

checkRooms();

