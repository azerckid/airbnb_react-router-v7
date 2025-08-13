import { useState } from "react";
import type { Route } from "./+types/rooms.$roomId";
import { prisma } from "~/db.server";
import { requireUser, getOptionalUser } from "~/services/auth.server";
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
import {
    FaStar,
    FaWifi,
    FaTv,
    FaParking,
    FaSwimmingPool
} from "react-icons/fa";
import { DayPicker, type DateRange } from "react-day-picker";
import "react-day-picker/style.css";
import "~/styles/calendar.css";
import { differenceInCalendarDays } from "date-fns";
import { Form, redirect, useActionData, useNavigation } from "react-router";

export function meta({ data }: Route.MetaArgs) {
    if (!data) return [{ title: "Room not found" }];
    return [
        { title: data.room.title },
        { name: "description", content: data.room.description },
    ];
}

export async function loader({ request, params }: Route.LoaderArgs) {
    const user = await getOptionalUser(request); // Get user for auth check
    const roomId = params.roomId as string;
    const room = await prisma.room.findUnique({
        where: { id: roomId },
        include: {
            owner: true,
            category: true,
            reviews: {
                include: { user: true },
                orderBy: { createdAt: "desc" } // Show newest first
            }
        }
    });

    if (!room) {
        throw new Response("Room not found", { status: 404 });
    }

    return { room, user };
}

export async function action({ request, params }: Route.ActionArgs) {
    const user = await requireUser(request);
    const roomId = params.roomId as string;
    const formData = await request.formData();
    const intent = formData.get("intent");

    if (intent === "create_review") {
        const rating = Number(formData.get("rating"));
        const comment = formData.get("comment") as string;

        // Basic validation
        if (!rating || rating < 1 || rating > 5) {
            return { error: "Please provide a valid rating (1-5)." };
        }
        if (!comment || comment.trim().length === 0) {
            return { error: "Please write a comment." };
        }

        await prisma.review.create({
            data: {
                rating,
                comment,
                roomId,
                userId: user.id
            }
        });
        return { success: true };
    }

    // ... existing booking logic ...
    const checkInString = formData.get("checkIn") as string;
    const checkOutString = formData.get("checkOut") as string;
    const guests = Number(formData.get("guests"));
    const total = Number(formData.get("total"));

    if (!checkInString || !checkOutString) {
        return { error: "Missing dates" };
    }

    const checkIn = new Date(checkInString);
    const checkOut = new Date(checkOutString);

    // Create Booking
    await prisma.booking.create({
        data: {
            checkIn,
            checkOut,
            guests,
            total,
            userId: user.id,
            roomId
        }
    });

    return redirect("/trips");
}

export default function RoomDetail({ loaderData }: Route.ComponentProps) {
    const { room, user } = loaderData;
    const [selectedRange, setSelectedRange] = useState<DateRange | undefined>();
    const actionData = useActionData<typeof action>();
    const navigation = useNavigation();

    // Make sure we have dates before calculations
    const checkIn = selectedRange?.from;
    const checkOut = selectedRange?.to;

    // Calculate nights
    const totalNights = checkIn && checkOut
        ? Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

    // Rating state for review form
    const [ratingInput, setRatingInput] = useState(5);
    const [commentInput, setCommentInput] = useState("");

    const rating = room.reviews.length > 0
        ? (room.reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / room.reviews.length).toFixed(1)
        : "New";

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

                {/* Images - Grid Layout */}
                <Grid
                    templateColumns={{ base: "1fr", md: "1fr 1fr", lg: "2fr 1fr 1fr" }}
                    gap={2}
                    h={{ base: "auto", md: "450px" }}
                    borderRadius="xl"
                    overflow="hidden"
                    mt={6}
                >
                    <Box gridColumn={{ base: "span 1", lg: "span 1" }} h="full">
                        <Image
                            src={room.photo || "https://placehold.co/1200x800"}
                            alt={room.title}
                            w="full"
                            h="full"
                            objectFit="cover"
                        />
                    </Box>
                    <Box display={{ base: "none", md: "block" }} h="full">
                        <Image
                            src="https://placehold.co/600x400?text=Room+2"
                            alt="Room View 2"
                            w="full"
                            h="full"
                            objectFit="cover"
                        />
                    </Box>
                    <Box display={{ base: "none", lg: "block" }} h="full">
                        <VStack h="full" gap={2}>
                            <Image
                                src="https://placehold.co/600x400?text=Room+3"
                                alt="Room View 3"
                                w="full"
                                h="50%"
                                objectFit="cover"
                            />
                            <Image
                                src="https://placehold.co/600x400?text=Room+4"
                                alt="Room View 4"
                                w="full"
                                h="50%"
                                objectFit="cover"
                            />
                        </VStack>
                    </Box>
                </Grid>

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

                        <Separator />

                        <HStack gap={4}>
                            <Avatar.Root size="lg">
                                <Avatar.Image src={room.owner.avatar || undefined} />
                                <Avatar.Fallback name={room.owner.name || undefined} />
                            </Avatar.Root>
                            <VStack align="flex-start" gap={0}>
                                <Text fontWeight="bold" fontSize="lg">Hosted by {room.owner.name}</Text>
                                <Text color="fg.muted">Superhost • 2 years hosting</Text>
                            </VStack>
                        </HStack>

                        <Separator />

                        <Box>
                            <Text fontSize="lg" lineHeight="tall">
                                {room.description}
                            </Text>
                        </Box>

                        <Separator />

                        <Box>
                            <Heading size="lg" mb={4}>What this place offers</Heading>
                            <Grid templateColumns="repeat(2, 1fr)" gap={3}>
                                <HStack><FaWifi /><Text>Fast Wifi</Text></HStack>
                                <HStack><FaTv /><Text>Smart TV</Text></HStack>
                                <HStack><FaParking /><Text>Free Parking</Text></HStack>
                                <HStack><FaSwimmingPool /><Text>Pool</Text></HStack>
                            </Grid>
                        </Box>

                        <Separator />

                        {/* Calendar Section in Main Column too */}
                        <VStack align="flex-start" gap={1}>
                            <Heading size="2xl">{room.title}</Heading>
                            <HStack fontSize="md" color="fg.muted">
                                <Text>{room.city}, {room.country}</Text>
                                <Text>•</Text>
                                <HStack gap={1}>
                                    <FaStar color="#FF385C" />
                                    <Text fontWeight="bold" color="fg.default">
                                        {room.reviews.length > 0
                                            ? (room.reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / room.reviews.length).toFixed(1)
                                            : "New"
                                        }
                                    </Text>
                                    <Text textDecoration="underline" cursor="pointer">
                                        {room.reviews.length} reviews
                                    </Text>
                                </HStack>
                            </HStack>
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

                        {/* Reviews Section */}
                        <VStack align="stretch" gap={6}>
                            <Heading size="lg">Reviews</Heading>

                            {/* Review Form */}
                            {user ? (
                                <Box p={6} borderWidth="1px" borderRadius="xl" bg="white" borderColor="border.muted">
                                    <Form method="post">
                                        <input type="hidden" name="intent" value="create_review" />
                                        <VStack align="flex-start" gap={4}>
                                            <Heading size="sm">Write a Review</Heading>

                                            {/* Star Selection */}
                                            <HStack>
                                                <Text color="fg.muted" fontSize="sm">Rating:</Text>
                                                <HStack gap={1}>
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <Box
                                                            key={star}
                                                            as="label"
                                                            cursor="pointer"
                                                            color={star <= ratingInput ? "#FF385C" : "gray.300"}
                                                            onClick={() => setRatingInput(star)}
                                                            _hover={{ transform: "scale(1.2)" }}
                                                            transition="transform 0.1s"
                                                        >
                                                            <input type="radio" name="rating" value={star} style={{ display: "none" }} defaultChecked={star === 5} />
                                                            <FaStar size={20} />
                                                        </Box>
                                                    ))}
                                                </HStack>
                                            </HStack>

                                            <Box w="full">
                                                <textarea
                                                    name="comment"
                                                    placeholder="Share your experience..."
                                                    rows={3}
                                                    style={{
                                                        width: "100%",
                                                        padding: "12px",
                                                        borderRadius: "8px",
                                                        backgroundColor: "white",
                                                        color: "inherit",
                                                        border: "1px solid #E2E8F0",
                                                        outline: "none"
                                                    }}
                                                    required
                                                />
                                            </Box>

                                            <Button type="submit" size="sm" colorPalette="red">
                                                Submit Review
                                            </Button>
                                        </VStack>
                                    </Form>
                                </Box>
                            ) : (
                                <Box p={4} bg="gray.50" borderRadius="lg">
                                    <Text color="fg.muted">Please <Text as="span" fontWeight="bold" textDecoration="underline">login</Text> to write a review.</Text>
                                </Box>
                            )}

                            {/* Reviews List */}
                            {room.reviews.length === 0 ? (
                                <Text color="fg.muted">No reviews yet.</Text>
                            ) : (
                                room.reviews.map((review: any) => (
                                    <VStack key={review.id} align="flex-start" p={4} bg="white" borderRadius="lg" borderWidth="1px" borderColor="border.muted">
                                        <HStack>
                                            <Avatar.Root size="sm">
                                                <Avatar.Image src={review.user.avatar || undefined} />
                                                <Avatar.Fallback name={review.user.name || review.user.username} />
                                            </Avatar.Root>
                                            <VStack gap={0} align="flex-start">
                                                <Text fontWeight="bold" fontSize="sm">{review.user.name || review.user.username}</Text>
                                                <Text fontSize="xs" color="fg.muted">{new Date(review.createdAt).toLocaleDateString()}</Text>
                                            </VStack>
                                        </HStack>
                                        <Text mt={2} color="fg.default">{review.comment}</Text>
                                    </VStack>
                                ))
                            )}
                        </VStack>
                    </VStack>

                    {/* Right Column: Booking Card (Sticky) */}
                    <Box
                        gridColumn={{ base: "span 1", lg: "span 1" }}
                        position="sticky"
                        top="100px"
                        h="fit-content"
                        zIndex={10}
                    >
                        <Box
                            p={6}
                            borderWidth="1px"
                            borderRadius="xl"
                            boxShadow="lg"
                            bg="white"
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

                                {checkIn && checkOut && (
                                    <Text fontSize="sm" mt={-2} mb={2} color="fg.muted">
                                        {totalNights} nights • {checkIn.toLocaleDateString()} - {checkOut.toLocaleDateString()}
                                    </Text>
                                )}

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
