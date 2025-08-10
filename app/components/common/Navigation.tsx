import { Avatar, Box, Button, Container, HStack, IconButton, Menu, Separator, Stack, Text, VStack } from "@chakra-ui/react";
import { Link as RouterLink, useNavigate } from "react-router";
import { FaMoon, FaSun } from "react-icons/fa";
import type { IUser } from "~/types";

interface NavigationProps {
    user: IUser | null;
    isLoggedIn: boolean;
    onLoginClick?: () => void;
    onSignUpClick?: () => void;
    onLogoutSuccess?: () => void;
    appearance?: "light" | "dark";
    onToggleAppearance?: () => void;
}

export function Navigation({ user, isLoggedIn, onLoginClick, onSignUpClick, onLogoutSuccess, appearance = "light", onToggleAppearance }: NavigationProps) {
    const navigate = useNavigate();
    return (
        <Box as="header" borderBottomWidth="1px" bg="bg">
            <Container maxW="7xl" py={4} >
                <Stack
                    justifyContent="space-between"
                    alignItems="center"
                    direction={{ sm: "column", md: "row" }}
                    gap={{ sm: 4, md: 0 }}
                >
                    <Button asChild variant="ghost" colorPalette="red">
                        <RouterLink to="/">
                            <HStack gap={2}>
                                <Text fontWeight="bold">Guest House Booking</Text>
                            </HStack>
                        </RouterLink>
                    </Button>
                    <HStack gap={2}>
                        {onToggleAppearance && (
                            <IconButton
                                aria-label="Toggle color mode"
                                variant="ghost"
                                onClick={onToggleAppearance}
                            >
                                {appearance === "dark" ? <FaSun /> : <FaMoon />}
                            </IconButton>
                        )}
                        {!isLoggedIn ? (
                            <>
                                <Button variant="ghost" onClick={onLoginClick}>Log in</Button>
                                <Button colorPalette="red" onClick={onSignUpClick}>Sign up</Button>
                            </>
                        ) : (
                            <Menu.Root positioning={{ placement: "bottom-end" }}>
                                <Menu.Trigger asChild>
                                    <Button variant="ghost" p={0}>
                                        <Avatar.Root size="md">
                                            <Avatar.Image src={user?.avatar || ""} alt={user?.name || "User"} />
                                            <Avatar.Fallback name={user?.name || "User"} />
                                        </Avatar.Root>
                                    </Button>
                                </Menu.Trigger>
                                <Menu.Positioner>
                                    <Menu.Content>
                                        {/* 유저 정보 표시 */}
                                        <Box px={3} py={2} userSelect="none">
                                            <HStack gap={3}>
                                                <Avatar.Root size="sm">
                                                    <Avatar.Image src={user?.avatar || ""} alt={user?.name || "User"} />
                                                    <Avatar.Fallback name={user?.name || "User"} />
                                                </Avatar.Root>
                                                <VStack gap={0.5} align="start" flex={1} minW={0}>
                                                    <Text fontWeight="semibold" fontSize="sm" truncate>
                                                        {user?.name || "User"}
                                                    </Text>
                                                    <Text fontSize="xs" color="fg.muted" truncate>
                                                        {user?.email || ""}
                                                    </Text>
                                                </VStack>
                                            </HStack>
                                        </Box>
                                        <Separator />
                                        {user?.is_host && (
                                            <Menu.Item value="upload" onClick={() => navigate("/rooms/upload")} cursor="pointer">
                                                방 업로드
                                            </Menu.Item>
                                        )}
                                        <Separator />
                                        <Menu.Item value="logout" onClick={onLogoutSuccess} cursor="pointer">
                                            Log out
                                        </Menu.Item>
                                    </Menu.Content>
                                </Menu.Positioner>
                            </Menu.Root>
                        )}
                    </HStack>
                </Stack>
            </Container>
        </Box>
    );
}


