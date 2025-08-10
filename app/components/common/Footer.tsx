import { Box, Container, Text } from "@chakra-ui/react";

export function Footer() {
  return (
    <Box as="footer" borderTopWidth="1px" bg="bg" py={6}>
      <Container maxW="7xl">
        <Text color="fg.muted" fontSize="sm">
          © {new Date().getFullYear()} Guest House Booking System. All rights reserved.
        </Text>
      </Container>
    </Box>
  );
}


