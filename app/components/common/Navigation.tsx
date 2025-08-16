import { Avatar, Box, Button, Container, HStack, IconButton, Menu, Separator, Stack, Text, VStack } from "@chakra-ui/react";
import { Link as RouterLink, useNavigate, Form } from "react-router";
import { FaMoon, FaSun } from "react-icons/fa";
import { SearchModal } from "./SearchModal";
// import type { IUser } from "~/types"; // Disable strict frontend type for now or update it

interface NavigationProps {
    user: any; // Allow Prisma user object
    isLoggedIn: boolean;
    appearance?: "light" | "dark";
    onToggleAppearance?: () => void;
}

export function Navigation({
    user,
    isLoggedIn,
    appearance = "light",
    onToggleAppearance,
}: NavigationProps) {
    const navigate = useNavigate();
    return (
        <Box as="header" borderBottomWidth="1px" bg="bg">
            <Container maxW="7xl" py={4}>
                <HStack
                    justify="space-between"
                    align="center"
                    w="full"
                >
                    <HStack gap={1}>
                        <Button asChild variant="ghost" colorPalette="red">
                            <RouterLink to="/">
                                <HStack gap={2}>
                                    <Text fontWeight="bold" display={{ base: "none", md: "block" }}>Guest House Booking</Text>
                                </HStack>
                            </RouterLink>
                        </Button>
                        <Button asChild variant="ghost">
                            <RouterLink to="/experiences">Experiences</RouterLink>
                        </Button>
                    </HStack>

                    {/* Search Bar */}
                    <SearchModal />

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
                                <Button asChild variant="ghost">
                                    <RouterLink to="/login">Log in</RouterLink>
                                </Button>
                                <Button asChild colorPalette="red">
                                    <RouterLink to="/signup">Sign up</RouterLink>
                                </Button>
                            </>
                        ) : (
                            <Menu.Root positioning={{ placement: "bottom-end" }}>
                                <Menu.Trigger asChild>
                                    <Button variant="ghost" p={0}>
                                        <Avatar.Root size="md">
                                            <Avatar.Image
                                                src={user?.avatar || ""}
                                                alt={user?.name || "User"}
                                            />
                                            <Avatar.Fallback name={user?.name || "User"} />
                                        </Avatar.Root>
                                    </Button>
                                </Menu.Trigger>
                                <Menu.Positioner>
                                    <Menu.Content>
                                        {/* User Info */}
                                        <Box px={3} py={2} userSelect="none">
                                            <HStack gap={3}>
                                                <Avatar.Root size="sm">
                                                    <Avatar.Image
                                                        src={user?.avatar || ""}
                                                        alt={user?.name || "User"}
                                                    />
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
                                        {user?.isHost && (
                                            <>
                                                <Menu.Item
                                                    value="upload"
                                                    onClick={() => navigate("/rooms/new")}
                                                    cursor="pointer"
                                                >
                                                    방 업로드
                                                </Menu.Item>
                                                <Menu.Item
                                                    value="host-rooms"
                                                    onClick={() => navigate("/host/rooms")}
                                                    cursor="pointer"
                                                >
                                                    방 관리 (Manage Listings)
                                                </Menu.Item>
                                                <Menu.Item
                                                    value="host-bookings"
                                                    onClick={() => navigate("/host/bookings")}
                                                    cursor="pointer"
                                                >
                                                    예약 관리 (Manage Bookings)
                                                </Menu.Item>
                                                <Menu.Item
                                                    value="host-experience"
                                                    onClick={() => navigate("/host/experiences/new")}
                                                    cursor="pointer"
                                                >
                                                    체험 호스팅 (Host Experience)
                                                </Menu.Item>
                                            </>
                                        )}
                                        <Menu.Item
                                            value="profile"
                                            onClick={() => navigate("/users/me")}
                                            cursor="pointer"
                                        >
                                            프로필 수정 (Edit Profile)
                                        </Menu.Item>
                                        <Menu.Item
                                            value="messages"
                                            onClick={() => navigate("/messages")}
                                            cursor="pointer"
                                        >
                                            메시지 (Messages)
                                        </Menu.Item>
                                        <Menu.Item
                                            value="wishlists"
                                            onClick={() => navigate("/wishlists")}
                                            cursor="pointer"
                                        >
                                            위시리스트 (Wishlists)
                                        </Menu.Item>
                                        <Separator />
                                        <Menu.Item
                                            value="logout"
                                            asChild
                                            cursor="pointer"
                                        >
                                            <Form action="/logout" method="post" style={{ width: "100%" }}>
                                                <button type="submit" style={{ width: "100%", textAlign: "left" }}>Log out</button>
                                            </Form>
                                        </Menu.Item>
                                    </Menu.Content>
                                </Menu.Positioner>
                            </Menu.Root>
                        )}
                    </HStack>
                </HStack>
            </Container>
        </Box>
    );
}


