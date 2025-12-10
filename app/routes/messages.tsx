import type { Route } from "./+types/messages";
import { Link, Outlet, useLocation } from "react-router";
import { Box, Container, Heading, VStack, HStack, Text, Avatar, Separator } from "@chakra-ui/react";
import { prisma } from "~/db.server";
import { requireUser } from "~/services/auth.server";
import { formatDistanceToNow } from "date-fns";

export function meta() {
    return [{ title: "Messages" }];
}

export async function loader({ request }: Route.LoaderArgs) {
    const user = await requireUser(request);
    const conversations = await prisma.conversation.findMany({
        where: {
            users: { some: { id: user.id } },
        },
        include: {
            users: true,
            messages: {
                take: 1,
                orderBy: { createdAt: "desc" },
            },
        },
        orderBy: { updatedAt: "desc" },
    });
    return { conversations, user };
}

export default function MessagesLayout({ loaderData }: Route.ComponentProps) {
    const { conversations, user } = loaderData;
    const location = useLocation();
    const isIndex = location.pathname === "/messages";

    return (
        <Container maxW="6xl" py={10} h="calc(100vh - 80px)">
            <HStack h="full" align="stretch" gap={0} borderWidth="1px" borderRadius="xl" overflow="hidden" shadow="sm">
                {/* Conversation List - Hidden on mobile if viewing specific chat */}
                <Box
                    w={{ base: isIndex ? "full" : "0", md: "350px", lg: "400px" }}
                    display={{ base: isIndex ? "block" : "none", md: "block" }}
                    borderRightWidth="1px"
                    overflowY="auto"
                    bg="white"
                >
                    <Box p={4} borderBottomWidth="1px">
                        <Heading size="lg">Messages</Heading>
                    </Box>
                    <VStack gap={0} align="stretch">
                        {conversations.length === 0 ? (
                            <Box p={8} textAlign="center">
                                <Text color="gray.500">No messages yet.</Text>
                            </Box>
                        ) : (
                            conversations.map((conv) => {
                                const otherUser = conv.users.find(u => u.id !== user.id) || conv.users[0];
                                const lastMessage = conv.messages[0];
                                return (
                                    <Link key={conv.id} to={`/messages/${conv.id}`}>
                                        <Box
                                            p={4}
                                            _hover={{ bg: "gray.50" }}
                                            transition="background 0.2s"
                                            borderBottomWidth="1px"
                                            borderColor="gray.100"
                                        >
                                            <HStack gap={3} align="flex-start">
                                                <Avatar.Root size="md">
                                                    <Avatar.Image src={otherUser.avatar || undefined} />
                                                    <Avatar.Fallback name={otherUser.name || otherUser.username} />
                                                </Avatar.Root>
                                                <VStack align="flex-start" gap={0} flex={1}>
                                                    <HStack justify="space-between" w="full">
                                                        <Text fontWeight="bold" fontSize="sm">{otherUser.name || otherUser.username}</Text>
                                                        {lastMessage && (
                                                            <Text fontSize="xs" color="gray.500">
                                                                {formatDistanceToNow(new Date(lastMessage.createdAt), { addSuffix: true })}
                                                            </Text>
                                                        )}
                                                    </HStack>
                                                    <Text fontSize="sm" color="gray.600" lineClamp={1}>
                                                        {lastMessage ? lastMessage.payload : "Start a conversation"}
                                                    </Text>
                                                </VStack>
                                            </HStack>
                                        </Box>
                                    </Link>
                                );
                            })
                        )}
                    </VStack>
                </Box>

                {/* Chat Area */}
                <Box flex={1} bg="gray.50" position="relative">
                    {isIndex ? (
                        <Box h="full" display="flex" alignItems="center" justifyContent="center">
                            <VStack>
                                <Heading color="gray.400">Select a conversation</Heading>
                                <Text color="gray.400">Choose a thread from the list to view messages.</Text>
                            </VStack>
                        </Box>
                    ) : (
                        <Outlet />
                    )}
                </Box>
            </HStack>
        </Container>
    );
}
