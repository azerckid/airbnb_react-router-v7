import { Avatar, Box, HStack, Heading, Skeleton, Text, VStack } from "@chakra-ui/react";
import type { IRoom } from "~/types";

interface RoomHostInfoProps {
    room: IRoom;
    isLoading: boolean;
}

export function RoomHostInfo({ room, isLoading }: RoomHostInfoProps) {
    return (
        <HStack
            w={{ base: "100%", md: "40%" }}
            justifyContent="space-between"
            alignItems={{ base: "flex-start", md: "center" }}
            mt={{ base: 6, md: 10 }}
            flexDirection={{ base: "column", md: "row" }}
            gap={{ base: 4, md: 0 }}
        >
            <VStack alignItems="flex-start" w={{ base: "100%", md: "auto" }}>
                {isLoading ? (
                    <Skeleton height="30px" width={{ base: "100%", md: "300px" }} />
                ) : (
                    <Heading fontSize={{ base: "xl", md: "2xl" }}>
                        House hosted by {room.owner.name}
                    </Heading>
                )}
                {isLoading ? (
                    <Skeleton height="30px" width={{ base: "100%", md: "200px" }} />
                ) : (
                    <VStack alignItems="flex-start" gap={2} w="100%">
                        <HStack justifyContent="flex-start" w="100%" flexWrap="wrap">
                            <Text fontSize={{ base: "sm", md: "md" }}>
                                {room.toilets} toilet{room.toilets === 1 ? "" : "s"}
                            </Text>
                            <Text fontSize={{ base: "sm", md: "md" }}>∙</Text>
                            <Text fontSize={{ base: "sm", md: "md" }}>
                                {room.rooms} room{room.rooms === 1 ? "" : "s"}
                            </Text>
                            {room.beds !== undefined && (
                                <>
                                    <Text fontSize={{ base: "sm", md: "md" }}>∙</Text>
                                    <Text fontSize={{ base: "sm", md: "md" }}>
                                        {room.beds} bed{room.beds === 1 ? "" : "s"}
                                    </Text>
                                </>
                            )}
                        </HStack>
                        {room.category && (
                            <Box>
                                <Text fontSize={{ base: "xs", md: "sm" }} color="gray.600" fontWeight="medium">
                                    Category: <Text as="span" fontWeight="bold">{room.category.name}</Text>
                                </Text>
                            </Box>
                        )}
                    </VStack>
                )}
            </VStack>
            {isLoading ? (
                <Skeleton width={{ base: "60px", md: "80px" }} height={{ base: "60px", md: "80px" }} rounded="full" />
            ) : (
                <Avatar.Root size={{ base: "lg", md: "xl" }}>
                    <Avatar.Image src={room.owner.avatar} alt={room.owner.name} />
                    <Avatar.Fallback name={room.owner.name} />
                </Avatar.Root>
            )}
        </HStack>
    );
}

