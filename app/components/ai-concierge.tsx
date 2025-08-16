import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaTimes, FaPaperPlane, FaComments, FaAirbnb, FaRobot } from "react-icons/fa";

interface Message {
    role: "user" | "ai";
    text: string;
}

export function AiConcierge() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: "ai", text: "Hello! I am your Airbnb Concierge. How can I help you find a place today?" }
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            // Force a slight scroll adjustment to ensure rendering correctness
            setTimeout(() => {
                if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }, 50);
        }
    }, [messages, isOpen]);

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
                aiResponseText += chunk;

                setMessages((prev) => {
                    const newMsgs = [...prev];
                    const lastMsg = newMsgs[newMsgs.length - 1];
                    if (lastMsg.role === "ai") {
                        lastMsg.text = aiResponseText;
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
        <>
            <AnimatePresence>
                {!isOpen && (
                    <motion.button
                        initial={{ scale: 0, rotate: 0 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: 90 }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="fixed bottom-10 right-10 z-50 bg-gradient-to-br from-rose-500 to-pink-600 text-white p-5 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgb(255,56,92,0.4)] transition-all flex items-center justify-center group"
                        onClick={() => setIsOpen(true)}
                        aria-label="Open Concierge"
                    >
                        <FaComments size={32} className="group-hover:animate-pulse" />
                    </motion.button>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 100, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 100, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 350, damping: 25 }}
                        className="fixed bottom-6 right-6 z-50 w-[450px] h-[750px] max-h-[85vh] bg-white rounded-[32px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] border border-gray-100 overflow-hidden flex flex-col font-sans"
                    >
                        {/* 
              PREMIUM HEADER
              - Brand Gradient (Rose)
              - White text
              - Generous padding
            */}
                        <div className="bg-gradient-to-r from-rose-500 to-pink-600 px-8 py-6 flex items-center justify-between shrink-0 shadow-sm text-white">
                            <div className="flex items-center gap-4">
                                <div className="bg-white/20 p-2.5 rounded-full backdrop-blur-sm">
                                    <FaAirbnb size={24} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-xl leading-none mb-1">Concierge</h3>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.5)]"></span>
                                        <span className="text-xs text-rose-100 font-medium tracking-wide">Beta</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="w-9 h-9 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors backdrop-blur-md"
                                aria-label="Close"
                            >
                                <FaTimes size={16} />
                            </button>
                        </div>

                        {/* 
              MESSAGES AREA
            */}
                        <div className="flex-1 overflow-y-auto bg-gray-50 px-8 py-6 flex flex-col gap-6 scroll-smooth" ref={scrollRef}>
                            <div className="flex justify-center">
                                <span className="bg-gray-200/60 px-3 py-1 rounded-full text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Today</span>
                            </div>

                            {messages.map((msg, idx) => (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 }}
                                    key={idx}
                                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                                >
                                    <div
                                        className={`max-w-[85%] p-5 rounded-[22px] text-[15px] leading-relaxed shadow-sm relative ${msg.role === "user"
                                                ? "bg-rose-500 text-white rounded-tr-sm"
                                                : "bg-white text-gray-800 border border-gray-100 rounded-tl-sm"
                                            }`}
                                    >
                                        <div className="whitespace-pre-wrap">{msg.text}</div>
                                    </div>
                                </motion.div>
                            ))}

                            {isLoading && messages[messages.length - 1]?.role === "user" && (
                                <div className="flex justify-start">
                                    <div className="bg-white border border-gray-100 p-5 rounded-[22px] rounded-tl-sm flex items-center gap-2 shadow-sm">
                                        <span className="w-2 h-2 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                                        <span className="w-2 h-2 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                                        <span className="w-2 h-2 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 
              INPUT AREA
              - Grounded (White bg)
              - Top border
              - Clean input field
            */}
                        <div className="bg-white border-t border-gray-100 px-8 py-6 shrink-0 z-10">
                            <form
                                onSubmit={handleSubmit}
                                className="flex items-center gap-3 bg-gray-100 rounded-[24px] pl-5 pr-2 py-2 focus-within:ring-2 focus-within:ring-rose-500/20 focus-within:bg-white transition-all border border-transparent focus-within:border-rose-200"
                            >
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Ask anything..."
                                    className="flex-1 bg-transparent py-2 text-[15px] text-gray-800 placeholder-gray-400 focus:outline-none"
                                    disabled={isLoading}
                                />
                                <button
                                    type="submit"
                                    disabled={isLoading || !input.trim()}
                                    className="w-10 h-10 flex items-center justify-center bg-rose-500 text-white rounded-full hover:bg-rose-600 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all shadow-md shrink-0"
                                    aria-label="Send"
                                >
                                    <FaPaperPlane size={14} className="ml-[-1px]" />
                                </button>
                            </form>
                            <div className="flex justify-center mt-3 gap-1.5 opacity-60">
                                <FaRobot size={10} className="text-gray-400 mt-[1px]" />
                                <p className="text-[10px] text-gray-400 font-medium">Powered by Gemini AI</p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
