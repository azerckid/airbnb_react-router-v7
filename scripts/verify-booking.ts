import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("Starting Booking Verification...");

    // 1. Create a dummy host
    const host = await prisma.user.upsert({
        where: { email: "host@test.com" },
        update: {},
        create: {
            email: "host@test.com",
            username: "host_test",
            name: "Host Test",
            password: "hashedpassword123", // dummy
        },
    });

    // 2. Create a dummy guest
    const guest = await prisma.user.upsert({
        where: { email: "guest@test.com" },
        update: {},
        create: {
            email: "guest@test.com",
            username: "guest_test",
            name: "Guest Test",
            password: "hashedpassword123", // dummy
        },
    });

    // 3. Create a room
    const room = await prisma.room.create({
        data: {
            title: "Test Room for Booking",
            description: "A lovely place to test code.",
            price: 100,
            ownerId: host.id,
            photo: "https://placehold.co/600x400",
        },
    });

    console.log(`Created Room: ${room.id}`);

    // 4. Create a booking
    const checkIn = new Date();
    const checkOut = new Date();
    checkOut.setDate(checkOut.getDate() + 3); // 3 nights

    const booking = await prisma.booking.create({
        data: {
            checkIn,
            checkOut,
            total: 300,
            guests: 2,
            userId: guest.id,
            roomId: room.id,
            status: "confirmed",
        },
    });

    console.log(`Created Booking: ${booking.id}`);

    // 5. Verify relations
    const fetchedBooking = await prisma.booking.findUnique({
        where: { id: booking.id },
        include: {
            user: true,
            room: true,
        },
    });

    if (!fetchedBooking) throw new Error("Booking not found!");
    if (fetchedBooking.user.email !== "guest@test.com") throw new Error("Booking user mismatch!");
    if (fetchedBooking.room.id !== room.id) throw new Error("Booking room mismatch!");

    console.log("Creation Verified. Testing Deletion...");

    // 6. Test Cascade Delete (Delete Booking directly first)
    await prisma.booking.delete({ where: { id: booking.id } });

    const deletedBooking = await prisma.booking.findUnique({ where: { id: booking.id } });
    if (deletedBooking) throw new Error("Booking delete failed!");

    console.log("Direct Delete Verified.");

    // Clean up Room and Users (optional, but good for neatness)
    await prisma.room.delete({ where: { id: room.id } });
    // We keep users for potential re-runs or just leave them

    console.log("Booking Logic Verified Successfully! ✅");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
