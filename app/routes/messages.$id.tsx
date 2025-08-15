import type { Route } from "./+types/messages.$id";
import {
    Box,
    VStack,
    HStack,
    Text,
    Input,
    IconButton,
    Avatar,
    Spinner
} from "@chakra-ui/react";
import { Form, useNavigation, useSubmit } from "react-router";
import { prisma } from "~/db.server";
import { requireUser } from "~/services/auth.server";
import { FaPaperPlane } from "react-icons/fa";
import { useEffect, useRef } from "react";
import { format } from "date-fns";

export async function loader({ request, params }: Route.LoaderArgs) {
    const user = await requireUser(request);
    const conversation = await prisma.conversation.findUnique({
        where: { id: params.id },
        include: {
            users: true,
            messages: {
                orderBy: { createdAt: "asc" },
                include: { user: true }
            }
        }
    });

    if (!conversation) throw new Response("Not Found", { status: 404 });
    // Authorization check: User must be participant
    if (!conversation.users.some(u => u.id === user.id)) throw new Response("Unauthorized", { status: 403 });

    return { conversation, user };
}

export async function action({ request, params }: Route.ActionArgs) {
    const user = await requireUser(request);
    const formData = await request.formData();
    const payload = formData.get("payload") as string;

    if (!payload || payload.trim() === "") return { error: "Message empty" };

    await prisma.message.create({
        data: {
            payload,
            userId: user.id,
            conversationId: params.id!,
        },
    });

    await prisma.conversation.update({
        where: { id: params.id },
        data: { updatedAt: new Date() }
    });

    return { success: true };
}

export default function ChatWindow({ loaderData }: Route.ComponentProps) {
    const { conversation, user } = loaderData;
    const scrollRef = useRef<HTMLDivElement>(null);
    const formRef = useRef<HTMLFormElement>(null);
    const navigation = useNavigation();
    const isSending = navigation.state === "submitting" && navigation.formData?.get("payload");
    const otherUser = conversation.users.find(u => u.id !== user.id) || conversation.users[0];

    // Auto scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [conversation.messages, isSending]);

    // Cleanup form after send
    useEffect(() => {
        if (navigation.state === "idle" && formRef.current) {
            formRef.current.reset();
        }
    }, [navigation.state]);

    return (
        <VStack h="full" gap={0} align="stretch">
            {/* Header */}
            <HStack p={4} borderBottomWidth="1px" bg="white" shadow="sm">
                <Avatar.Root size="sm">
                    <Avatar.Image src={otherUser.avatar || undefined} />
                    <Avatar.Fallback name={otherUser.name || otherUser.username} />
                </Avatar.Root>
                <Text fontWeight="bold">{otherUser.name || otherUser.username}</Text>
            </HStack>

            {/* Messages Area */}
            <Box flex={1} overflowY="auto" p={4} ref={scrollRef} bg="white">
                <VStack align="stretch" gap={4}>
                    {conversation.messages.map((msg) => {
                        const isMe = msg.userId === user.id;
                        return (
                            <HStack key={msg.id} justify={isMe ? "flex-end" : "flex-start"} align="flex-end">
                                {!isMe && (
                                    <Avatar.Root size="xs" mb={1}>
                                        <Avatar.Image src={msg.user.avatar || undefined} />
                                        <Avatar.Fallback name={msg.user.name || msg.user.username} />
                                    </Avatar.Root>
                                )}
                                <VStack align={isMe ? "flex-end" : "flex-start"} gap={0} maxW="70%">
                                    <Box
                                        bg={isMe ? "red.500" : "gray.100"}
                                        color={isMe ? "white" : "black"}
                                        px={4} py={2}
                                        borderRadius="2xl"
                                        borderBottomRightRadius={isMe ? "xs" : "2xl"}
                                        borderBottomLeftRadius={isMe ? "2xl" : "xs"}
                                    >
                                        <Text fontSize="md">{msg.payload}</Text>
                                    </Box>
                                    <Text fontSize="xs" color="gray.400" mt={1}>
                                        {format(new Date(msg.createdAt), "HH:mm")}
                                    </Text>
                                </VStack>
                            </HStack>
                        );
                    })}
                    {isSending && (
                        <HStack justify="flex-end" align="flex-end">
                            <VStack align="flex-end" gap={0}>
                                <Box bg="red.500" color="white" px={4} py={2} borderRadius="2xl" opacity={0.7}>
                                    <Text fontSize="md">...</Text>
                                </Box>
                            </VStack>
                        </HStack>
                    )}
                </VStack>
            </Box>

            {/* Input Area */}
            <Box p={4} bg="white" borderTopWidth="1px">
                <Form method="post" ref={formRef}>
                    <HStack>
                        <Input
                            name="payload"
                            placeholder="Type a message..."
                            autoComplete="off"
                            borderRadius="full"
                        />
                        <IconButton
                            type="submit"
                            aria-label="Send"
                            colorPalette="red"
                            borderRadius="full"
                            disabled={!!isSending}
                        >
                            {isSending ? <Spinner size="sm" /> : <FaPaperPlane />}
                        </IconButton>
                    </HStack>
                </Form>
            </Box>
        </VStack>
    );
}
