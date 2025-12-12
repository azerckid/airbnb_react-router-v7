import type { Route } from "./+types/home";
import { prisma } from "~/db.server";
import { Box, Grid, Image, Text, VStack, HStack, IconButton, Heading } from "@chakra-ui/react";
import { Link, useNavigation, useFetcher } from "react-router";
import { FaStar, FaHeart, FaRegHeart } from "react-icons/fa";
import { RoomCardSkeleton } from "~/components/common/RoomCardSkeleton";
import { getOptionalUser } from "~/services/auth.server";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Guest House Booking" },
    { name: "description", content: "Welcome to Guest House Booking!" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const location = url.searchParams.get("location");
  const guests = url.searchParams.get("guests");
  const minPrice = url.searchParams.get("minPrice");
  const maxPrice = url.searchParams.get("maxPrice");

  const where: any = {
    isActive: true,
  };

  if (location) {
    where.OR = [
      { city: { contains: location } },
      { country: { contains: location } },
      { address: { contains: location } },
      { title: { contains: location } },
    ];
  }
  if (guests) {
    where.maxGuests = { gte: parseInt(guests) };
  }
  if (minPrice) {
    where.price = { ...where.price, gte: parseInt(minPrice) };
  }
  if (maxPrice) {
    where.price = { ...where.price, lte: parseInt(maxPrice) };
  }

  const rooms = await prisma.room.findMany({
    where,
    include: {
      owner: true,
      amenities: true,
      category: true,
      reviews: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const user = await getOptionalUser(request);
  let likedRoomIds: string[] = [];

  if (user) {
    const wishlist = await prisma.wishlist.findFirst({
      where: { userId: user.id, name: "Favorites" },
      include: { rooms: { select: { id: true } } }
    });
    likedRoomIds = wishlist?.rooms.map(r => r.id) || [];
  }

  return { rooms, likedRoomIds, isLoggedIn: !!user };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { rooms, likedRoomIds, isLoggedIn } = loaderData;
  const navigation = useNavigation();
  const isLoading = navigation.state === "loading";
  const fetcher = useFetcher();

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
            {rooms.map((room) => {
              // Optimistic UI for Wishlist
              const isLiked = likedRoomIds.includes(room.id);
              // Check if there is a pending action for this room
              const fetcherData = fetcher.formData;
              const pendingRoomId = fetcherData?.get("roomId");
              const optimisticLiked = pendingRoomId === room.id
                ? !isLiked // Flip state if this specific room is being toggled
                : isLiked;

              return <Link key={room.id} to={`/rooms/${room.id}`} style={{ display: 'contents' }}>
                <Box
                  position="relative"
                  className="group"
                  borderRadius="2xl"
                  overflow="hidden"
                  bg="whiteAlpha.400"
                  backdropFilter="blur(10px)"
                  border="1px solid"
                  borderColor="whiteAlpha.500"
                  boxShadow="lg"
                  transition="transform 0.2s"
                  _hover={{ transform: "translateY(-4px)", boxShadow: "xl" }}
                  p={4}
                >
                  {/* Image Section */}
                  <Box borderRadius="xl" overflow="hidden" aspectRatio="20/19" position="relative" w="full" bg="gray.100" mb={3}>
                    <Image
                      src={room.photo || "https://placehold.co/600x400"}
                      alt={room.title}
                      objectFit="cover"
                      w="full"
                      h="full"
                      transition="transform 0.3s ease-out"
                      _groupHover={{ transform: "scale(1.05)" }}
                    />

                    <Box position="absolute" top={3} right={3} zIndex={1}>
                      <fetcher.Form method="post" action="/api/wishlist" onClick={(e) => e.stopPropagation()}>
                        <input type="hidden" name="roomId" value={room.id} />
                        <input type="hidden" name="intent" value="toggle" />
                        <IconButton
                          aria-label="Add to wishlist"
                          variant="ghost"
                          size="sm"
                          color={optimisticLiked ? "red.500" : "white"}
                          bg={optimisticLiked ? "whiteAlpha.800" : "blackAlpha.300"}
                          _hover={{ transform: "scale(1.1)", bg: "whiteAlpha.900" }}
                          type="submit"
                          rounded="full"
                          onClick={(e) => {
                            if (!isLoggedIn) {
                              e.preventDefault();
                              alert("Please log in to save to wishlist!");
                            }
                            e.stopPropagation();
                          }}
                        >
                          {optimisticLiked ? <FaHeart size={16} /> : <FaRegHeart size={16} />}
                        </IconButton>
                      </fetcher.Form>
                    </Box>

                    {room.price > 150 && (
                      <Box position="absolute" top={3} left={3} bg="whiteAlpha.900" px={2} py={1} borderRadius="md" boxShadow="sm">
                        <Text fontSize="xs" fontWeight="bold">Guest favorite</Text>
                      </Box>
                    )}
                  </Box>

                  {/* Details Section */}
                  <VStack gap={1} align="flex-start" w="full">
                    <HStack justify="space-between" w="full" align="flex-start">
                      <Text fontWeight="bold" truncate maxW="70%" fontSize="md" color="gray.800">
                        {room.city}, {room.country}
                      </Text>
                      <HStack gap={1} fontSize="sm" alignItems="center" color="gray.800">
                        <FaStar size={12} />
                        <Text>
                          {room.reviews.length > 0
                            ? (room.reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / room.reviews.length).toFixed(1)
                            : "New"}
                        </Text>
                      </HStack>
                    </HStack>
                    <Text color="gray.600" fontSize="sm">
                      {room.category?.name || "Uncategorized"} view
                    </Text>
                    <Text color="gray.600" fontSize="sm">
                      Oct 12 - 17
                    </Text>
                    <HStack gap={1} mt={1} alignItems="baseline" color="gray.900">
                      <Text fontWeight="bold" fontSize="lg">${room.price}</Text>
                      <Text color="gray.600" fontSize="sm">night</Text>
                    </HStack>
                  </VStack>
                </Box>
              </Link>
            })}

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
