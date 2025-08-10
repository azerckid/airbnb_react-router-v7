import { Box, Grid, Heading, HStack, SimpleGrid, Text, VStack } from "@chakra-ui/react";
import type { IAmenity } from "~/types";

interface RoomAmenitiesProps {
    amenities: IAmenity[];
}

export function RoomAmenities({ amenities }: RoomAmenitiesProps) {
    if (!amenities || amenities.length === 0) {
        return null;
    }

    return (
        <Box mt={{ base: 6, md: 10 }}>
            <Heading fontSize={{ base: "xl", md: "2xl" }} mb={5}>
                What this place offers
            </Heading>
            <Grid
                templateColumns={{
                    base: "1fr",
                    md: "1fr 1fr",
                    lg: "1fr 1fr 1fr",
                }}
                gap={{ base: 3, md: 4 }}
                mt={5}
            >
                {amenities.map((amenity) => (
                    <HStack key={amenity.pk} alignItems="flex-start" gap={3}>
                        <Box
                            w="24px"
                            h="24px"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            flexShrink={0}
                            mt={0.5}
                        >
                            <Text fontSize="lg">✓</Text>
                        </Box>
                        <VStack alignItems="flex-start" gap={0} flex={1}>
                            <Text fontWeight="medium" fontSize="md">
                                {amenity.name}
                            </Text>
                            {amenity.description && (
                                <Text fontSize="sm" color="gray.600">
                                    {amenity.description}
                                </Text>
                            )}
                        </VStack>
                    </HStack>
                ))}
            </Grid>
        </Box>
    );
}

