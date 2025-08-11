import type { Route } from "./+types/rooms.$roomId";
import { prisma } from "~/db.server";
import {
    Box,
    Container,
    Grid,
    Heading,
    Image,
    Text,
    VStack,
    HStack,
    Button,
    Avatar,
    Separator
} from "@chakra-ui/react";
import { FaStar } from "react-icons/fa";

export function meta({ data }: Route.MetaArgs) {
    if (!data) return [{ title: "Room not found" }];
    return [
        { title: data.room.title },
        { name: "description", content: data.room.description },
    ];
}

export async function loader({ params }: Route.LoaderArgs) {
    const room = await prisma.room.findUnique({
        where: { id: params.roomId },
        include: {
            owner: true,
            category: true,
            reviews: {
                include: {
                    user: true,
                }
            },
        }
    });

    if (!room) {
        throw new Response("Not Found", { status: 404 });
    }

    return { room };
}

export default function RoomDetail({ loaderData }: Route.ComponentProps) {
    const { room } = loaderData;

    const rating = room.reviews.length > 0
        ? (room.reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / room.reviews.length).toFixed(1)
        : "New";

    return (
        <Container maxW="7xl" py={10}>
            <VStack align="stretch" gap={6}>
                {/* Header */}
                <VStack align="stretch" gap={2}>
                    <Heading size="3xl">{room.title}</Heading>
                    <HStack fontSize="sm" color="fg.muted">
                        <FaStar />
                        <Text fontWeight="bold" color="fg.default">{rating}</Text>
                        <Text>•</Text>
                        <Text fontWeight="bold" color="fg.default" textDecoration="underline">{room.reviews.length} reviews</Text>
                        <Text>•</Text>
                        <Text>{room.city}, {room.country}</Text>
                    </HStack>
                </VStack>

                {/* Images - Simple Hero (Extend to Grid later for full clone feel) */}
                <Box borderRadius="2xl" overflow="hidden" aspectRatio="16/9" maxH="600px">
                    <Image
                        src={room.photo || "https://placehold.co/1200x800"}
                        alt={room.title}
                        w="full"
                        h="full"
                        objectFit="cover"
                    />
                </Box>

                <Grid templateColumns={{ base: "1fr", lg: "2fr 1fr" }} gap={12} mt={4}>
                    {/* Left Column: Details */}
                    <VStack align="stretch" gap={8}>
                        <HStack justify="space-between" w="full" borderBottomWidth="1px" pb={8} borderColor="border.muted">
                            <VStack align="flex-start" gap={1}>
                                <Heading size="lg">Hosted by {room.owner.name || room.owner.username}</Heading>
                                <Text color="fg.muted">
                                    {room.category?.name} • {room.category?.description}
                                </Text>
                            </VStack>
                            <Avatar.Root size="lg">
                                <Avatar.Image src={room.owner.avatar || undefined} />
                                <Avatar.Fallback name={room.owner.name || room.owner.username} />
                            </Avatar.Root>
                        </HStack>

                        <Box>
                            <Text fontSize="lg" lineHeight="tall">{room.description}</Text>
                        </Box>

                        <Separator />

                        {/* Reviews Preview (Simple List) */}
                        <VStack align="stretch" gap={4}>
                            <Heading size="md">Reviews</Heading>
                            {room.reviews.length === 0 ? (
                                <Text color="fg.muted">No reviews yet.</Text>
                            ) : (
                                room.reviews.map((review: any) => (
                                    <VStack key={review.id} align="flex-start" p={4} bg="bg.panel" borderRadius="lg" borderWidth="1px">
                                        <HStack>
                                            <Avatar.Root size="sm">
                                                <Avatar.Fallback name={review.user.name || review.user.username} />
                                            </Avatar.Root>
                                            <VStack gap={0} align="flex-start">
                                                <Text fontWeight="bold" fontSize="sm">{review.user.name || review.user.username}</Text>
                                                <Text fontSize="xs" color="fg.muted">{new Date(review.createdAt).toLocaleDateString()}</Text>
                                            </VStack>
                                        </HStack>
                                        <Text mt={2}>{review.comment}</Text>
                                    </VStack>
                                ))
                            )}
                        </VStack>
                    </VStack>

                    {/* Right Column: Booking Card (Sticky) */}
                    <Box position="relative">
                        <Box
                            position="sticky"
                            top={24}
                            p={6}
                            borderWidth="1px"
                            borderRadius="xl"
                            boxShadow="lg"
                            bg="bg.panel"
                        >
                            <VStack align="stretch" gap={4}>
                                <HStack justify="space-between" align="baseline">
                                    <HStack gap={1} align="baseline">
                                        <Text fontSize="2xl" fontWeight="bold">${room.price}</Text>
                                        <Text color="fg.muted">night</Text>
                                    </HStack>
                                    <HStack gap={1} fontSize="xs">
                                        <FaStar />
                                        <Text fontWeight="bold">{rating}</Text>
                                    </HStack>
                                </HStack>

                                <Button size="lg" colorPalette="red" width="full">
                                    Reserve
                                </Button>

                                <Text fontSize="xs" textAlign="center" color="fg.muted">
                                    You won't be charged yet
                                </Text>

                                <VStack gap={2} pt={4}>
                                    <HStack justify="space-between" w="full">
                                        <Text textDecoration="underline">Total price</Text>
                                        <Text fontWeight="bold">${room.price}</Text>
                                    </HStack>
                                </VStack>
                            </VStack>
                        </Box>
                    </Box>
                </Grid>
            </VStack>
        </Container>
    );
}
