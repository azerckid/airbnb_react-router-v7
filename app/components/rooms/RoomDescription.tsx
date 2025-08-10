import { Box, Heading, Text } from "@chakra-ui/react";

interface RoomDescriptionProps {
    description: string;
}

export function RoomDescription({ description }: RoomDescriptionProps) {
    if (!description) {
        return null;
    }

    return (
        <Box mt={{ base: 6, md: 10 }}>
            <Heading fontSize={{ base: "xl", md: "2xl" }} mb={5}>
                About this place
            </Heading>
            <Text fontSize={{ base: "sm", md: "md" }} color="gray.700" lineHeight="tall" whiteSpace="pre-line">
                {description}
            </Text>
        </Box>
    );
}

