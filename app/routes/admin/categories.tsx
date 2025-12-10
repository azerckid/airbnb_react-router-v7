import {
    Box,
    Heading,
    HStack,
    Button,
    Table,
    Text,
    IconButton,
    Input,
    Textarea,
    VStack,
} from "@chakra-ui/react";
import { Form, useNavigation, redirect } from "react-router";
import type { Route } from "./+types/categories";
import { prisma } from "~/db.server";
import { requireUser } from "~/services/auth.server";
import { FaTrash, FaEdit, FaPlus } from "react-icons/fa";
import { TableSkeleton } from "~/components/common/TableSkeleton";
import { toaster } from "~/components/ui/toaster";
import { useEffect, useState } from "react";
import {
    DialogBody,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogRoot,
    DialogTitle,
} from "~/components/ui/dialog"

export async function loader({ request }: Route.LoaderArgs) {
    const user = await requireUser(request);
    if (!user.isAdmin) throw redirect("/");

    const categories = await prisma.category.findMany({
        orderBy: { createdAt: "desc" },
        include: {
            _count: {
                select: { rooms: true }
            }
        }
    });

    return { categories };
}

export async function action({ request }: Route.ActionArgs) {
    const user = await requireUser(request);
    if (!user.isAdmin) throw redirect("/");

    const formData = await request.formData();
    const intent = formData.get("intent");

    if (intent === "create") {
        const name = formData.get("name") as string;
        const description = formData.get("description") as string;
        const icon = formData.get("icon") as string;

        if (!name) return { error: "Name is required" };

        try {
            await prisma.category.create({
                data: { name, description, icon },
            });
            return { success: "Category created successfully" };
        } catch (e) {
            return { error: "Category likely already exists" };
        }
    }

    if (intent === "delete") {
        const id = formData.get("id") as string;
        await prisma.category.delete({ where: { id } });
        return { success: "Category deleted" };
    }

    if (intent === "edit") {
        const id = formData.get("id") as string;
        const name = formData.get("name") as string;
        const description = formData.get("description") as string;
        const icon = formData.get("icon") as string;

        if (!name) return { error: "Name is required" };

        await prisma.category.update({
            where: { id },
            data: { name, description, icon }
        });
        return { success: "Category updated" };
    }

    return null;
}

export default function AdminCategories({ loaderData, actionData }: Route.ComponentProps) {
    const { categories } = loaderData;
    const navigation = useNavigation();
    const isLoading = navigation.state === "loading" && navigation.location.pathname === "/admin/categories";

    const [isOpen, setIsOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<any>(null);

    useEffect(() => {
        if (actionData?.success) {
            toaster.create({
                title: "Success",
                description: actionData.success,
                type: "success",
            });
            setIsOpen(false);
            setEditingCategory(null);
        } else if (actionData?.error) {
            toaster.create({
                title: "Error",
                description: actionData.error,
                type: "error",
            });
        }
    }, [actionData]);

    const handleEdit = (cat: any) => {
        setEditingCategory(cat);
        setIsOpen(true);
    }

    const handleCreate = () => {
        setEditingCategory(null);
        setIsOpen(true);
    }

    if (isLoading) {
        return (
            <Box>
                <HStack justify="space-between" mb={6}>
                    <Heading size="lg">Category Management</Heading>
                    <Button colorPalette="blue" disabled>Add Category</Button>
                </HStack>
                <TableSkeleton headers={["Name", "Description", "Icon", "Rooms", "Actions"]} />
            </Box>
        )
    }

    return (
        <Box>
            <HStack justify="space-between" mb={6}>
                <Heading size="lg">Category Management</Heading>
                <Button colorPalette="blue" onClick={handleCreate}>
                    <FaPlus /> Add Category
                </Button>
            </HStack>

            <Box borderWidth="1px" borderRadius="lg" overflow="hidden" bg="white">
                <Table.Root interactive>
                    <Table.Header>
                        <Table.Row bg="gray.50">
                            <Table.ColumnHeader>Name</Table.ColumnHeader>
                            <Table.ColumnHeader>Description</Table.ColumnHeader>
                            <Table.ColumnHeader>Icon</Table.ColumnHeader>
                            <Table.ColumnHeader>Rooms</Table.ColumnHeader>
                            <Table.ColumnHeader textAlign="end">Actions</Table.ColumnHeader>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {categories.map((cat) => (
                            <Table.Row key={cat.id}>
                                <Table.Cell fontWeight="medium">{cat.name}</Table.Cell>
                                <Table.Cell color="gray.500" truncate maxW="200px">{cat.description}</Table.Cell>
                                <Table.Cell>{cat.icon}</Table.Cell>
                                <Table.Cell>{cat._count.rooms}</Table.Cell>
                                <Table.Cell textAlign="end">
                                    <HStack justify="flex-end" gap={2}>
                                        <IconButton
                                            aria-label="Edit"
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleEdit(cat)}
                                        >
                                            <FaEdit />
                                        </IconButton>
                                        <Form method="post" onSubmit={(e) => {
                                            if (!confirm("Delete this category?")) e.preventDefault();
                                        }}>
                                            <input type="hidden" name="intent" value="delete" />
                                            <input type="hidden" name="id" value={cat.id} />
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
                        {categories.length === 0 && (
                            <Table.Row>
                                <Table.Cell colSpan={5} textAlign="center" py={10}>
                                    <Text color="gray.500">No categories found.</Text>
                                </Table.Cell>
                            </Table.Row>
                        )}
                    </Table.Body>
                </Table.Root>
            </Box>

            {/* Create/Edit Modal */}
            <DialogRoot open={isOpen} onOpenChange={(e) => setIsOpen(e.open)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingCategory ? "Edit Category" : "New Category"}</DialogTitle>
                    </DialogHeader>
                    <DialogBody>
                        <Form id="category-form" method="post">
                            <input type="hidden" name="intent" value={editingCategory ? "edit" : "create"} />
                            {editingCategory && <input type="hidden" name="id" value={editingCategory.id} />}

                            <VStack gap={4} align="stretch">
                                <Box>
                                    <Text fontSize="sm" fontWeight="bold" mb={1}>Name</Text>
                                    <Input name="name" defaultValue={editingCategory?.name} placeholder="e.g. Tiny Homes" required />
                                </Box>
                                <Box>
                                    <Text fontSize="sm" fontWeight="bold" mb={1}>Icon Name</Text>
                                    <Input name="icon" defaultValue={editingCategory?.icon} placeholder="e.g. FaHome (React Icons name)" />
                                </Box>
                                <Box>
                                    <Text fontSize="sm" fontWeight="bold" mb={1}>Description</Text>
                                    <Textarea name="description" defaultValue={editingCategory?.description} placeholder="Description" />
                                </Box>
                            </VStack>
                        </Form>
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                        <Button form="category-form" type="submit" colorPalette="blue" loading={navigation.state === "submitting"}>
                            {editingCategory ? "Update" : "Create"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </DialogRoot>
        </Box>
    );
}
