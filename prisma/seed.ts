import { prisma } from "../app/db.server";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Fix for __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Robust CSV Line Parser
function parseCSVLine(line: string): string[] {
    const result = [];
    let startValueIndex = 0;
    let insideQuote = false;

    for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') {
            insideQuote = !insideQuote;
        } else if (line[i] === ',' && !insideQuote) {
            let val = line.substring(startValueIndex, i).trim();
            // Remove surrounding quotes and handle double quotes
            if (val.startsWith('"') && val.endsWith('"')) {
                val = val.slice(1, -1).replace(/""/g, '"');
            }
            result.push(val);
            startValueIndex = i + 1;
        }
    }
    // Push last value
    let val = line.substring(startValueIndex).trim();
    if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1).replace(/""/g, '"');
    }
    result.push(val);
    return result;
}

async function main() {
    console.log("🌱 Starting seed...");

    // 1. Create Admin User
    const adminEmail = "admin@airbnb.com";
    const admin = await prisma.user.upsert({
        where: { email: adminEmail },
        update: {},
        create: {
            email: adminEmail,
            username: "admin",
            name: "Admin User",
            password: bcrypt.hashSync("password123", 10),
            isAdmin: true,
            isHost: true,
            avatar: "https://github.com/shadcn.png",
        },
    });

    // 2. Ensure Categories
    const categories = [
        { name: "City", icon: "FaCity", description: "Urban apartments" },
        { name: "Beachfront", icon: "FaUmbrellaBeach", description: "Right by the beach" },
        { name: "Cabins", icon: "GiWoodCabin", description: "Cozy wood cabins" },
        { name: "Trending", icon: "FaFire", description: "Highly rated places" },
        { name: "Countryside", icon: "FaMountain", description: "Peaceful countryside" },
        { name: "Hostel", icon: "FaBed", description: "Budget friendly hostels" }, // Added for Hostel data
    ];

    const dbCategoryMap = new Map();
    for (const cat of categories) {
        const created = await prisma.category.upsert({
            where: { name: cat.name },
            update: {},
            create: cat,
        });
        dbCategoryMap.set(cat.name, created.id);
    }

    // 3. Load NYC Data (airbnb_listings.csv)
    const nycPath = path.join(__dirname, "../scripts/data/airbnb_listings.csv");
    if (fs.existsSync(nycPath)) {
        console.log("🇺🇸 Parsing NYC Airbnb data...");
        const content = fs.readFileSync(nycPath, 'utf-8');
        const lines = content.split('\n').filter(l => l.trim().length > 0);
        // Header: id,name,host_id,host_name,neighbourhood_group,neighbourhood...

        // Skip header, take top 50 to avoid overwriting too much and strict performance
        const limit = 50;
        console.log(`Processing top ${limit} NYC listings...`);

        for (let i = 1; i < Math.min(lines.length, limit + 1); i++) {
            try {
                const cols = parseCSVLine(lines[i]);
                if (cols.length < 10) continue;

                // name -> index 1
                // neighbourhood_group -> index 4
                // room_type -> index 8
                // price -> index 9

                const title = cols[1] || "Untitled Room";
                const city = cols[4] || "New York";
                const price = parseInt(cols[9]) || 100;

                await prisma.room.create({
                    data: {
                        title: title.substring(0, 100), // Safety check
                        description: `Experience the real New York in this ${cols[8] || 'place'} located in ${cols[5] || 'the city'}.`,
                        price: price,
                        maxGuests: 2,
                        city: city,
                        country: "United States",
                        address: cols[5] || city, // Neighbourhood as address
                        photo: `https://loremflickr.com/640/480/apartment,newyork?random=${i}`,
                        ownerId: admin.id,
                        categoryId: dbCategoryMap.get("City"), // Default to City
                    }
                });
            } catch (e) {
                console.error(`Skipping line ${i} due to error`);
            }
        }
    } else {
        console.log("⚠️ NYC Data not found. Skipping.");
    }

    // 4. Load Hostel Data (Hostel.csv)
    const hostelPath = path.join(__dirname, "../scripts/data/Hostel.csv");
    if (fs.existsSync(hostelPath)) {
        console.log("🇯🇵 Parsing Japan Hostel data...");
        const content = fs.readFileSync(hostelPath, 'utf-8');
        const lines = content.split('\n').filter(l => l.trim().length > 0);

        // Header: "","hostel.name","City","price.from","Distance","summary.score"...

        const limit = 50;
        console.log(`Processing top ${limit} Japan Hostels...`);

        for (let i = 1; i < Math.min(lines.length, limit + 1); i++) {
            try {
                const cols = parseCSVLine(lines[i]);
                if (cols.length < 5) continue;

                // hostel.name -> index 1
                // City -> index 2
                // price.from -> index 3
                // Distance -> index 4
                // summary.score -> index 5

                const title = cols[1] || "Untitled Hostel";
                const city = cols[2] || "Tokyo";
                const price = parseInt(cols[3]) || 50;
                const score = cols[5] || "N/A";

                await prisma.room.create({
                    data: {
                        title: title.substring(0, 100),
                        description: `A lovely hostel in ${city}. Distance: ${cols[4]}. Rating: ${score}/10.`,
                        price: price, // Typically cheaper, but just use raw value
                        maxGuests: 1, // Hostels are often single beds
                        city: city,
                        country: "Japan",
                        address: `${city}, Japan`,
                        photo: `https://loremflickr.com/640/480/hostel,japan?random=${i + 100}`,
                        ownerId: admin.id,
                        categoryId: dbCategoryMap.get("Hostel"),
                    }
                });
            } catch (e) {
                console.error(`Skipping hostel line ${i} due to error`);
            }
        }
    } else {
        console.log("⚠️ Hostel Data not found. Skipping.");
    }

    console.log("✅ Seeding completed.");
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
