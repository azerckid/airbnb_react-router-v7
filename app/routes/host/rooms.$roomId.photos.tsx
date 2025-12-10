import type { Route } from "./+types/rooms.$roomId.photos";
import {
    Box,
    Button,
    Container,
    Heading,
    VStack,
    Text,
    Image,
    Input,
    Grid,
    HStack,
    Spinner,
    IconButton,
    Icon,
} from "@chakra-ui/react";
import { Form, useNavigation } from "react-router";
import { prisma } from "~/db.server";
import { requireUser } from "~/services/auth.server";
import { toaster } from "~/components/ui/toaster";
import { uploadImage, uploadVideo } from "~/utils/upload.server";
import { useEffect } from "react";
import { FaCloudUploadAlt, FaVideo, FaImage, FaTrash, FaStar, FaRegStar } from "react-icons/fa";

export function meta() {
    return [{ title: "Manage Photos & Video" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
    const user = await requireUser(request);
    const roomId = params.roomId;

    const room = await prisma.room.findUnique({
        where: { id: roomId },
        include: { photos: true },
    });

    if (!room) throw new Response("Room not found", { status: 404 });
    if (room.ownerId !== user.id) throw new Response("Unauthorized", { status: 403 });

    return { room };
}

export async function action({ request, params }: Route.ActionArgs) {
    const user = await requireUser(request);
    const roomId = params.roomId;
    const formData = await request.formData();
    const intent = formData.get("intent");

    if (intent === "upload_photo") {
        const file = formData.get("photo") as File;
        if (!file || file.size === 0) return { error: "No photo selected" };

        try {
            const result = await uploadImage(file);

            // Create new Photo record
            await prisma.photo.create({
                data: {
                    url: result.secure_url,
                    roomId: roomId!,
                },
            });

            return { success: true, message: "Photo added successfully" };
        } catch (error) {
            console.error("Upload failed", error);
            return { error: "Failed to upload photo" };
        }
    }

    if (intent === "upload_video") {
        const file = formData.get("video") as File;
        if (!file || file.size === 0) return { error: "No video selected" };

        try {
            const result = await uploadVideo(file);
            await prisma.room.update({
                where: { id: roomId },
                data: { video: result.secure_url },
            });
            return { success: true, message: "Video uploaded successfully" };
        } catch (error: any) {
            console.error("Upload failed", error);
            return { error: "Failed to upload video" };
        }
    }

    if (intent === "delete_photo") {
        const photoId = formData.get("photoId") as string;
        await prisma.photo.delete({ where: { id: photoId } });
        return { success: true, message: "Photo deleted" };
    }

    if (intent === "set_cover") {
        const photoUrl = formData.get("photoUrl") as string;
        await prisma.room.update({
            where: { id: roomId },
            data: { photo: photoUrl }
        });
        return { success: true, message: "Cover photo updated" };
    }

    return { error: "Invalid intent" };
}

export default function RoomPhotos({ loaderData, actionData }: Route.ComponentProps) {
    const { room } = loaderData;
    const navigation = useNavigation();
    const isUploading = navigation.state === "submitting";

    useEffect(() => {
        if (actionData?.success) {
            toaster.create({ description: actionData.message, type: "success" });
        } else if (actionData?.error) {
            toaster.create({ description: actionData.error, type: "error" });
        }
    }, [actionData]);

    return (
        <Container maxW="6xl" py={12}>
            <VStack gap={8} align="stretch">
                <Box>
                    <Heading size="2xl" mb={2}>Manage Media</Heading>
                    <Text color="gray.500">Upload multiple photos and a video.</Text>
                </Box>

                {/* Photos Section */}
                <Box borderWidth="1px" borderRadius="xl" p={6} shadow="sm">
                    <HStack justify="space-between" mb={6}>
                        <HStack>
                            <FaImage size={24} />
                            <Heading size="md">Photos</Heading>
                        </HStack>
                        <Form method="post" encType="multipart/form-data">
                            <input type="hidden" name="intent" value="upload_photo" />
                            <HStack>
                                <Input type="file" name="photo" accept="image/*" w="auto" />
                                <Button type="submit" colorPalette="red" disabled={isUploading}>
                                    {isUploading ? <Spinner size="sm" /> : <><FaCloudUploadAlt /> Add Photo</>}
                                </Button>
                            </HStack>
                        </Form>
                    </HStack>

                    <Grid templateColumns={{ base: "repeat(2, 1fr)", md: "repeat(4, 1fr)", lg: "repeat(5, 1fr)" }} gap={4}>
                        {room.photos.map((photo) => (
                            <Box key={photo.id} position="relative" borderRadius="lg" overflow="hidden" aspectRatio={1}>
                                <Image src={photo.url} w="full" h="full" objectFit="cover" />

                                {/* Actions Overlay */}
                                <Box
                                    position="absolute"
                                    top={0} left={0} right={0} bottom={0}
                                    bg="blackAlpha.600"
                                    opacity={0}
                                    _hover={{ opacity: 1 }}
                                    transition="opacity 0.2s"
                                    display="flex"
                                    flexDirection="column"
                                    justifyContent="space-between"
                                    p={2}
                                >
                                    <HStack justify="flex-end">
                                        <Form method="post">
                                            <input type="hidden" name="intent" value="delete_photo" />
                                            <input type="hidden" name="photoId" value={photo.id} />
                                            <IconButton type="submit" size="xs" colorPalette="red" variant="solid" aria-label="Delete">
                                                <FaTrash />
                                            </IconButton>
                                        </Form>
                                    </HStack>

                                    <Form method="post">
                                        <input type="hidden" name="intent" value="set_cover" />
                                        <input type="hidden" name="photoUrl" value={photo.url} />
                                        {room.photo === photo.url ? (
                                            <Button size="xs" colorPalette="green" w="full" disabled>Cover Image</Button>
                                        ) : (
                                            <Button type="submit" size="xs" variant="outline" color="white" _hover={{ bg: "whiteAlpha.300", color: "white" }} w="full">Make Cover</Button>
                                        )}
                                    </Form>
                                </Box>

                                {/* Cover Badge */}
                                {room.photo === photo.url && (
                                    <Box position="absolute" top={2} left={2} bg="green.500" color="white" px={2} py={0.5} borderRadius="md" fontSize="xs" fontWeight="bold">
                                        Cover
                                    </Box>
                                )}
                            </Box>
                        ))}
                    </Grid>
                    {room.photos.length === 0 && (
                        <Box py={10} textAlign="center" border="1px dashed" borderColor="gray.200" borderRadius="lg">
                            <Text color="gray.400">No photos uploaded yet. Add some to show off your room!</Text>
                        </Box>
                    )}
                </Box>

                {/* Video Section - Keep as single for now */}
                <Box borderWidth="1px" borderRadius="xl" p={6} shadow="sm">
                    <HStack justify="space-between" mb={4}>
                        <HStack>
                            <FaVideo size={24} />
                            <Heading size="md">Room Video</Heading>
                        </HStack>
                    </HStack>

                    <Box maxW="xl">
                        <Box
                            aspectRatio={16 / 9}
                            bg="gray.900"
                            borderRadius="lg"
                            overflow="hidden"
                            position="relative"
                            mb={4}
                        >
                            {room.video ? (
                                <video src={room.video} style={{ width: "100%", height: "100%", objectFit: "cover" }} controls />
                            ) : (
                                <Box w="full" h="full" display="flex" alignItems="center" justifyContent="center" color="gray.600">
                                    <FaVideo size={48} />
                                </Box>
                            )}
                        </Box>

                        <Form method="post" encType="multipart/form-data">
                            <input type="hidden" name="intent" value="upload_video" />
                            <HStack>
                                <Input type="file" name="video" accept="video/*" pt={1} />
                                <Button type="submit" variant="outline" colorPalette="blue" disabled={isUploading}>
                                    {isUploading ? <Spinner size="sm" /> : <><FaCloudUploadAlt /> Upload Video</>}
                                </Button>
                            </HStack>
                        </Form>
                    </Box>
                </Box>

            </VStack>
        </Container>
    );
}
