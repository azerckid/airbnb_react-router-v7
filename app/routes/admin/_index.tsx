import { Heading, Grid, Box, Text, VStack, HStack, SimpleGrid } from "@chakra-ui/react";
import { prisma } from "~/db.server";
import { requireUser } from "~/services/auth.server";
import type { Route } from "./+types/_index";
import { FaUser, FaBed, FaCalendarCheck, FaDollarSign } from "react-icons/fa";

export async function loader({ request }: Route.LoaderArgs) {
    const user = await requireUser(request);

    // Fetch stats
    const totalUsers = await prisma.user.count();
    const totalRooms = await prisma.room.count();
    const totalBookings = await prisma.booking.count();

    // Calculate revenue (simple sum of confirmed bookings)
    const bookings = await prisma.booking.findMany({
        where: { status: "confirmed" },
        select: { total: true }
    });
    const totalRevenue = bookings.reduce((sum: number, booking: { total: number }) => sum + booking.total, 0);

    return { totalUsers, totalRooms, totalBookings, totalRevenue };
}

export default function AdminDashboard({ loaderData }: Route.ComponentProps) {
    const { totalUsers, totalRooms, totalBookings, totalRevenue } = loaderData;

    const stats = [
        { label: "Total Users", value: totalUsers, icon: FaUser, color: "blue.500" },
        { label: "Total Rooms", value: totalRooms, icon: FaBed, color: "green.500" },
        { label: "Bookings", value: totalBookings, icon: FaCalendarCheck, color: "orange.500" },
        { label: "Revenue", value: `$${totalRevenue.toLocaleString()}`, icon: FaDollarSign, color: "purple.500" },
    ];

    return (
        <VStack align="stretch" gap={6}>
            <Heading size="lg">Dashboard</Heading>

            <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} gap={6}>
                {stats.map((stat, index) => (
                    <Box key={index} bg="white" p={6} borderRadius="lg" boxShadow="sm">
                        <HStack justify="space-between">
                            <VStack align="flex-start" gap={0}>
                                <Text color="gray.500" fontSize="sm" fontWeight="medium">{stat.label}</Text>
                                <Text fontSize="2xl" fontWeight="bold">{stat.value}</Text>
                            </VStack>
                            <Box p={3} bg={`${stat.color.split(".")[0]}.100`} borderRadius="full" color={stat.color}>
                                <stat.icon size={20} />
                            </Box>
                        </HStack>
                    </Box>
                ))}
            </SimpleGrid>

            {/* Placeholder for Recent Activity */}
            <Box bg="white" p={6} borderRadius="lg" boxShadow="sm">
                <Heading size="md" mb={4}>Recent Activity</Heading>
                <Text color="gray.500">Charts and tables will go here in Phase 9.</Text>
            </Box>
        </VStack>
    );
}
