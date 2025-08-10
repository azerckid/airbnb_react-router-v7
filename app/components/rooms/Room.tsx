import { Link, useNavigate } from "react-router";

import type { IRoom } from "~/types";

import { FaCamera, FaRegHeart, FaStar } from "react-icons/fa";
import {
  Box,
  Button,
  Grid,
  HStack,
  Image,
  Text,
  VStack,
} from "@chakra-ui/react";

export default function Room(room: IRoom) {
  const { id, name, rating, city, country, price, photos, is_owner } = room;
  const imageUrl = photos[0]?.file || "";
  const roomId = id || room.pk || 0;
  const navigate = useNavigate();

  const handleCameraClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/rooms/${roomId}/photos`);
  };

  return (
    <Link to={`/rooms/${roomId}`}>
      <VStack alignItems={"flex-start"} gap={2}>
        <Box position="relative" overflow={"hidden"} mb={3} rounded="2xl">
          <Image
            minH="280"
            objectFit="cover"
            src={imageUrl}
            alt={name}
            loading="lazy"
          />
          <Button
            aria-label={is_owner ? "Upload photos" : "Add to wishlist"}
            variant={"ghost"}
            position="absolute"
            top={0}
            right={0}
            zIndex={10}
            color="white"
            bg="transparent"
            _hover={{ bg: "rgba(0, 0, 0, 0.1)" }}
            onClick={(e) => {
              if (is_owner) {
                e.preventDefault();
                e.stopPropagation();
                handleCameraClick(e);
              }
            }}
          >
            {is_owner ? <FaCamera size="20px" /> : <FaRegHeart size="20px" />}
          </Button>
        </Box>
        <Box>
          <Grid gap={2} templateColumns={"6fr 1fr"}>
            <Text display={"block"} as="b" lineClamp={1} fontSize="md" color={"gray.600"}>
              {name}
            </Text>
            <HStack gap={1} alignItems="center" color={"gray.600"} _hover={{ color: "red.500" }}>
              <FaStar size={15} />
              <Text fontSize={"sm"}>
                {rating}
              </Text>
            </HStack>
          </Grid>
          <Text fontSize={"sm"} color={"gray.600"}>
            {city}, {country}
          </Text>
          <Text fontSize={"sm"} color={"gray.600"}>
            <Text as="b">${price}</Text> / night
          </Text>
        </Box>
      </VStack>
    </Link>
  );
}


