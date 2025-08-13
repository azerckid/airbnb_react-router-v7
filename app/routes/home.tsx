import type { Route } from "./+types/home";
import { prisma } from "~/db.server";
import { Box, Grid, Heading, Image, Text, VStack, HStack, Badge } from "@chakra-ui/react";
import { Link, useLoaderData, data, useNavigation, Await } from "react-router";
import { FaStar } from "react-icons/fa";
import { RoomCardSkeleton } from "~/components/common/RoomCardSkeleton";
import { Suspense } from "react";

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
      reviews: true,
    },
    orderBy: {
      createdAt: "desc",
    }
  });
  return { rooms };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { rooms } = loaderData;
  const navigation = useNavigation();
  const isLoading = navigation.state === "loading";

  // Skeletons Grid Component for reuse
  const Skeletons = () => (
    <Grid templateColumns={{ base: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)", lg: "repeat(4, 1fr)" }} gap={6}>
      {Array.from({ length: 8 }).map((_, i) => <RoomCardSkeleton key={i} />)}
    </Grid>
  );

  return (
    <Box py={8} px={4} maxW="7xl" mx="auto">
      {isLoading ? <Skeletons /> : (
        <>
          <Grid templateColumns={{ base: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)", lg: "repeat(4, 1fr)" }} gap={6}>
            {rooms.map((room) => (
              <Link key={room.id} to={`/rooms/${room.id}`}>
                <VStack gap={3} align="flex-start" cursor="pointer" className="group" position="relative">
                  <Box borderRadius="xl" overflow="hidden" aspectRatio="20/19" position="relative" w="full" bg="gray.100">
                    <Image
                      src={room.photo || "https://placehold.co/600x400"}
                      alt={room.title}
                      objectFit="cover"
                      w="full"
                      h="full"
                      transition="transform 0.3s ease-out"
                      _groupHover={{ transform: "scale(1.05)" }}
                    />
                    <Box position="absolute" top={3} right={3} color="white" _hover={{ transform: "scale(1.1)" }} transition="transform 0.2s">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true" role="presentation" focusable="false" style={{ display: 'block', fill: 'rgba(0, 0, 0, 0.5)', height: '24px', width: '24px', stroke: 'white', strokeWidth: 2, overflow: 'visible' }}>
                        <path d="M16 28c-7-4.73-14-10-14-17a6.98 6.98 0 0 1 7-7c1.8 0 3.58.68 4.95 2.05L16 8.1l2.05-2.05a6.98 6.98 0 0 1 9.9 0 6.98 6.98 0 0 1 0 9.9c-2.3 2.3-6.1 6.1-11.95 12.05z"></path>
                      </svg>
                    </Box>
                    {room.price > 150 && (
                      <Box position="absolute" top={3} left={3} bg="white" px={2} py={1} borderRadius="md" boxShadow="sm">
                        <Text fontSize="xs" fontWeight="bold">Guest favorite</Text>
                      </Box>
                    )}
                  </Box>
                  <VStack gap={0} align="flex-start" w="full">
                    <HStack justify="space-between" w="full" align="flex-start">
                      <Text fontWeight="bold" truncate maxW="70%" fontSize="md">
                        {room.city}, {room.country}
                      </Text>
                      <HStack gap={1} fontSize="sm" alignItems="center">
                        <FaStar size={12} />
                        <Text>
                          {room.reviews.length > 0
                            ? (room.reviews.reduce((acc: number, r) => acc + r.rating, 0) / room.reviews.length).toFixed(1)
                            : "New"}
                        </Text>
                      </HStack>
                    </HStack>
                    <Text color="fg.muted" fontSize="sm">
                      {room.category?.name || "Uncategorized"} view
                    </Text>
                    <Text color="fg.muted" fontSize="sm">
                      Oct 12 - 17
                    </Text>
                    <HStack gap={1} mt={1} alignItems="baseline">
                      <Text fontWeight="bold" fontSize="md">${room.price}</Text>
                      <Text color="fg.muted" fontSize="sm">night</Text>
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
        </>
      )}
    </Box>
  );
}
