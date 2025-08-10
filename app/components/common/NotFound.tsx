import { Button, Code, Container, Heading, Stack, Text } from "@chakra-ui/react";
import { Link as RouterLink } from "react-router";

interface NotFoundProps {
  title?: string;
  description?: string;
  stack?: string;
  homeLabel?: string;
}

export function NotFound({
  title = "Page not found",
  description = "It seems that you're lost.",
  stack,
  homeLabel = "Go home →",
}: NotFoundProps) {
  return (
    <Container maxW="lg" py={16}>
      <Stack gap={4}>
        <Heading size="lg">{title}</Heading>
        <Text color="fg.muted">{description}</Text>
        <Button asChild colorPalette="red" variant="outline" alignSelf="start">
          <RouterLink to="/">{homeLabel}</RouterLink>
        </Button>
        {stack && (
          <Code display="block" p={4} overflowX="auto">
            {stack}
          </Code>
        )}
      </Stack>
    </Container>
  );
}


