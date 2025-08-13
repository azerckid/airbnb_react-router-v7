import {
    Box,
    Heading,
    Table,
    Button,
    HStack,
    Badge,
    Avatar,
    Text,
    IconButton
} from "@chakra-ui/react";
import { prisma } from "~/db.server";
import { requireUser } from "~/services/auth.server";
import type { Route } from "./+types/admin.users";
import { Form, redirect } from "react-router";
import { FaTrash, FaEdit } from "react-icons/fa";

export async function loader({ request }: Route.LoaderArgs) {
    const user = await requireUser(request);
    if (!user.isAdmin) throw redirect("/"); // Double check

    const users = await prisma.user.findMany({
        orderBy: { createdAt: "desc" }
    });

    return { users };
}

export async function action({ request }: Route.ActionArgs) {
    const user = await requireUser(request);
    if (!user.isAdmin) throw redirect("/");

    const formData = await request.formData();
    const intent = formData.get("intent");
    const targetUserId = formData.get("userId");

    if (intent === "delete" && typeof targetUserId === "string") {
        // Prevent deleting yourself
        if (targetUserId === user.id) {
            return { error: "Cannot delete yourself" };
        }
        await prisma.user.delete({ where: { id: targetUserId } });
    }

    return null;
}

import { TableSkeleton } from "~/components/common/TableSkeleton";
import { useNavigation } from "react-router";

export default function AdminUsers({ loaderData }: Route.ComponentProps) {
    const { users } = loaderData;
    const navigation = useNavigation();
    const isLoading = navigation.state === "loading" && navigation.location.pathname === "/admin/users";

    if (isLoading) {
        return (
            <Box>
                <HStack justify="space-between" mb={6}>
                    <Heading size="lg">User Management</Heading>
                    <Button colorPalette="blue">Add User</Button>
                </HStack>
                <TableSkeleton headers={["User", "Role", "Joined", "Actions"]} />
            </Box>
        );
    }

    return (
        <Box>
            <HStack justify="space-between" mb={6}>
                <Heading size="lg">User Management</Heading>
                <Button colorPalette="blue">Add User</Button>
            </HStack>

            <Box borderWidth="1px" borderRadius="lg" overflow="hidden" bg="white">
                <Table.Root interactive>
                    <Table.Header>
                        <Table.Row bg="gray.50">
                            <Table.ColumnHeader>User</Table.ColumnHeader>
                            <Table.ColumnHeader>Role</Table.ColumnHeader>
                            <Table.ColumnHeader>Joined</Table.ColumnHeader>
                            <Table.ColumnHeader textAlign="end">Actions</Table.ColumnHeader>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {users.map((user: any) => (
                            <Table.Row key={user.id}>
                                <Table.Cell>
                                    <HStack gap={3}>
                                        <Avatar.Root size="sm">
                                            <Avatar.Image src={user.avatar || undefined} />
                                            <Avatar.Fallback name={user.name || user.username} />
                                        </Avatar.Root>
                                        <Box>
                                            <Text fontWeight="medium">{user.name || user.username}</Text>
                                            <Text fontSize="xs" color="gray.500">{user.email}</Text>
                                        </Box>
                                    </HStack>
                                </Table.Cell>
                                <Table.Cell>
                                    <HStack>
                                        {user.isAdmin && <Badge colorPalette="purple">Admin</Badge>}
                                        {user.isHost && <Badge colorPalette="green">Host</Badge>}
                                        {!user.isAdmin && !user.isHost && <Badge colorPalette="gray">User</Badge>}
                                    </HStack>
                                </Table.Cell>
                                <Table.Cell color="gray.500">
                                    {new Date(user.createdAt).toLocaleDateString()}
                                </Table.Cell>
                                <Table.Cell textAlign="end">
                                    <HStack justify="flex-end" gap={2}>
                                        <IconButton aria-label="Edit" size="sm" variant="ghost">
                                            <FaEdit />
                                        </IconButton>
                                        <Form method="post" onSubmit={(e) => {
                                            if (!confirm("Are you sure you want to delete this user?")) {
                                                e.preventDefault();
                                            }
                                        }}>
                                            <input type="hidden" name="intent" value="delete" />
                                            <input type="hidden" name="userId" value={user.id} />
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
                                    </HStack>
                                </Table.Cell>
                            </Table.Row>
                        ))}
                    </Table.Body>
                </Table.Root>
            </Box>
        </Box>
    );
}
