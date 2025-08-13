import {
    Box,
    Container,
    Grid,
    HStack,
    Skeleton,
    VStack,
    Separator
} from "@chakra-ui/react";

export function RoomDetailSkeleton() {
    return (
        <Container maxW="7xl" py={10}>
            <VStack align="stretch" gap={6}>
                {/* Header Skeleton */}
                <VStack align="stretch" gap={2}>
                    <Skeleton height="10" width="50%" />
                    <HStack>
                        <Skeleton height="5" width="100px" />
                        <Skeleton height="5" width="100px" />
                        <Skeleton height="5" width="150px" />
                    </HStack>
                </VStack>

                {/* Images Grid Skeleton */}
                <Grid
                    templateColumns={{ base: "1fr", md: "1fr 1fr", lg: "2fr 1fr 1fr" }}
                    gap={2}
                    h={{ base: "300px", md: "450px" }}
                    mt={6}
                    borderRadius="xl"
                    overflow="hidden"
                >
                    <Box gridColumn={{ base: "span 1", lg: "span 1" }} h="full">
                        <Skeleton height="100%" width="100%" />
                    </Box>
                    <Box display={{ base: "none", md: "block" }} h="full">
                        <Skeleton height="100%" width="100%" />
                    </Box>
                    <Box display={{ base: "none", lg: "block" }} h="full">
                        <VStack h="full" gap={2}>
                            <Skeleton height="50%" width="100%" />
                            <Skeleton height="50%" width="100%" />
                        </VStack>
                    </Box>
                </Grid>

                {/* Content Layout Skeleton */}
                <Grid templateColumns={{ base: "1fr", lg: "2fr 1fr" }} gap={12} mt={4}>
                    {/* Left Column */}
                    <VStack align="stretch" gap={8}>
                        <HStack justify="space-between" w="full" pb={8}>
                            <VStack align="flex-start" gap={2} w="full">
                                <Skeleton height="8" width="60%" />
                                <Skeleton height="5" width="40%" />
                            </VStack>
                            <Skeleton height="12" width="12" borderRadius="full" />
                        </HStack>

                        <Separator />

                        <VStack align="stretch" gap={4}>
                            <Skeleton height="4" width="90%" />
                            <Skeleton height="4" width="85%" />
                            <Skeleton height="4" width="80%" />
                        </VStack>

                        <Separator />

                        <VStack align="stretch" gap={4}>
                            <Skeleton height="8" width="40%" />
                            <Grid templateColumns="repeat(2, 1fr)" gap={3}>
                                <Skeleton height="6" width="100px" />
                                <Skeleton height="6" width="100px" />
                                <Skeleton height="6" width="100px" />
                            </Grid>
                        </VStack>
                    </VStack>

                    {/* Right Column (Sticky Card) */}
                    <Box>
                        <Box p={6} borderWidth="1px" borderRadius="xl" boxShadow="lg">
                            <VStack align="stretch" gap={4}>
                                <HStack justify="space-between">
                                    <Skeleton height="8" width="100px" />
                                    <Skeleton height="5" width="50px" />
                                </HStack>
                                <Skeleton height="50px" width="100%" borderRadius="lg" />
                                <Skeleton height="40px" width="100%" borderRadius="lg" />
                            </VStack>
                        </Box>
                    </Box>
                </Grid>
            </VStack>
        </Container>
    );
}
