import {
    Box,
    Heading,
    Table,
    Badge,
    HStack,
    Text,
    Button,
    IconButton
} from "@chakra-ui/react";
import { prisma } from "~/db.server";
import { requireUser } from "~/services/auth.server";
import type { Route } from "./+types/bookings";
import { Form, redirect } from "react-router";
import { FaTrash, FaCheck } from "react-icons/fa";

export async function loader({ request }: Route.LoaderArgs) {
    const user = await requireUser(request);
    if (!user.isAdmin) throw redirect("/");

    const bookings = await prisma.booking.findMany({
        include: {
            user: true,
            room: true,
        },
        orderBy: { createdAt: "desc" }
    });

    return { bookings };
}

export async function action({ request }: Route.ActionArgs) {
    const user = await requireUser(request);
    if (!user.isAdmin) throw redirect("/");

    const formData = await request.formData();
    const intent = formData.get("intent");
    const bookingId = formData.get("bookingId");

    if (intent === "cancel" && typeof bookingId === "string") {
        await prisma.booking.delete({ where: { id: bookingId } });
    }

    return null;
}

export default function AdminBookings({ loaderData }: Route.ComponentProps) {
    const { bookings } = loaderData;

    return (
        <Box>
            <Heading size="lg" mb={6}>Booking Management</Heading>

            <Box borderWidth="1px" borderRadius="lg" overflow="hidden" bg="white">
                <Table.Root interactive>
                    <Table.Header>
                        <Table.Row bg="gray.50">
                            <Table.ColumnHeader>Room</Table.ColumnHeader>
                            <Table.ColumnHeader>Guest</Table.ColumnHeader>
                            <Table.ColumnHeader>Dates</Table.ColumnHeader>
                            <Table.ColumnHeader>Total</Table.ColumnHeader>
                            <Table.ColumnHeader>Status</Table.ColumnHeader>
                            <Table.ColumnHeader textAlign="end">Actions</Table.ColumnHeader>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {bookings.map((booking: any) => (
                            <Table.Row key={booking.id}>
                                <Table.Cell fontWeight="medium">{booking.room.title}</Table.Cell>
                                <Table.Cell>
                                    <Text>{booking.user.name || booking.user.username}</Text>
                                    <Text fontSize="xs" color="gray.500">{booking.user.email}</Text>
                                </Table.Cell>
                                <Table.Cell>
                                    <Text fontSize="sm">
                                        {new Date(booking.checkIn).toLocaleDateString()} - {new Date(booking.checkOut).toLocaleDateString()}
                                    </Text>
                                </Table.Cell>
                                <Table.Cell>${booking.total}</Table.Cell>
                                <Table.Cell>
                                    <Badge colorPalette={booking.status === "confirmed" ? "green" : "gray"}>
                                        {booking.status}
                                    </Badge>
                                </Table.Cell>
                                <Table.Cell textAlign="end">
                                    <Form method="post" onSubmit={(e) => {
                                        if (!confirm("Are you sure you want to cancel this booking?")) {
                                            e.preventDefault();
                                        }
                                    }}>
                                        <input type="hidden" name="intent" value="cancel" />
                                        <input type="hidden" name="bookingId" value={booking.id} />
                                        <Button
                                            type="submit"
                                            size="xs"
                                            variant="ghost"
                                            colorPalette="red"
                                        >
                                            Cancel
                                        </Button>
                                    </Form>
                                </Table.Cell>
                            </Table.Row>
                        ))}
                    </Table.Body>
                </Table.Root>
            </Box>
        </Box>
    );
}
