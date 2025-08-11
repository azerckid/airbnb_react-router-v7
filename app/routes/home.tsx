import type { Route } from "./+types/home";
import { prisma } from "~/db.server";
import { Box, Grid, Heading, Image, Text, VStack, HStack, Badge } from "@chakra-ui/react";
import { Link, useLoaderData, data } from "react-router";
import { FaStar } from "react-icons/fa";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Guest House Booking" },
    { name: "description", content: "Welcome to Guest House Booking!" },
  ];
}

export async function loader() {
  const rooms = await prisma.room.findMany({
    include: {
      category: true,
      reviews: true, // For rating calculation
    },
    orderBy: {
      createdAt: "desc",
    }
  });
  return data({ rooms });
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { rooms } = loaderData;

  return (
    <Box py={8} px={4} maxW="7xl" mx="auto">
      <Grid templateColumns={{ base: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)", lg: "repeat(4, 1fr)" }} gap={6}>
        {rooms.map((room) => (
          <Link key={room.id} to={`/rooms/${room.id}`}>
            <VStack gap={3} align="flex-start" cursor="pointer" className="group">
              <Box borderRadius="xl" overflow="hidden" aspectRatio="10/9.5" position="relative" w="full">
                <Image
                  src={room.photo || "https://placehold.co/600x400"}
                  alt={room.title}
                  objectFit="cover"
                  w="full"
                  h="full"
                  transition="transform 0.2s"
                  _groupHover={{ transform: "scale(1.05)" }}
                />
              </Box>
              <VStack gap={0} align="flex-start" w="full">
                <HStack justify="space-between" w="full">
                  <Text fontWeight="bold" truncate maxW="70%">
                    {room.city}, {room.country}
                  </Text>
                  <HStack gap={1} fontSize="sm">
                    <FaStar />
                    <Text>
                      {room.reviews.length > 0
                        ? (room.reviews.reduce((acc: number, r) => acc + r.rating, 0) / room.reviews.length).toFixed(1) // Simple average
                        : "New"}
                    </Text>
                  </HStack>
                </HStack>
                <Text color="fg.muted" fontSize="sm">
                  {room.category?.name || "Uncategorized"}
                </Text>
                <HStack gap={1} mt={1}>
                  <Text fontWeight="bold">${room.price}</Text>
                  <Text color="fg.muted">night</Text>
                </HStack>
              </VStack>
            </VStack>
          </Link>
        ))}
      </Grid>
      {rooms.length === 0 && (
        <VStack py={20}>
          <Heading size="lg">No rooms found</Heading>
          <Text>Check back later for new listings!</Text>
        </VStack>
      )}
    </Box>
  );
}
