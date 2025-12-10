import type { Route } from "./+types/$experienceId";
import {
    Box,
    Container,
    Heading,
    VStack,
    HStack,
    Text,
    Image,
    Grid,
    Badge,
    Button,
    Separator,
    Avatar
} from "@chakra-ui/react";
import { Link, Form } from "react-router";
import { prisma } from "~/db.server";
import { FaClock, FaMapMarkerAlt, FaGlobe } from "react-icons/fa";

export function meta({ data }: Route.MetaArgs) {
    return [{ title: data?.experience.title || "Experience" }];
}

export async function loader({ params }: Route.LoaderArgs) {
    const experience = await prisma.experience.findUnique({
        where: { id: params.experienceId },
        include: {
            host: true,
            photos: true,
            category: true
        }
    });

    if (!experience) throw new Response("Not Found", { status: 404 });

    return { experience };
}

export default function ExperienceDetail({ loaderData }: Route.ComponentProps) {
    const { experience } = loaderData;

    return (
        <Container maxW="7xl" py={10}>
            <Grid templateColumns={{ base: "1fr", lg: "2fr 1fr" }} gap={12}>
                {/* Left Content */}
                <VStack align="stretch" gap={8}>
                    {/* Header */}
                    <Box>
                        <HStack mb={4}>
                            <Badge size="lg" colorPalette="red">Experience</Badge>
                            {experience.category && <Badge size="lg" variant="outline">{experience.category.name}</Badge>}
                        </HStack>
                        <Heading size="3xl" mb={2}>{experience.title}</Heading>
                        <HStack color="gray.600" fontSize="lg">
                            <HStack><FaMapMarkerAlt /><Text>{experience.city}, {experience.country}</Text></HStack>
                            <HStack><FaClock /><Text>{experience.startedAt || "Flexible time"} - {experience.endTime || "2 hours"}</Text></HStack>
                        </HStack>
                    </Box>

                    {/* Gallery */}
                    <Box borderRadius="2xl" overflow="hidden" aspectRatio={16 / 9} position="relative">
                        <Image
                            src={experience.photos[0]?.url || "https://placehold.co/1200x800?text=Experience+Photo"}
                            w="full" h="full" objectFit="cover"
                        />
                        {experience.photos.length > 1 && (
                            <HStack position="absolute" bottom={4} right={4} gap={2}>
                                {experience.photos.slice(1, 4).map((photo, i) => (
                                    <Box key={photo.id} w="80px" h="60px" borderRadius="lg" overflow="hidden" borderWidth="2px" borderColor="white">
                                        <Image src={photo.url} w="full" h="full" objectFit="cover" />
                                    </Box>
                                ))}
                            </HStack>
                        )}
                    </Box>

                    {/* Host Info */}
                    <HStack justify="space-between" borderBottomWidth="1px" pb={8} borderColor="gray.200">
                        <VStack align="flex-start" gap={1}>
                            <Heading size="md">Hosted by {experience.host.name || experience.host.username}</Heading>
                            <Text color="gray.500">Join a unique experience hosted by a local expert.</Text>
                        </VStack>
                        <Avatar.Root size="xl">
                            <Avatar.Image src={experience.host.avatar || undefined} />
                            <Avatar.Fallback name={experience.host.name || experience.host.username} />
                        </Avatar.Root>
                    </HStack>

                    {/* Description */}
                    <Box>
                        <Heading size="lg" mb={4}>What you'll do</Heading>
                        <Text fontSize="lg" lineHeight="tall" whiteSpace="pre-wrap" color="gray.700">
                            {experience.description}
                        </Text>
                    </Box>

                    {/* Location */}
                    <Box>
                        <Heading size="lg" mb={4}>Where you'll be</Heading>
                        <Text fontSize="lg" mb={4}>{experience.address || "Meeting point details will be provided upon booking."}</Text>
                        <Box w="full" h="300px" bg="gray.100" borderRadius="xl" display="flex" alignItems="center" justifyContent="center">
                            <Text color="gray.500">Map Integration Coming Soon</Text>
                        </Box>
                    </Box>
                </VStack>

                {/* Right Sticky Sidebar (Booking) */}
                <Box display={{ base: "none", lg: "block" }}>
                    <Box position="sticky" top="100px" borderWidth="1px" borderRadius="xl" p={6} shadow="lg" bg="white">
                        <VStack align="stretch" gap={6}>
                            <HStack align="baseline">
                                <Text fontSize="2xl" fontWeight="bold">${experience.price}</Text>
                                <Text color="gray.500">/ person</Text>
                            </HStack>

                            <Separator />

                            <Button size="xl" colorPalette="red" w="full">Book Experience</Button>

                            <Form action="/api/conversations/create" method="post" style={{ width: "100%" }}>
                                <input type="hidden" name="recipientId" value={experience.host.id} />
                                <Button type="submit" variant="outline" size="lg" w="full">Contact Host</Button>
                            </Form>

                            <Text fontSize="xs" color="gray.500" textAlign="center">
                                You won't be charged yet.
                            </Text>
                        </VStack>
                    </Box>
                </Box>
            </Grid>

            {/* Mobile Floating Action Button */}
            <Box
                display={{ base: "block", lg: "none" }}
                position="fixed" bottom={0} left={0} right={0}
                bg="white" p={4} borderTopWidth="1px" zIndex={100}
            >
                <HStack justify="space-between">
                    <VStack align="flex-start" gap={0}>
                        <Text fontWeight="bold">${experience.price}</Text>
                        <Text fontSize="sm" color="gray.500">per person</Text>
                    </VStack>
                    <Button size="lg" colorPalette="red">Book</Button>
                </HStack>
            </Box>
        </Container>
    );
}
