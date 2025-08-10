import { Box, HStack, Skeleton, VStack } from "@chakra-ui/react";

export default function RoomSkeleton() {
  return (
    <Box>
      <VStack alignItems="flex-start" gap={2}>
        <Skeleton height="280px" rounded="2xl" />
        <Box w="100%">
          <HStack justifyContent="space-between" mb={2}>
            <Skeleton height="20px" width="60%" />
            <Skeleton height="20px" width="30px" />
          </HStack>
          <Skeleton height="16px" width="40%" mb={1} />
          <Skeleton height="16px" width="30%" />
        </Box>
      </VStack>
    </Box>
  );
}

