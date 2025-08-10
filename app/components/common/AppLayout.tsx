import { Box } from "@chakra-ui/react";
import type React from "react";

interface AppLayoutProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  fullBleed?: boolean;
  contentMaxW?: string | number;
  contentPx?: any;
}

export function AppLayout({
  header,
  children,
  footer,
  fullBleed = false,
  contentMaxW = "1280px",
  contentPx = { base: 4, md: 6 },
}: AppLayoutProps) {
  return (
    <Box minH="100dvh" display="flex" flexDir="column">
      <Box
        as="header"
        position="sticky"
        top={0}
        zIndex="sticky"
        bg="bg"
      >
        {header}
      </Box>
      <Box as="main" flex="1">
        {fullBleed ? (
          children
        ) : (
          <Box maxW={contentMaxW} mx="auto" px={contentPx}>
            {children}
          </Box>
        )}
      </Box>
      <Box as="footer">
        {footer}
      </Box>
    </Box>
  );
}


