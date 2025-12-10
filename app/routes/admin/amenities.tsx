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
    useDisclosure,
    Dialog,
    Icon,
} from "@chakra-ui/react";
import { Form, useNavigation, redirect } from "react-router";
import type { Route } from "./+types/amenities";
import { prisma } from "~/db.server";
import { requireUser } from "~/services/auth.server";
import { FaTrash, FaEdit, FaPlus } from "react-icons/fa";
import { TableSkeleton } from "~/components/common/TableSkeleton";
import { toaster } from "~/components/ui/toaster";
import { useEffect, useState } from "react";
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

export async function loader({ request }: Route.LoaderArgs) {
    const user = await requireUser(request);
    if (!user.isAdmin) throw redirect("/");

    const amenities = await prisma.amenity.findMany({
        orderBy: { createdAt: "desc" },
        include: {
            _count: {
                select: { rooms: true }
            }
        }
    });

    return { amenities };
}

export async function action({ request }: Route.ActionArgs) {
    const user = await requireUser(request);
    if (!user.isAdmin) throw redirect("/");

    const formData = await request.formData();
    const intent = formData.get("intent");

    if (intent === "create") {
        const name = formData.get("name") as string;
        const description = formData.get("description") as string;

        if (!name) return { error: "Name is required" };

        try {
            await prisma.amenity.create({
                data: { name, description },
            });
            return { success: "Amenity created successfully" };
        } catch (e) {
            return { error: "Amenity with this name likely already exists" };
        }
    }

    if (intent === "delete") {
        const id = formData.get("id") as string;
        await prisma.amenity.delete({ where: { id } });
        return { success: "Amenity deleted" };
    }

    if (intent === "edit") {
        const id = formData.get("id") as string;
        const name = formData.get("name") as string;
        const description = formData.get("description") as string;

        if (!name) return { error: "Name is required" };

        await prisma.amenity.update({
            where: { id },
            data: { name, description }
        });
        return { success: "Amenity updated" };
    }

    return null;
}

export default function AdminAmenities({ loaderData, actionData }: Route.ComponentProps) {
    const { amenities } = loaderData;
    const navigation = useNavigation();
    const isLoading = navigation.state === "loading" && navigation.location.pathname === "/admin/amenities";

    // Dialog State for Edit/Create
    const [isOpen, setIsOpen] = useState(false);
    const [editingAmenity, setEditingAmenity] = useState<any>(null);

    useEffect(() => {
        if (actionData?.success) {
            toaster.create({
                title: "Success",
                description: actionData.success,
                type: "success",
            });
            setIsOpen(false);
            setEditingAmenity(null);
        } else if (actionData?.error) {
            toaster.create({
                title: "Error",
                description: actionData.error,
                type: "error",
            });
        }
    }, [actionData]);

    const handleEdit = (amenity: any) => {
        setEditingAmenity(amenity);
        setIsOpen(true);
    }

    const handleCreate = () => {
        setEditingAmenity(null);
        setIsOpen(true);
    }

    if (isLoading) {
        return (
            <Box>
                <HStack justify="space-between" mb={6}>
                    <Heading size="lg">Amenity Management</Heading>
                    <Button colorPalette="blue" disabled>Add Amenity</Button>
                </HStack>
                <TableSkeleton headers={["Name", "Description", "Used By", "Actions"]} />
            </Box>
        )
    }

    return (
        <Box>
            <HStack justify="space-between" mb={6}>
                <Heading size="lg">Amenity Management</Heading>
                <Button colorPalette="blue" onClick={handleCreate}>
                    <FaPlus /> Add Amenity
                </Button>
            </HStack>

            <Box borderWidth="1px" borderRadius="lg" overflow="hidden" bg="white">
                <Table.Root interactive>
                    <Table.Header>
                        <Table.Row bg="gray.50">
                            <Table.ColumnHeader>Name</Table.ColumnHeader>
                            <Table.ColumnHeader>Description</Table.ColumnHeader>
                            <Table.ColumnHeader>Used By</Table.ColumnHeader>
                            <Table.ColumnHeader textAlign="end">Actions</Table.ColumnHeader>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {amenities.map((amenity) => (
                            <Table.Row key={amenity.id}>
                                <Table.Cell fontWeight="medium">{amenity.name}</Table.Cell>
                                <Table.Cell color="gray.500" truncate maxW="300px">{amenity.description}</Table.Cell>
                                <Table.Cell>{amenity._count.rooms} rooms</Table.Cell>
                                <Table.Cell textAlign="end">
                                    <HStack justify="flex-end" gap={2}>
                                        <IconButton
                                            aria-label="Edit"
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleEdit(amenity)}
                                        >
                                            <FaEdit />
                                        </IconButton>
                                        <Form method="post" onSubmit={(e) => {
                                            if (!confirm("Delete this amenity?")) e.preventDefault();
                                        }}>
                                            <input type="hidden" name="intent" value="delete" />
                                            <input type="hidden" name="id" value={amenity.id} />
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
                        {amenities.length === 0 && (
                            <Table.Row>
                                <Table.Cell colSpan={4} textAlign="center" py={10}>
                                    <Text color="gray.500">No amenities found. Create one!</Text>
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
                        <DialogTitle>{editingAmenity ? "Edit Amenity" : "New Amenity"}</DialogTitle>
                    </DialogHeader>
                    <DialogBody>
                        <Form id="amenity-form" method="post">
                            <input type="hidden" name="intent" value={editingAmenity ? "edit" : "create"} />
                            {editingAmenity && <input type="hidden" name="id" value={editingAmenity.id} />}

                            <VStack gap={4} align="stretch">
                                <Box>
                                    <Text fontSize="sm" fontWeight="bold" mb={1}>Name</Text>
                                    <Input name="name" defaultValue={editingAmenity?.name} placeholder="e.g. Wifi, Pool" required />
                                </Box>
                                <Box>
                                    <Text fontSize="sm" fontWeight="bold" mb={1}>Description</Text>
                                    <Textarea name="description" defaultValue={editingAmenity?.description} placeholder="Description (optional)" />
                                </Box>
                            </VStack>
                        </Form>
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                        <Button form="amenity-form" type="submit" colorPalette="blue" loading={navigation.state === "submitting"}>
                            {editingAmenity ? "Update" : "Create"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </DialogRoot>
        </Box>
    );
}
