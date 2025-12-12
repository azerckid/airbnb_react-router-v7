import { useState, useRef, useEffect } from "react";
import {
    Box,
    Container,
    VStack,
    HStack,
    Input,
    IconButton,
    Text,
    Spinner,
    Flex,
    Button,
    Separator,
    useBreakpointValue,
    Drawer
} from "@chakra-ui/react";
import { FaPaperPlane, FaRobot, FaUser, FaPlus, FaHistory, FaBars, FaTrash } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import type { MetaArgs } from "react-router";
import { useLoaderData, Link } from "react-router";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { type LoaderFunctionArgs } from "react-router";
import { getUser } from "~/services/auth.server";

export function meta({ }: MetaArgs) {
    return [
        { title: "AI Concierge - Airbnb Clone" },
        { name: "description", content: "Chat with your AI Concierge" },
    ];
}

interface Message {
    role: "user" | "ai" | "assistant";
    text: string;
    logs?: string[];
}

interface ConversationItem {
    id: string;
    title: string | null;
    updatedAt: string;
}

export async function loader({ request }: LoaderFunctionArgs) {
    const user = await getUser(request);
    return { user };
}

export default function Concierge() {
    const { user } = useLoaderData<typeof loader>();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [history, setHistory] = useState<ConversationItem[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    const isMobile = useBreakpointValue({ base: true, md: false });

    // Fetch History on Mount
    useEffect(() => {
        if (user) {
            fetchHistory();
        }
    }, [user]);

    const fetchHistory = async () => {
        try {
            const res = await fetch("/api/chat_history");
            if (res.ok) {
                const data = await res.json();
                if (data.conversations) {
                    setHistory(data.conversations);
                }
            }
        } catch (e) {
            console.error("Failed to fetch history", e);
        }
    };

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
    };

    const handleNewChat = () => {
        setConversationId(null);
        setMessages([]);
        if (user) fetchHistory();
        if (isMobile) setSidebarOpen(false);
    };

    const handleSelectChat = async (id: string) => {
        setConversationId(id);
        setIsLoading(true);
        if (isMobile) setSidebarOpen(false);
        try {
            const res = await fetch(`/api/chat_history?id=${id}`);
            if (res.ok) {
                const data = await res.json();
                if (data.conversation && data.conversation.messages) {
                    setMessages(data.conversation.messages.map((m: any) => ({
                        role: m.role,
                        text: m.content
                    })));
                    setTimeout(scrollToBottom, 100);
                }
            }
        } catch (e) {
            console.error("Failed to load chat", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteChat = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this conversation?")) return;

        try {
            const formData = new URLSearchParams();
            formData.append("conversationId", id);

            const res = await fetch("/api/chat_history", {
                method: "DELETE",
                body: formData,
            });

            if (res.ok) {
                setHistory((prev) => prev.filter((c) => c.id !== id));
                if (conversationId === id) {
                    handleNewChat();
                }
            } else {
                alert("Failed to delete conversation.");
            }
        } catch (error) {
            console.error("Delete error:", error);
            alert("An error occurred while deleting.");
        }
    };

    const sendMessage = async (text: string, isHidden: boolean = false) => {
        if (!text.trim() || isLoading) return;

        if (!isHidden) {
            setMessages((prev) => [...prev, { role: "user", text }]);
        }
        setIsLoading(true);
        setTimeout(scrollToBottom, 100);

        try {
            const formData = new URLSearchParams();
            formData.append("message", text);
            if (conversationId) {
                formData.append("conversationId", conversationId);
            }

            const response = await fetch("/api/chat", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) throw new Error("Failed to get response");

            const existingHeader = response.headers.get("X-Conversation-Id");
            if (existingHeader && existingHeader !== conversationId) {
                setConversationId(existingHeader);
                if (user) fetchHistory();
            }

            if (!response.body) throw new Error("No response body");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let aiResponseText = "";

            setMessages((prev) => [...prev, { role: "assistant", text: "" }]);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split("\n");
                let newText = "";
                let newLogs: string[] = [];

                for (const line of lines) {
                    if (line.startsWith("__LOG__ ")) {
                        newLogs.push(line.replace("__LOG__ ", ""));
                    } else {
                        // Restore the newline that was removed by .split("\n")
                        // Note: This adds a newline even to the last line, but for Markdown that is usually fine/ignored.
                        newText += line + "\n";
                    }
                }

                aiResponseText += newText;

                setMessages((prev) => {
                    const newMsgs = [...prev];
                    const lastMsg = newMsgs[newMsgs.length - 1];
                    if (lastMsg.role === "assistant" || lastMsg.role === "ai") {
                        lastMsg.text = aiResponseText;
                        if (newLogs.length > 0) {
                            lastMsg.logs = [...(lastMsg.logs || []), ...newLogs];
                        }
                    }
                    return newMsgs;
                });
                if (scrollRef.current) {
                    scrollRef.current.scrollIntoView({ behavior: "smooth" });
                }
            }
        } catch (error) {
            console.error("Chat error:", error);
            setMessages((prev) => [...prev, { role: "assistant", text: "Sorry, I encountered an error. Please try again." }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage(input.trim());
        setInput("");
    };

    // Auto-Welcome Trigger
    const hasTriggeredRef = useRef(false);
    useEffect(() => {
        if (messages.length === 0 && !conversationId && !isLoading && !hasTriggeredRef.current) {
            hasTriggeredRef.current = true;
            const now = new Date();
            const timeString = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

            const prompt = `
Please generate a welcome message with the following specific introduction in Korean:
"안녕하세요, 현재 시각 ${timeString}입니다. 고객님께서 별도로 질문하지 않으셔도, 바로 떠나실 수 있는 추천 여행지를 제가 먼저 준비해 보았습니다."

Then, immediately perform these two checks and present the results:
1. EMERGENCY: Check for flights departing from ICN to popular nearby destinations (NRT, KIX, FUK, DAD, BKK, TPE) departing TODAY (within next 4 hours).
2. BUDGET: Plan a 7-day trip with a TOTAL budget of 1,000,000 KRW (Flight + Accom).

Format the output nicely.
            `.trim();
            // Send hidden message
            sendMessage(prompt, true);
        }
    }, [messages.length, conversationId, isLoading]);

    const SidebarContent = () => (
        <VStack h="full" w="full" p={4} gap={4} align="stretch">
            <Button
                onClick={handleNewChat}
                colorScheme="blue"
                variant="solid"
                size="md"
                bg="whiteAlpha.500"
                _hover={{ bg: "whiteAlpha.600" }}
                color="gray.800"
                shadow="md"
            >
                <FaPlus style={{ marginRight: "8px" }} /> New Chat
            </Button>

            {!user && (
                <Box p={3} bg="orange.100" color="orange.800" borderRadius="md" fontSize="sm">
                    <Text fontWeight="bold">Guest Mode</Text>
                    <Text>Chat history is not saved.</Text>
                    <Link to="/login" style={{ textDecoration: 'underline' }}>Log in here</Link>
                </Box>
            )}

            <VStack flex={1} overflowY="auto" align="stretch" gap={2} css={{ "&::-webkit-scrollbar": { display: "none" } }}>
                <Text color="gray.600" fontSize="xs" fontWeight="bold" px={2} mt={4}>HISTORY</Text>
                {history.map((conv) => (
                    <Box
                        key={conv.id}
                        position="relative"
                        css={{
                            "&:hover .delete-btn": { opacity: 1 }
                        }}
                    >
                        <Button
                            variant="ghost"
                            justifyContent="flex-start"
                            color="gray.700"
                            _hover={{ bg: "blackAlpha.50" }}
                            bg={conversationId === conv.id ? "blackAlpha.100" : "transparent"}
                            onClick={() => handleSelectChat(conv.id)}
                            h="auto"
                            w="full"
                            py={3}
                            textAlign="left"
                            pr={10}
                        >
                            <VStack align="start" gap={0} w="full">
                                <Text truncate w="full" fontSize="sm">{conv.title || "New Conversation"}</Text>
                                <Text fontSize="2xs" color="gray.500">
                                    {new Date(conv.updatedAt).toLocaleDateString()}
                                </Text>
                            </VStack>
                        </Button>
                        <IconButton
                            aria-label="Delete chat"
                            size="xs"
                            variant="ghost"
                            colorScheme="red"
                            className="delete-btn"
                            position="absolute"
                            right={2}
                            top="50%"
                            transform="translateY(-50%)"
                            opacity={0}
                            transition="opacity 0.2s"
                            onClick={(e) => handleDeleteChat(conv.id, e)}
                        >
                            <FaTrash />
                        </IconButton>
                    </Box>
                ))}
            </VStack>

            <Box pt={4} borderTopWidth="1px" borderColor="gray.200">
                <Text color="gray.500" fontSize="xs" textAlign="center">
                    AI Concierge v2.0
                </Text>
            </Box>
        </VStack>
    );

    return (
        <Flex h="calc(100vh - 80px)" overflow="hidden" position="relative">
            {/* Desktop Sidebar */}
            <Box
                w="300px"
                display={{ base: "none", md: "block" }}
                bg="whiteAlpha.400"
                backdropFilter="blur(20px)"
                borderRight="1px solid"
                borderColor="whiteAlpha.500"
            >
                <SidebarContent />
            </Box>

            {/* Mobile Sidebar Drawer */}
            <Drawer.Root open={isSidebarOpen} onOpenChange={(e) => setSidebarOpen(e.open)} placement="start">
                <Drawer.Backdrop />
                <Drawer.Positioner>
                    <Drawer.Content bg="white" color="gray.800">
                        <Drawer.Body p={0}>
                            <SidebarContent />
                        </Drawer.Body>
                        <Drawer.CloseTrigger />
                    </Drawer.Content>
                </Drawer.Positioner>
            </Drawer.Root>

            {/* Main Chat Area */}
            <Flex flex={1} direction="column" position="relative">
                {/* Mobile Header */}
                <Flex
                    display={{ base: "flex", md: "none" }}
                    p={4}
                    align="center"
                    bg="whiteAlpha.400"
                    backdropFilter="blur(10px)"
                    borderBottom="1px solid"
                    borderColor="whiteAlpha.500"
                >
                    <IconButton
                        aria-label="Open menu"
                        variant="ghost"
                        color="gray.700"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <FaBars />
                    </IconButton>
                    <Text ml={4} fontWeight="bold" color="gray.800">AI Concierge</Text>
                </Flex>

                <VStack
                    flex={1}
                    overflowY="auto"
                    p={{ base: 4, md: 8 }}
                    gap={6}
                    ref={scrollRef}
                    css={{ "&::-webkit-scrollbar": { width: "4px" }, "&::-webkit-scrollbar-thumb": { background: "rgba(0,0,0,0.1)" } }}
                >
                    {messages.length === 0 && !conversationId && (
                        <Flex direction="column" align="center" justify="center" h="full" color="gray.500" gap={6}>
                            <Box
                                p={8}
                                bg="whiteAlpha.600"
                                rounded="full"
                                backdropFilter="blur(10px)"
                                border="1px solid"
                                borderColor="whiteAlpha.500"
                                shadow="lg"
                            >
                                <FaRobot size={64} color="#4A5568" />
                            </Box>
                            <VStack>
                                <Text fontSize="2xl" fontWeight="bold" color="gray.700">Hello, {user?.name || "Traveler"}!</Text>
                                <Text color="gray.600">I can help you find rooms, plan trips, or answer questions.</Text>
                            </VStack>
                        </Flex>
                    )}

                    {messages.map((msg, idx) => (
                        <Flex
                            key={idx}
                            w="full"
                            justify={msg.role === "user" ? "flex-end" : "flex-start"}
                        >
                            <HStack
                                align="start"
                                maxW="80%"
                                gap={3}
                                flexDirection={msg.role === "user" ? "row-reverse" : "row"}
                            >
                                <Box
                                    p={2}
                                    rounded="full"
                                    bg={msg.role === "user" ? "gray.200" : "blue.500"}
                                    color={msg.role === "user" ? "gray.600" : "white"}
                                    shadow="md"
                                >
                                    {msg.role === "user" ? <FaUser size={14} /> : <FaRobot size={14} />}
                                </Box>
                                <Box
                                    p={4}
                                    rounded="2xl"
                                    borderTopLeftRadius={msg.role === "assistant" ? "none" : "2xl"}
                                    borderTopRightRadius={msg.role === "user" ? "none" : "2xl"}
                                    bg={msg.role === "user" ? "white" : "whiteAlpha.800"}
                                    backdropFilter="blur(10px)"
                                    border="1px solid"
                                    borderColor="whiteAlpha.500"
                                    color="gray.800"
                                    shadow="sm"
                                    overflow="hidden"
                                >
                                    {msg.text ? (
                                        <Box
                                            className="markdown-body"
                                            fontSize="md"
                                            lineHeight="1.6"
                                            css={{
                                                "& p": { marginBottom: "0.5rem" },
                                                "& ul": { paddingLeft: "1.2rem", marginBottom: "0.5rem" },
                                                "& ol": { paddingLeft: "1.2rem", marginBottom: "0.5rem" },
                                                "& li": { marginBottom: "0.2rem" },
                                                "& strong": { fontWeight: "bold" },
                                                "& em": { fontStyle: "italic" },
                                            }}
                                        >
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {msg.text}
                                            </ReactMarkdown>
                                        </Box>
                                    ) : (
                                        <Spinner size="sm" color="gray.500" />
                                    )}
                                    {msg.logs && msg.logs.length > 0 && (
                                        <Box mt={3}>
                                            <Box
                                                as="details"
                                                bg="gray.50"
                                                rounded="md"
                                                overflow="hidden"
                                                border="1px solid"
                                                borderColor="gray.100"
                                            >
                                                <Box
                                                    as="summary"
                                                    p={2}
                                                    cursor="pointer"
                                                    fontSize="xs"
                                                    color="gray.500"
                                                    fontWeight="medium"
                                                    _hover={{ bg: "gray.100" }}
                                                    style={{ listStyle: "none" }}
                                                >
                                                    <Flex align="center" gap={2}>
                                                        <Text>🔍 Debug Logs ({msg.logs.length})</Text>
                                                    </Flex>
                                                </Box>
                                                <VStack align="start" gap={1} p={3} pt={2} bg="gray.900" color="green.300" maxH="200px" overflowY="auto">
                                                    {msg.logs.map((log, i) => (
                                                        <Text key={i} fontSize="xs" fontFamily="mono" wordBreak="break-word">
                                                            {log}
                                                        </Text>
                                                    ))}
                                                </VStack>
                                            </Box>
                                        </Box>
                                    )}
                                </Box>
                            </HStack>
                        </Flex>
                    ))}
                    <div ref={scrollRef} />
                </VStack>

                {/* Input Area */}
                <Box p={4} bg="transparent">
                    <Container maxW="4xl">
                        <Box
                            as="form"
                            onSubmit={handleSubmit}
                            bg="whiteAlpha.600"
                            backdropFilter="blur(20px)"
                            border="1px solid"
                            borderColor={!user ? "orange.300" : "whiteAlpha.500"}
                            rounded="2xl"
                            p={2}
                            shadow="xl"
                            display="flex"
                            gap={2}
                            alignItems="center"
                            transition="all 0.2s"
                            _focusWithin={{ bg: "whiteAlpha.800", borderColor: "whiteAlpha.600" }}
                        >
                            <Input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder={user ? "Message AI Concierge..." : "Message AI Concierge (Guest Mode - History not saved)"}
                                variant="flushed"
                                px={4}
                                py={3}
                                color="gray.800"
                                _placeholder={{ color: "gray.500" }}
                                autoFocus
                            />
                            <IconButton
                                aria-label="Send"
                                type="submit"
                                variant="solid"
                                colorScheme="blue"
                                rounded="xl"
                                disabled={!input.trim() || isLoading}
                                opacity={!input.trim() ? 0.5 : 1}
                            >
                                {isLoading ? <Spinner size="sm" /> : <FaPaperPlane />}
                            </IconButton>
                        </Box>
                        {!user && (
                            <Text textAlign="center" fontSize="xs" color="orange.600" mt={1} fontWeight="bold">
                                You are chatting as a guest. History will not be saved.
                            </Text>
                        )}
                        <Text textAlign="center" fontSize="xs" color="gray.500" mt={2}>
                            AI can make mistakes. Always verify important information.
                        </Text>
                    </Container>
                </Box>
            </Flex>
        </Flex>
    );
}
