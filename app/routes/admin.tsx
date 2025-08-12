import { Outlet, Link, useLocation } from "react-router";
import { Box, Flex, VStack, Text, Button, HStack, Separator } from "@chakra-ui/react";
import { FaHome, FaUsers, FaBed, FaCalendarAlt, FaChartLine, FaSignOutAlt } from "react-icons/fa";
import { requireUser } from "~/services/auth.server";
import type { Route } from "./+types/admin";
import { redirect } from "react-router";

export async function loader({ request }: Route.LoaderArgs) {
    const user = await requireUser(request);
    // Simple admin check directly in layout
    if (!user.isAdmin) {
        throw redirect("/");
    }
    return { user };
}

export default function AdminLayout({ loaderData }: Route.ComponentProps) {
    const { user } = loaderData;
    const location = useLocation();

    const menuItems = [
        { name: "Dashboard", icon: FaChartLine, path: "/admin" },
        { name: "Users", icon: FaUsers, path: "/admin/users" },
        { name: "Rooms", icon: FaBed, path: "/admin/rooms" },
        { name: "Bookings", icon: FaCalendarAlt, path: "/admin/bookings" },
    ];

    return (
        <Flex minH="100vh" bg="#f4f4f4">
            {/* Sidebar - Django/Modern Style */}
            <Box w="250px" bg="#1a202c" color="white" display={{ base: "none", md: "block" }}>
                <VStack align="stretch" p={5} gap={8}>
                    <Text fontSize="xl" fontWeight="bold" letterSpacing="wider">
                        ADMIN PANEL
                    </Text>

                    <VStack align="stretch" gap={1}>
                        <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" color="gray.500" mb={2}>
                            Management
                        </Text>
                        {menuItems.map((item) => {
                            const isActive = location.pathname === item.path || (item.path !== "/admin" && location.pathname.startsWith(item.path));
                            return (
                                <Link key={item.path} to={item.path}>
                                    <HStack
                                        p={3}
                                        gap={3}
                                        borderRadius="md"
                                        bg={isActive ? "red.500" : "transparent"}
                                        _hover={{ bg: isActive ? "red.600" : "gray.700" }}
                                        transition="all 0.2s"
                                    >
                                        <item.icon />
                                        <Text fontWeight={isActive ? "bold" : "normal"}>{item.name}</Text>
                                    </HStack>
                                </Link>
                            );
                        })}
                    </VStack>

                    <Separator borderColor="gray.700" />

                    <VStack align="stretch" gap={1}>
                        <Link to="/">
                            <HStack p={3} gap={3} borderRadius="md" _hover={{ bg: "gray.700" }}>
                                <FaHome />
                                <Text>View Site</Text>
                            </HStack>
                        </Link>
                        <form action="/logout" method="post">
                            <Button
                                type="submit"
                                variant="ghost"
                                color="white"
                                w="full"
                                justifyContent="flex-start"
                                px={3}
                                _hover={{ bg: "gray.700" }}
                            >
                                <HStack gap={3}>
                                    <FaSignOutAlt />
                                    <Text>Logout</Text>
                                </HStack>
                            </Button>
                        </form>
                    </VStack>
                </VStack>
            </Box>

            {/* Main Content */}
            <Box flex={1} overflow="auto">
                {/* Top Header */}
                <Flex h="64px" bg="white" px={6} align="center" justify="space-between" boxShadow="sm">
                    <Text fontWeight="bold" textTransform="capitalize" color="gray.600">
                        {location.pathname.replace("/admin", "") || "Dashboard"}
                    </Text>
                    <HStack>
                        <Text fontSize="sm">Welcome, {user.name || user.username}</Text>
                    </HStack>
                </Flex>

                {/* Content Area */}
                <Box p={6}>
                    <Outlet />
                </Box>
            </Box>
        </Flex>
    );
}
