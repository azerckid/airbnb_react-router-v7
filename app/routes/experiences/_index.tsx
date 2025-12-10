import type { Route } from "./+types/_index";
import { Link } from "react-router";
import {
    Box,
    Container,
    Heading,
    SimpleGrid,
    VStack,
    Image,
    Text,
    HStack,
    Badge
} from "@chakra-ui/react";
import { prisma } from "~/db.server";
import { FaStar } from "react-icons/fa";

export function meta() {
    return [{ title: "Airbnb Experiences" }];
}

export async function loader() {
    const experiences = await prisma.experience.findMany({
        include: {
            host: true,
            photos: true,
            category: true
        },
        orderBy: { createdAt: "desc" }
    });
    return { experiences };
}

export default function ExperiencesIndex({ loaderData }: Route.ComponentProps) {
    const { experiences } = loaderData;

    return (
        <Container maxW="7xl" py={12}>
            <VStack align="flex-start" gap={8}>
                <Box>
                    <Heading size="3xl" mb={2}>Experiences</Heading>
                    <Text color="gray.500" fontSize="lg">Unique activities led by one-of-a-kind hosts.</Text>
                </Box>

                {experiences.length === 0 ? (
                    <Box w="full" py={20} textAlign="center" bg="gray.50" borderRadius="xl">
                        <Heading size="lg" color="gray.400">No experiences found yet.</Heading>
                        <Text mt={2}>Be the first to host one!</Text>
                    </Box>
                ) : (
                    <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} gap={6} w="full">
                        {experiences.map((exp) => (
                            <Link key={exp.id} to={`/experiences/${exp.id}`}>
                                <VStack align="flex-start" gap={3} data-group>
                                    <Box
                                        position="relative"
                                        overflow="hidden"
                                        borderRadius="xl"
                                        aspectRatio={3 / 4}
                                        w="full"
                                        bg="gray.200"
                                    >
                                        <Image
                                            src={exp.photos[0]?.url || "https://placehold.co/400x600?text=Experience"}
                                            w="full" h="full" objectFit="cover"
                                            transition="transform 0.2s"
                                            _groupHover={{ transform: "scale(1.05)" }}
                                        />
                                        {exp.category && (
                                            <Badge position="absolute" top={3} left={3} colorPalette="gray" variant="solid">
                                                {exp.category.name}
                                            </Badge>
                                        )}
                                    </Box>
                                    <VStack align="flex-start" gap={0} w="full">
                                        <HStack color="gray.500" fontSize="sm">
                                            <FaStar color="black" />
                                            <Text color="black" fontWeight="medium">New</Text>
                                            <Text>•</Text>
                                            <Text>{exp.country}</Text>
                                        </HStack>
                                        <Text fontWeight="semibold" fontSize="lg" lineClamp={1}>{exp.title}</Text>
                                        <Text fontSize="sm" pt={1}>
                                            <Text as="span" fontWeight="bold">${exp.price}</Text> / person
                                        </Text>
                                    </VStack>
                                </VStack>
                            </Link>
                        ))}
                    </SimpleGrid>
                )}
            </VStack>
        </Container>
    );
}
