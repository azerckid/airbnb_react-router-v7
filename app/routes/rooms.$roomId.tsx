import { useState } from "react";
import type { Route } from "./+types/rooms.$roomId";
import { prisma } from "~/db.server";
import { requireUser, getUserId } from "~/services/auth.server";
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
import { DayPicker, type DateRange } from "react-day-picker";
import "react-day-picker/style.css";
import "~/styles/calendar.css";
import { differenceInCalendarDays } from "date-fns";
import { Form, redirect } from "react-router";

export function meta({ data }: Route.MetaArgs) {
    if (!data) return [{ title: "Room not found" }];
    return [
        { title: data.room.title },
        { name: "description", content: data.room.description },
    ];
}

export async function loader({ params, request }: Route.LoaderArgs) {
    const userId = await getUserId(request);
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

    return { room, user: userId ? { id: userId } : null }; // Pass minimal user info or handle full user fetch if needed
}

export async function action({ request, params }: Route.ActionArgs) {
    const user = await requireUser(request); // Throws redirect if not expected

    const formData = await request.formData();
    const checkIn = formData.get("checkIn") as string;
    const checkOut = formData.get("checkOut") as string;
    const total = formData.get("total") as string;
    const guests = formData.get("guests") as string;

    if (!checkIn || !checkOut || !total) {
        return { error: "Missing required fields" };
    }

    try {
        await prisma.booking.create({
            data: {
                checkIn: new Date(checkIn),
                checkOut: new Date(checkOut),
                total: parseInt(total),
                guests: parseInt(guests) || 1,
                userId: user.id,
                roomId: params.roomId!,
                status: "confirmed" // Auto-confirm for MVP
            }
        });
        return redirect("/trips");
    } catch (e) {
        console.error(e);
        return { error: "Booking failed" };
    }
}

export default function RoomDetail({ loaderData }: Route.ComponentProps) {
    const { room, user } = loaderData;
    const [selectedRange, setSelectedRange] = useState<DateRange | undefined>();

    const rating = room.reviews.length > 0
        ? (room.reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / room.reviews.length).toFixed(1)
        : "New";

    // Price Calculation
    const checkIn = selectedRange?.from;
    const checkOut = selectedRange?.to;

    let totalNights = 0;
    if (checkIn && checkOut) {
        totalNights = differenceInCalendarDays(checkOut, checkIn);
    }

    const totalPrice = totalNights > 0 ? room.price * totalNights : room.price;

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

                        {/* Calendar Section in Main Column too */}
                        <VStack align="flex-start" gap={4}>
                            <Heading size="md">Select check-in date</Heading>
                            <Text color="fg.muted" fontSize="sm">Add your travel dates for exact pricing</Text>
                            <Box
                                borderWidth="1px"
                                borderRadius="xl"
                                p={4}
                                display="inline-block"
                                alignSelf="flex-start"
                                overflow="auto"
                                maxW="full"
                            >
                                <DayPicker
                                    mode="range"
                                    selected={selectedRange}
                                    onSelect={setSelectedRange}
                                    numberOfMonths={2}
                                    pagedNavigation
                                />
                            </Box>
                        </VStack>

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

                                <Grid templateColumns="1fr 1fr" borderWidth="1px" borderRadius="lg" mb={2}>
                                    <Box p={3} borderRightWidth="1px">
                                        <Text fontSize="xs" fontWeight="bold" textTransform="uppercase">Check-in</Text>
                                        <Text fontSize="sm">{checkIn ? checkIn.toLocaleDateString() : "Add date"}</Text>
                                    </Box>
                                    <Box p={3}>
                                        <Text fontSize="xs" fontWeight="bold" textTransform="uppercase">Check-out</Text>
                                        <Text fontSize="sm">{checkOut ? checkOut.toLocaleDateString() : "Add date"}</Text>
                                    </Box>
                                </Grid>

                                <Button
                                    size="lg"
                                    colorPalette="red"
                                    width="full"
                                    disabled={!checkIn || !checkOut}
                                >
                                    {checkIn && checkOut ? "Reserve" : "Check availability"}
                                </Button>

                                <Text fontSize="xs" textAlign="center" color="fg.muted">
                                    You won't be charged yet
                                </Text>

                                {checkIn && checkOut && totalNights > 0 && (
                                    <VStack gap={2} pt={4} w="full">
                                        <HStack justify="space-between" w="full">
                                            <Text textDecoration="underline">${room.price} x {totalNights} nights</Text>
                                            <Text>${room.price * totalNights}</Text>
                                        </HStack>
                                        <HStack justify="space-between" w="full">
                                            <Text textDecoration="underline">Cleaning fee</Text>
                                            <Text>$20</Text>
                                        </HStack>
                                        <HStack justify="space-between" w="full">
                                            <Text textDecoration="underline">Service fee</Text>
                                            <Text>$10</Text>
                                        </HStack>
                                        <Separator my={2} />
                                        <HStack justify="space-between" w="full" fontWeight="bold">
                                            <Text>Total before taxes</Text>
                                            <Text>${(room.price * totalNights) + 30}</Text>
                                        </HStack>

                                        <Form method="post" style={{ width: "100%" }}>
                                            <input type="hidden" name="checkIn" value={checkIn.toISOString()} />
                                            <input type="hidden" name="checkOut" value={checkOut.toISOString()} />
                                            <input type="hidden" name="total" value={(room.price * totalNights) + 30} />
                                            <input type="hidden" name="guests" value={1} />

                                            <Button
                                                type="submit"
                                                size="lg"
                                                colorPalette="red"
                                                width="full"
                                                mt={4}
                                            >
                                                Reserve
                                            </Button>
                                        </Form>
                                    </VStack>
                                )}
                            </VStack>
                        </Box>
                    </Box>
                </Grid>
            </VStack>
        </Container>
    );
}
