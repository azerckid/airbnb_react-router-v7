import {
    Box,
    Heading,
    Table,
    Button,
    HStack,
    Image,
    Text,
    IconButton,
    Badge
} from "@chakra-ui/react";
import { prisma } from "~/db.server";
import { requireUser } from "~/services/auth.server";
import type { Route } from "./+types/admin.rooms";
import { Form, redirect } from "react-router";
import { FaTrash } from "react-icons/fa";

export async function loader({ request }: Route.LoaderArgs) {
    const user = await requireUser(request);
    if (!user.isAdmin) throw redirect("/");

    const rooms = await prisma.room.findMany({
        include: {
            owner: true,
            category: true,
        },
        orderBy: { createdAt: "desc" }
    });

    return { rooms, user };
}

export async function action({ request }: Route.ActionArgs) {
    const user = await requireUser(request);
    if (!user.isAdmin) throw redirect("/");

    const formData = await request.formData();
    const intent = formData.get("intent");
    const roomId = formData.get("roomId");

    if (intent === "delete" && typeof roomId === "string") {
        await prisma.room.delete({ where: { id: roomId } });
    }

    return null;
}

import { TableSkeleton } from "~/components/common/TableSkeleton";
import { useNavigation } from "react-router";

export default function AdminRooms({ loaderData }: Route.ComponentProps) {
    const { rooms } = loaderData;
    const navigation = useNavigation();
    const isLoading = navigation.state === "loading" && navigation.location.pathname === "/admin/rooms";

    if (isLoading) {
        return (
            <Box>
                <HStack justify="space-between" mb={6}>
                    <Heading size="lg">Room Management</Heading>
                    <Button colorPalette="blue" disabled>Add Room (Coming Soon)</Button>
                </HStack>
                <TableSkeleton headers={["Room", "Location", "Price", "Owner", "Actions"]} />
            </Box>
        );
    }

    return (
        <Box>
            <HStack justify="space-between" mb={6}>
                <Heading size="lg">Room Management</Heading>
                {/* Add Room button could go to a create page or modal */}
                <Button colorPalette="blue" disabled>Add Room (Coming Soon)</Button>
            </HStack>

            <Box borderWidth="1px" borderRadius="lg" overflow="hidden" bg="white">
                <Table.Root interactive>
                    <Table.Header>
                        <Table.Row bg="gray.50">
                            <Table.ColumnHeader>Room</Table.ColumnHeader>
                            <Table.ColumnHeader>Location</Table.ColumnHeader>
                            <Table.ColumnHeader>Price</Table.ColumnHeader>
                            <Table.ColumnHeader>Owner</Table.ColumnHeader>
                            <Table.ColumnHeader textAlign="end">Actions</Table.ColumnHeader>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {rooms.map((room: any) => (
                            <Table.Row key={room.id}>
                                <Table.Cell>
                                    <HStack gap={3}>
                                        <Image
                                            src={room.photo || "https://placehold.co/100"}
                                            alt={room.title}
                                            boxSize="40px"
                                            objectFit="cover"
                                            borderRadius="md"
                                        />
                                        <Box>
                                            <Text fontWeight="medium" truncate maxW="200px">{room.title}</Text>
                                            <Badge size="sm" colorPalette="gray">{room.category?.name || "No Category"}</Badge>
                                        </Box>
                                    </HStack>
                                </Table.Cell>
                                <Table.Cell>
                                    <Text>{room.city}, {room.country}</Text>
                                </Table.Cell>
                                <Table.Cell>
                                    ${room.price}
                                </Table.Cell>
                                <Table.Cell>
                                    <HStack gap={2}>
                                        <Badge variant="outline">{room.owner.username}</Badge>
                                    </HStack>
                                </Table.Cell>
                                <Table.Cell textAlign="end">
                                    <Form method="post" onSubmit={(e) => {
                                        if (!confirm("Are you sure you want to delete this room?")) {
                                            e.preventDefault();
                                        }
                                    }}>
                                        <input type="hidden" name="intent" value="delete" />
                                        <input type="hidden" name="roomId" value={room.id} />
                                        <IconButton
                                            type="submit"
                                            aria-label="Delete"
                                            size="sm"
                                            variant="ghost"
                                            colorPalette="red"
                                        >
                                            <FaTrash />
                                        </IconButton>
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
