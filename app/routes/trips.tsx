import type { Route } from "./+types/trips";
import { prisma } from "~/db.server";
import { requireUser } from "~/services/auth.server";
import {
    Box,
    Container,
    Heading,
    Grid,
    VStack,
    HStack,
    Image,
    Text,
    Badge,
    Button
} from "@chakra-ui/react";
import { Link, Form } from "react-router";

export function meta({ }: Route.MetaArgs) {
    return [{ title: "My Trips" }];
}

export async function loader({ request }: Route.LoaderArgs) {
    const user = await requireUser(request);

    // Fetch bookings for the logged-in user
    const bookings = await prisma.booking.findMany({
        where: { userId: user.id },
        include: {
            room: true,
        },
        orderBy: {
            checkIn: "desc",
        }
    });

    return { bookings };
}

export async function action({ request }: Route.ActionArgs) {
    // Handle cancellation
    const user = await requireUser(request);
    const formData = await request.formData();
    const bookingId = formData.get("bookingId");

    if (bookingId && typeof bookingId === "string") {
        await prisma.booking.deleteMany({
            where: {
                id: bookingId,
                userId: user.id, // Security: Ensure user owns the booking
            }
        });
    }

    return null;
}

export default function Trips({ loaderData }: Route.ComponentProps) {
    const { bookings } = loaderData;

    return (
        <Container maxW="7xl" py={10}>
            <Heading mb={8} size="2xl">My Trips</Heading>

            {bookings.length === 0 ? (
                <VStack py={20} gap={4}>
                    <Heading size="lg">No trips yet</Heading>
                    <Text color="fg.muted">Time to dust off your bags and start planning your next adventure</Text>
                    <Link to="/">
                        <Button colorPalette="red" variant="outline">Start searching</Button>
                    </Link>
                </VStack>
            ) : (
                <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }} gap={6}>
                    {bookings.map((booking: any) => (
                        <Box key={booking.id} borderWidth="1px" borderRadius="xl" overflow="hidden" boxShadow="sm">
                            <Box aspectRatio="16/9" position="relative">
                                <Image
                                    src={booking.room.photo || "https://placehold.co/600x400"}
                                    alt={booking.room.title}
                                    objectFit="cover"
                                    w="full"
                                    h="full"
                                />
                                <Badge
                                    position="absolute"
                                    top={3}
                                    right={3}
                                    colorPalette={new Date(booking.checkIn) > new Date() ? "green" : "gray"}
                                >
                                    {new Date(booking.checkIn) > new Date() ? "Upcoming" : "Past"}
                                </Badge>
                            </Box>

                            <VStack align="flex-start" p={5} gap={3}>
                                <VStack align="flex-start" gap={1}>
                                    <Heading size="md" truncate w="full">{booking.room.title}</Heading>
                                    <Text fontSize="sm" color="fg.muted">{booking.room.city}, {booking.room.country}</Text>
                                </VStack>

                                <HStack justify="space-between" w="full" fontSize="sm">
                                    <VStack align="flex-start" gap={0}>
                                        <Text fontWeight="bold">Check-in</Text>
                                        <Text color="fg.muted">{new Date(booking.checkIn).toLocaleDateString()}</Text>
                                    </VStack>
                                    <VStack align="flex-end" gap={0}>
                                        <Text fontWeight="bold">Check-out</Text>
                                        <Text color="fg.muted">{new Date(booking.checkOut).toLocaleDateString()}</Text>
                                    </VStack>
                                </HStack>

                                {new Date(booking.checkIn) > new Date() && (
                                    <Form method="delete" style={{ width: "100%" }}>
                                        <input type="hidden" name="bookingId" value={booking.id} />
                                        <Button
                                            type="submit"
                                            variant="outline"
                                            colorPalette="red"
                                            size="sm"
                                            width="full"
                                        >
                                            Cancel Booking
                                        </Button>
                                    </Form>
                                )}
                            </VStack>
                        </Box>
                    ))}
                </Grid>
            )}
        </Container>
    );
}
