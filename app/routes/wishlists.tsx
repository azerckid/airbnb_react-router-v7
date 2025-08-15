import type { Route } from "./+types/wishlists";
import { prisma } from "~/db.server";
import { requireUser } from "~/services/auth.server";
import { Box, Grid, Heading, Image, Text, VStack, HStack, Container } from "@chakra-ui/react";
import { Link } from "react-router";
import { FaStar } from "react-icons/fa";
import { RoomCardSkeleton } from "~/components/common/RoomCardSkeleton";

export function meta() {
    return [
        { title: "My Wishlists - Guest House Booking" },
    ];
}

export async function loader({ request }: Route.LoaderArgs) {
    const user = await requireUser(request);

    // Fetch "Favorites" wishlist
    const wishlist = await prisma.wishlist.findFirst({
        where: {
            userId: user.id,
            name: "Favorites"
        },
        include: {
            rooms: {
                include: {
                    reviews: true,
                    owner: true,
                    category: true
                }
            }
        }
    });

    return { rooms: wishlist?.rooms || [] };
}

export default function Wishlists({ loaderData }: Route.ComponentProps) {
    const { rooms } = loaderData;

    if (rooms.length === 0) {
        return (
            <Container maxW="7xl" py={10}>
                <Heading size="2xl" mb={6}>Wishlists</Heading>
                <VStack align="center" py={20} gap={4}>
                    <Heading size="md" color="fg.muted">No saved rooms yet</Heading>
                    <Text>Start exploring and save your favorite rooms!</Text>
                    <Link to="/">
                        <Text fontWeight="bold" textDecoration="underline" mt={2}>Explore Rooms</Text>
                    </Link>
                </VStack>
            </Container>
        )
    }

    return (
        <Container maxW="7xl" py={10}>
            <Heading size="2xl" mb={8}>Favorites</Heading>
            <Grid templateColumns={{ base: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)", lg: "repeat(4, 1fr)" }} gap={6}>
                {rooms.map((room) => (
                    <Link key={room.id} to={`/rooms/${room.id}`}>
                        <VStack gap={3} align="flex-start" cursor="pointer" className="group" position="relative">
                            <Box borderRadius="xl" overflow="hidden" aspectRatio="20/19" position="relative" w="full" bg="gray.100">
                                <Image
                                    src={room.photo || "https://placehold.co/600x400"}
                                    alt={room.title}
                                    objectFit="cover"
                                    w="full"
                                    h="full"
                                    transition="transform 0.3s ease-out"
                                    _groupHover={{ transform: "scale(1.05)" }}
                                />
                            </Box>
                            <VStack gap={0} align="flex-start" w="full">
                                <HStack justify="space-between" w="full" align="flex-start">
                                    <Text fontWeight="bold" truncate maxW="70%" fontSize="md">
                                        {room.city}, {room.country}
                                    </Text>
                                    <HStack gap={1} fontSize="sm" alignItems="center">
                                        <FaStar size={12} />
                                        <Text>
                                            {room.reviews.length > 0
                                                ? (room.reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / room.reviews.length).toFixed(1)
                                                : "New"}
                                        </Text>
                                    </HStack>
                                </HStack>
                                <Text color="fg.muted" fontSize="sm">
                                    {room.category?.name || "Uncategorized"}
                                </Text>
                                <HStack gap={1} mt={1} alignItems="baseline">
                                    <Text fontWeight="bold" fontSize="md">${room.price}</Text>
                                    <Text color="fg.muted" fontSize="sm">night</Text>
                                </HStack>
                            </VStack>
                        </VStack>
                    </Link>
                ))}
            </Grid>
        </Container>
    );
}
