import { Box, Button, Grid, Image, Skeleton, VStack } from "@chakra-ui/react";
import { FaTrash } from "react-icons/fa";
import type { IPhoto, IRoom } from "~/types";

interface RoomPhotoGalleryProps {
    photos: IPhoto[];
    room: IRoom;
    isLoading: boolean;
    onDeleteClick: (photoPk: string) => void;
}

export function RoomPhotoGallery({ photos, room, isLoading, onDeleteClick }: RoomPhotoGalleryProps) {
    const displayPhotos = photos.slice(0, 5);

    if (displayPhotos.length === 0) {
        return null;
    }

    if (displayPhotos.length === 1) {
        return (
            <Box mt={{ base: 4, md: 8 }} rounded="xl" overflow="hidden" position="relative">
                {room.is_owner && displayPhotos[0] && (
                    <Button
                        position="absolute"
                        top={2}
                        right={2}
                        zIndex={10}
                        size="sm"
                        variant="ghost"
                        bg="transparent"
                        _hover={{ bg: "rgba(0, 0, 0, 0.1)" }}
                        onClick={() => onDeleteClick(displayPhotos[0].pk)}
                        aria-label="Delete photo"
                    >
                        <FaTrash color="red" />
                    </Button>
                )}
                {displayPhotos[0] && displayPhotos[0].file && displayPhotos[0].file.trim() !== "" ? (
                    isLoading ? (
                        <Skeleton h={{ base: "50vh", md: "60vh" }} w="100%" />
                    ) : (
                        <Image
                            objectFit="cover"
                            w="100%"
                            h={{ base: "50vh", md: "60vh" }}
                            src={displayPhotos[0].file}
                            alt={displayPhotos[0].description || room.name}
                            loading="lazy"
                        />
                    )
                ) : null}
            </Box>
        );
    }

    return (
        <>
            {/* Mobile View */}
            <VStack
                mt={{ base: 4, md: 8 }}
                gap={{ base: 3, md: 2 }}
                display={{ base: "flex", md: "none" }}
            >
                {displayPhotos.map((photo) => {
                    if (!photo || !photo.file || photo.file.trim() === "") return null;
                    return (
                        <Box
                            key={photo.pk}
                            w="100%"
                            rounded="xl"
                            overflow="hidden"
                            position="relative"
                            h={{ base: "60vh", sm: "50vh" }}
                        >
                            {room.is_owner && (
                                <Button
                                    position="absolute"
                                    top={2}
                                    right={2}
                                    zIndex={10}
                                    size="sm"
                                    variant="ghost"
                                    bg="transparent"
                                    _hover={{ bg: "rgba(0, 0, 0, 0.1)" }}
                                    onClick={() => onDeleteClick(photo.pk)}
                                    aria-label="Delete photo"
                                >
                                    <FaTrash color="red" />
                                </Button>
                            )}
                            {isLoading ? (
                                <Skeleton h="100%" w="100%" />
                            ) : (
                                <Image
                                    objectFit="cover"
                                    w="100%"
                                    h="100%"
                                    src={photo.file}
                                    alt={photo.description || room.name}
                                    loading="lazy"
                                />
                            )}
                        </Box>
                    );
                })}
            </VStack>

            {/* Desktop Grid View */}
            {displayPhotos.length > 1 && (
                <Grid
                    mt={{ base: 4, md: 8 }}
                    rounded="xl"
                    overflow="hidden"
                    gap={2}
                    height="60vh"
                    templateRows="1fr 1fr"
                    templateColumns="repeat(4, 1fr)"
                    display={{ base: "none", md: "grid" }}
                >
                    {displayPhotos.slice(0, 5).map((photo, index) => {
                        if (!photo || !photo.file || photo.file.trim() === "") return null;

                        const isFirst = index === 0;
                        return (
                            <Box
                                key={photo.pk}
                                gridColumn={isFirst ? "span 2" : "span 1"}
                                gridRow={isFirst ? "span 2" : "span 1"}
                                overflow="hidden"
                                position="relative"
                            >
                                {room.is_owner && (
                                    <Button
                                        position="absolute"
                                        top={2}
                                        right={2}
                                        zIndex={10}
                                        size="sm"
                                        variant="ghost"
                                        bg="transparent"
                                        _hover={{ bg: "rgba(0, 0, 0, 0.1)" }}
                                        onClick={() => onDeleteClick(photo.pk)}
                                        aria-label="Delete photo"
                                    >
                                        <FaTrash color="red" />
                                    </Button>
                                )}
                                {isLoading ? (
                                    <Skeleton h="100%" w="100%" />
                                ) : (
                                    <Image
                                        objectFit="cover"
                                        w="100%"
                                        h="100%"
                                        src={photo.file}
                                        alt={photo.description || room.name}
                                        loading="lazy"
                                    />
                                )}
                            </Box>
                        );
                    })}
                </Grid>
            )}
        </>
    );
}

