
import { useState, useRef, useEffect } from "react";
import { Box, Container, VStack, HStack, Input, IconButton, Text, Spinner, Flex } from "@chakra-ui/react";
import { FaPaperPlane, FaRobot, FaUser } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import type { MetaArgs } from "react-router";

export function meta({ }: MetaArgs) {
    return [
        { title: "AI Concierge - Airbnb Clone" },
        { name: "description", content: "Chat with your AI Concierge" },
    ];
}

interface Message {
    role: "user" | "ai";
    text: string;
    logs?: string[]; // Add logs to message type
}

export default function Concierge() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Load from sessionStorage on mount
    useEffect(() => {
        const saved = sessionStorage.getItem("ai_chat_history");
        if (saved) {
            try {
                setMessages(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse chat history", e);
            }
        } else {
            // Initial greeting if no history
            setMessages([{ role: "ai", text: "Hello! I am your Airbnb Concierge. How can I help you find a place today?" }]);
        }
    }, []);

    // Save to sessionStorage whenever messages change
    useEffect(() => {
        if (messages.length > 0) {
            sessionStorage.setItem("ai_chat_history", JSON.stringify(messages));
        }
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput("");
        setMessages((prev) => [...prev, { role: "user", text: userMessage }]);
        setIsLoading(true);

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                body: new URLSearchParams({ message: userMessage }),
            });

            if (!response.body) throw new Error("No response body");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let aiResponseText = "";

            setMessages((prev) => [...prev, { role: "ai", text: "" }]);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });

                // Parse logs from chunk
                const lines = chunk.split("\n");
                let newText = "";
                let newLogs: string[] = [];

                for (const line of lines) {
                    if (line.startsWith("__LOG__ ")) {
                        newLogs.push(line.replace("__LOG__ ", ""));
                    } else {
                        newText += line;
                    }
                }

                aiResponseText += newText;

                setMessages((prev) => {
                    const newMsgs = [...prev];
                    const lastMsg = newMsgs[newMsgs.length - 1];
                    if (lastMsg.role === "ai") {
                        lastMsg.text = aiResponseText;
                        if (newLogs.length > 0) {
                            lastMsg.logs = [...(lastMsg.logs || []), ...newLogs];
                        }
                    }
                    return newMsgs;
                });
            }
        } catch (error) {
            console.error("Chat error:", error);
            setMessages((prev) => [...prev, { role: "ai", text: "Sorry, I encountered an error. Please try again." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Box minH="calc(100vh - 64px)" bg="white" display="flex" flexDirection="column">
            <Container maxW="3xl" flex="1" py={8} display="flex" flexDirection="column">
                {/* Messages Information */}
                <VStack gap={6} align="stretch" flex="1" overflowY="auto" pb={24} ref={scrollRef} css={{ "&::-webkit-scrollbar": { display: "none" } }}>
                    {messages.length === 0 && (
                        <Flex direction="column" align="center" justify="center" h="full" color="gray.400">
                            <FaRobot size={48} />
                            <Text mt={4} fontSize="lg">Start a conversation with your AI Concierge</Text>
                        </Flex>
                    )}

                    {messages.map((msg, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <HStack align="start" justify={msg.role === "user" ? "flex-end" : "flex-start"} gap={4}>
                                {msg.role === "ai" && (
                                    <Box p={2} bg="blue.500" rounded="full" color="white" flexShrink={0}>
                                        <FaRobot size={16} />
                                    </Box>
                                )}

                                <Box
                                    maxW="80%"
                                    p={4}
                                    rounded="2xl"
                                    bg={msg.role === "user" ? "gray.100" : "transparent"}
                                    color={msg.role === "user" ? "gray.800" : "gray.700"}
                                    lineHeight="1.6"
                                >
                                    {msg.logs && msg.logs.length > 0 && (
                                        <VStack align="start" gap={1} mb={3} p={3} bg="gray.50" rounded="md" borderLeftWidth="2px" borderLeftColor="blue.400">
                                            {msg.logs.map((log, i) => (
                                                <Text key={i} fontSize="xs" color="gray.500" fontFamily="mono">
                                                    {log}
                                                </Text>
                                            ))}
                                        </VStack>
                                    )}
                                    {msg.role === "ai" ? (
                                        <Text whiteSpace="pre-wrap">{msg.text}</Text>
                                    ) : (
                                        <Text>{msg.text}</Text>
                                    )}
                                </Box>

                                {msg.role === "user" && (
                                    <Box p={2} bg="gray.200" rounded="full" color="gray.600" flexShrink={0}>
                                        <FaUser size={16} />
                                    </Box>
                                )}
                            </HStack>
                        </motion.div>
                    ))}

                    {isLoading && messages[messages.length - 1]?.role === "user" && (
                        <HStack align="start" gap={4}>
                            <Box p={2} bg="blue.500" rounded="full" color="white" flexShrink={0}>
                                <FaRobot size={16} />
                            </Box>
                            <Box p={4} >
                                <Spinner size="sm" color="gray.400" />
                            </Box>
                        </HStack>
                    )}
                </VStack>

                {/* Input Area */}
                <Box position="fixed" bottom={0} left={0} right={0} bg="white" py={6}>
                    <Container maxW="3xl">
                        <Box
                            as="form"
                            onSubmit={handleSubmit}
                            bg="gray.50"
                            rounded="full"
                            px={6}
                            py={3}
                            display="flex"
                            alignItems="center"
                            gap={2}
                            borderWidth="1px"
                            borderColor="transparent"
                            _focusWithin={{ borderColor: "gray.200", bg: "white", boxShadow: "lg" }}
                            transition="all 0.2s"
                        >
                            <Input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask anything about our listings..."
                                variant="flushed"
                                py={2}
                                fontSize="md"
                                autoFocus
                            />
                            <IconButton
                                aria-label="Send message"
                                type="submit"
                                variant="ghost"
                                rounded="full"
                                colorPalette="blue"
                                disabled={!input.trim() || isLoading}
                                opacity={!input.trim() ? 0.5 : 1}
                            >
                                {isLoading ? <Spinner size="xs" /> : <FaPaperPlane />}
                            </IconButton>
                        </Box>
                        <Text textAlign="center" fontSize="xs" color="gray.400" mt={3}>
                            AI can make mistakes. Please check important details.
                        </Text>
                    </Container>
                </Box>
            </Container>
        </Box>
    );
}
