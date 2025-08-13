import { Box, HStack, Skeleton, VStack } from "@chakra-ui/react";

export function RoomCardSkeleton() {
    return (
        <VStack gap={3} align="flex-start">
            <Skeleton height="auto" aspectRatio="20/19" width="full" borderRadius="xl" />
            <VStack gap={2} align="flex-start" w="full">
                <HStack justify="space-between" w="full">
                    <Skeleton height="5" width="60%" />
                    <Skeleton height="4" width="10%" />
                </HStack>
                <Skeleton height="4" width="40%" />
                <Skeleton height="4" width="30%" />
                <HStack gap={1} mt={1} width="full">
                    <Skeleton height="5" width="25%" />
                </HStack>
            </VStack>
        </VStack>
    );
}
