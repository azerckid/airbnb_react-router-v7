import {
    Box,
    Heading,
    Table,
    Button,
    HStack,
    Badge,
    Avatar,
    Text,
    IconButton,
    VStack,
} from "@chakra-ui/react";
import { prisma } from "~/db.server";
import { requireUser } from "~/services/auth.server";
import type { Route } from "./+types/users";
import { Form, redirect, useNavigation } from "react-router";
import { FaTrash, FaEdit } from "react-icons/fa";
import { TableSkeleton } from "~/components/common/TableSkeleton";
import { useState, useEffect } from "react";
import { toaster } from "~/components/ui/toaster";
import {
    DialogBody,
    DialogCloseTrigger,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogRoot,
    DialogTitle,
    DialogTrigger,
} from "~/components/ui/dialog"
import { Switch } from "~/components/ui/switch"

export async function loader({ request }: Route.LoaderArgs) {
    const user = await requireUser(request);
    if (!user.isAdmin) throw redirect("/");

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
    const targetUserId = formData.get("userId") as string;

    if (intent === "delete") {
        if (targetUserId === user.id) return { error: "Cannot delete yourself" };
        await prisma.user.delete({ where: { id: targetUserId } });
        return { success: "User deleted" };
    }

    if (intent === "updateRole") {
        if (targetUserId === user.id) return { error: "Cannot change your own role" };

        const isAdmin = formData.get("isAdmin") === "on";
        const isHost = formData.get("isHost") === "on";

        await prisma.user.update({
            where: { id: targetUserId },
            data: { isAdmin, isHost }
        });
        return { success: "User role updated" };
    }

    return null;
}

export default function AdminUsers({ loaderData, actionData }: Route.ComponentProps) {
    const { users } = loaderData;
    const navigation = useNavigation();
    const isLoading = navigation.state === "loading" && navigation.location.pathname === "/admin/users";

    const [isOpen, setIsOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);

    useEffect(() => {
        if (actionData?.success) {
            toaster.create({ description: actionData.success, type: "success" });
            setIsOpen(false);
            setEditingUser(null);
        } else if (actionData?.error) {
            toaster.create({ description: actionData.error, type: "error" });
        }
    }, [actionData]);

    const handleEdit = (user: any) => {
        setEditingUser(user);
        setIsOpen(true);
    };

    if (isLoading) {
        return (
            <Box>
                <HStack justify="space-between" mb={6}>
                    <Heading size="lg">User Management</Heading>
                    <Button colorPalette="blue" disabled>Add User</Button>
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
                                        <IconButton
                                            aria-label="Edit"
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleEdit(user)}
                                        >
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

            <DialogRoot open={isOpen} onOpenChange={(e) => setIsOpen(e.open)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit User Role</DialogTitle>
                    </DialogHeader>
                    <DialogBody>
                        <Form id="edit-role-form" method="post">
                            <input type="hidden" name="intent" value="updateRole" />
                            <input type="hidden" name="userId" value={editingUser?.id} />

                            <VStack align="stretch" gap={4}>
                                <Box>
                                    <Text fontWeight="bold" mb={1}>{editingUser?.name || editingUser?.username}</Text>
                                    <Text fontSize="sm" color="gray.500">{editingUser?.email}</Text>
                                </Box>

                                <Switch
                                    name="isHost"
                                    defaultChecked={editingUser?.isHost}
                                >
                                    Host Access
                                </Switch>

                                <Switch
                                    name="isAdmin"
                                    defaultChecked={editingUser?.isAdmin}
                                    colorPalette="purple"
                                >
                                    Admin Access
                                </Switch>
                            </VStack>
                        </Form>
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                        <Button form="edit-role-form" type="submit" colorPalette="blue" loading={navigation.state === "submitting"}>
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </DialogRoot>
        </Box>
    );
}
