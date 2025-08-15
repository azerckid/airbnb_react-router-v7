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
    Switch,
    Spinner,
    createToaster,
    Stack,
    Table,
} from "@chakra-ui/react";
import { Form, useLoaderData, useNavigation, useSubmit } from "react-router";
import { prisma } from "~/db.server";
import { requireUser } from "~/services/auth.server";
import type { Route } from "./+types/host.rooms";
import { Link } from "react-router";
import { FaPlus } from "react-icons/fa";

export const meta: Route.MetaFunction = () => {
    return [{ title: "Manage Listings | Airbnb Clone" }];
};

export async function loader({ request }: Route.LoaderArgs) {
    const user = await requireUser(request);
    if (!user.isHost) {
        throw new Response("Unauthorized", { status: 403 });
    }

    const rooms = await prisma.room.findMany({
        where: { ownerId: user.id },
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            title: true,
            photo: true,
            price: true,
            country: true,
            city: true,
            isActive: true, // This should be valid now
            createdAt: true, // Keep it for sorting/display
        },
    });

    return { rooms };
}

export async function action({ request }: Route.ActionArgs) {
    const user = await requireUser(request);
    const formData = await request.formData();
    const roomId = formData.get("roomId") as string;
    const isActive = formData.get("isActive") === "true";

    // Ensure strictly that the user owns the room before updating
    const room = await prisma.room.findFirst({
        where: { id: roomId, ownerId: user.id },
    });

    if (!room) {
        throw new Response("Room not found or unauthorized", { status: 404 });
    }

    await prisma.room.update({
        where: { id: roomId },
        data: { isActive },
    });

    return { success: true };
}

export default function HostRooms({ loaderData }: Route.ComponentProps) {
    const { rooms } = loaderData;
    const submit = useSubmit();
    const navigation = useNavigation();

    // Fix implicit any by inferring from loaderData type or explicit typing
    interface RoomItem {
        id: string;
        title: string;
        photo: string | null;
        price: number;
        city: string | null;
        country: string | null;
        isActive: boolean;
        createdAt: Date | string; // serialized
    }

    const handleToggle = (roomId: string, currentStatus: boolean) => {
        const formData = new FormData();
        formData.append("roomId", roomId);
        formData.append("isActive", (!currentStatus).toString());
        submit(formData, { method: "post", replace: true });
    };

    return (
        <Container maxW="5xl" py={10}>
            <VStack align="stretch" gap={8}>
                <HStack justify="space-between" wrap="wrap">
                    <Heading size="2xl">My Listings</Heading>
                    <Button asChild colorPalette="red">
                        <Link to="/rooms/new">
                            <FaPlus style={{ marginRight: "8px" }} /> Create New Listing
                        </Link>
                    </Button>
                </HStack>

                {rooms.length === 0 ? (
                    <Box textAlign="center" py={10} borderWidth="1px" borderRadius="lg">
                        <Text fontSize="lg" color="gray.500" mb={4}>
                            You don't have any listings yet.
                        </Text>
                        <Button asChild colorPalette="red" variant="outline">
                            <Link to="/rooms/new">Create your first room</Link>
                        </Button>
                    </Box>
                ) : (
                    <VStack align="stretch" gap={4}>
                        {rooms.map((room) => (
                            <Box
                                key={room.id}
                                p={4}
                                borderWidth="1px"
                                borderRadius="lg"
                                bg="white"
                                boxShadow="sm"
                                transition="all 0.2s"
                                _hover={{ boxShadow: "md" }}
                            >
                                <HStack justify="space-between" align="center" gap={4} wrap="wrap">
                                    <HStack gap={4} flex={1}>
                                        <Image
                                            src={room.photo || "https://placehold.co/100"}
                                            alt={room.title}
                                            boxSize="80px"
                                            objectFit="cover"
                                            borderRadius="md"
                                        // fallbackSrc removed as it's not valid in v3
                                        />
                                        <VStack align="start" gap={1}>
                                            <Heading size="sm" truncate maxW={{ base: "200px", md: "400px" }}>
                                                {room.title}
                                            </Heading>
                                            <Text fontSize="sm" color="gray.500">
                                                {room.city}, {room.country} • ${room.price} / night
                                            </Text>
                                            <Badge colorPalette={room.isActive ? "green" : "gray"}>
                                                {room.isActive ? "Active" : "Hidden"}
                                            </Badge>
                                        </VStack>
                                    </HStack>

                                    <HStack gap={4}>
                                        <HStack align="center">
                                            <Text fontSize="sm" fontWeight="medium">
                                                {room.isActive ? "Visible" : "Hidden"}
                                            </Text>
                                            <Switch.Root
                                                checked={room.isActive}
                                                onCheckedChange={() => handleToggle(room.id, room.isActive)}
                                                colorPalette="red"
                                            >
                                                <Switch.HiddenInput />
                                                <Switch.Control>
                                                    <Switch.Thumb />
                                                </Switch.Control>
                                            </Switch.Root>
                                        </HStack>
                                        <HStack>
                                            <Button variant="outline" size="sm" asChild>
                                                <Link to={`/host/rooms/${room.id}/photos`}>Media</Link>
                                            </Button>
                                            <Button variant="outline" size="sm" asChild>
                                                <Link to={`/rooms/${room.id}`}>View</Link>
                                            </Button>
                                        </HStack>
                                    </HStack>
                                </HStack>
                            </Box>
                        ))}
                    </VStack>
                )}
            </VStack>
        </Container>
    );
}
