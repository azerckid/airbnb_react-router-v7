import {
    Container,
    Heading,
    VStack,
    Text,
    HStack,
    Box,
    Badge,
    Image,
    Button,
    Stack,
} from "@chakra-ui/react";
import { Form, useLoaderData, useNavigation, useSubmit } from "react-router";
import { prisma } from "~/db.server";
import { requireUser } from "~/services/auth.server";
import type { Route } from "./+types/bookings";
import { format } from "date-fns";
import { Link } from "react-router";

export const meta: Route.MetaFunction = () => {
    return [{ title: "Manage Bookings | Airbnb Clone" }];
};

export async function loader({ request }: Route.LoaderArgs) {
    const user = await requireUser(request);
    if (!user.isHost) {
        throw new Response("Unauthorized", { status: 403 });
    }

    // Fetch bookings for rooms owned by the current user
    const bookings = await prisma.booking.findMany({
        where: {
            room: {
                ownerId: user.id,
            },
        },
        include: {
            room: true,
            user: true, // The guest who booked
        },
        orderBy: {
            createdAt: "desc",
        },
    });

    return { bookings };
}

export async function action({ request }: Route.ActionArgs) {
    const user = await requireUser(request);
    const formData = await request.formData();
    const bookingId = formData.get("bookingId") as string;
    const actionType = formData.get("actionType") as string; // "confirm" or "cancel"

    // Verify ownership of the booking's room
    const booking = await prisma.booking.findFirst({
        where: {
            id: bookingId,
            room: {
                ownerId: user.id,
            },
        },
    });

    if (!booking) {
        throw new Response("Booking not found or unauthorized", { status: 404 });
    }

    const newStatus = actionType === "confirm" ? "confirmed" : "cancelled";

    await prisma.booking.update({
        where: { id: bookingId },
        data: { status: newStatus },
    });

    return { success: true };
}

export default function HostBookings({ loaderData }: Route.ComponentProps) {
    const { bookings } = loaderData;
    const submit = useSubmit();

    const handleAction = (bookingId: string, actionType: "confirm" | "cancel") => {
        const formData = new FormData();
        formData.append("bookingId", bookingId);
        formData.append("actionType", actionType);
        submit(formData, { method: "post", replace: true });
    };

    const getStatusColor = (status: string) => {
        if (status === "confirmed") return "green";
        if (status === "cancelled") return "red";
        return "yellow";
    };

    interface BookingItem {
        id: string;
        checkIn: Date | string;
        checkOut: Date | string;
        total: number;
        status: string;
        room: {
            title: string;
            photo: string | null;
        };
        user: {
            name: string | null;
            username: string;
        };
    }

    return (
        <Container maxW="5xl" py={10}>
            <VStack align="stretch" gap={8}>
                <Heading size="2xl">Manage Bookings</Heading>

                {bookings.length === 0 ? (
                    <Box textAlign="center" py={10} borderWidth="1px" borderRadius="lg">
                        <Text fontSize="lg" color="gray.500">
                            No bookings found for your listings.
                        </Text>
                    </Box>
                ) : (
                    <VStack align="stretch" gap={4}>
                        {bookings.map((booking: BookingItem) => (
                            <Box
                                key={booking.id}
                                p={4}
                                borderWidth="1px"
                                borderRadius="lg"
                                bg="white"
                                boxShadow="sm"
                            >
                                <Stack direction={{ base: "column", md: "row" }} justify="space-between" align={{ md: "center" }} gap={4}>
                                    {/* Booking Info */}
                                    <HStack gap={4} flex={1}>
                                        <Image
                                            src={booking.room.photo || "https://placehold.co/100"}
                                            alt={booking.room.title}
                                            boxSize="80px"
                                            objectFit="cover"
                                            borderRadius="md"
                                        />
                                        <VStack align="start" gap={1}>
                                            <Heading size="sm" truncate maxW="300px">
                                                {booking.room.title}
                                            </Heading>
                                            <Text fontSize="sm">
                                                Guest: <b>{booking.user.name || booking.user.username}</b>
                                            </Text>
                                            <Text fontSize="sm" color="gray.500">
                                                {format(new Date(booking.checkIn), "MMM dd, yyyy")} -{" "}
                                                {format(new Date(booking.checkOut), "MMM dd, yyyy")}
                                            </Text>
                                        </VStack>
                                    </HStack>

                                    {/* Status & Actions */}
                                    <HStack gap={4} wrap="wrap" justify="flex-end">
                                        <VStack align="flex-end" gap={0}>
                                            <Text fontWeight="bold">${booking.total}</Text>
                                            <Badge colorPalette={getStatusColor(booking.status)}>
                                                {booking.status.toUpperCase()}
                                            </Badge>
                                        </VStack>

                                        {booking.status === "pending" && (
                                            <HStack>
                                                <Button
                                                    size="sm"
                                                    colorPalette="green"
                                                    onClick={() => handleAction(booking.id, "confirm")}
                                                >
                                                    Approve
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    colorPalette="red"
                                                    variant="outline"
                                                    onClick={() => handleAction(booking.id, "cancel")}
                                                >
                                                    Decline
                                                </Button>
                                            </HStack>
                                        )}
                                        {booking.status !== "pending" && (
                                            <Button size="sm" variant="ghost" disabled>
                                                {booking.status === "confirmed" ? "Approved" : "Declined"}
                                            </Button>
                                        )}
                                    </HStack>
                                </Stack>
                            </Box>
                        ))}
                    </VStack>
                )}
            </VStack>
        </Container>
    );
}
