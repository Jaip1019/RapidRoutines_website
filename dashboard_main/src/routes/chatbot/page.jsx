import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Footer } from "@/layouts/footer";
import { useChatbot } from "@/contexts/chatbot-context";
import { useAuth } from "@/contexts/auth-context";
import { createIframeMessageHandler, loadChatHistory } from "@/utils/iframe-message-utils";

const ChatbotPage = () => {
    const [searchParams] = useSearchParams();
    const [isLoading, setIsLoading] = useState(true);
    const [chatEnded, setChatEnded] = useState(false);
    const [iframeLoaded, setIframeLoaded] = useState(false);
    const iframeRef = useRef(null);
    const { addChatSession, getChatHistory } = useChatbot();
    const { isAuthenticated } = useAuth();

    const conversationId = searchParams.get("conversationId");

    const currentConversation = useRef([]);

    const handleChatEnd = () => {
        if (chatEnded || !isAuthenticated) return;

        if (currentConversation.current.length > 0) {
            addChatSession({
                messages: currentConversation.current,
            });

            setChatEnded(true);
        }
    };

    useEffect(() => {
        const loadPreviousConversation = async () => {
            if (!conversationId || !iframeLoaded || !iframeRef.current || !isAuthenticated) return;

            const chatHistory = getChatHistory();
            const conversation = chatHistory.find((chat) => chat.id.toString() === conversationId);

            if (conversation && conversation.messages && conversation.messages.length > 0) {
                currentConversation.current = [...conversation.messages];
                await loadChatHistory(iframeRef.current, conversation.messages);
            }
        };

        loadPreviousConversation();
    }, [conversationId, getChatHistory, iframeLoaded, isAuthenticated]);

    useEffect(() => {
        return () => {
            handleChatEnd();
        };
    }, [isAuthenticated]);

    useEffect(() => {
        const allowedOrigins = [window.location.origin];

        const messageHandlers = {
            chatMessage: (data) => {
                const { role, content } = data;

                if (content) {
                    currentConversation.current.push({
                        role,
                        content,
                        timestamp: new Date().toISOString(),
                    });
                }
            },
            chatEnded: () => {
                handleChatEnd();
            },
        };

        const handleMessage = createIframeMessageHandler(allowedOrigins, messageHandlers);

        window.addEventListener("message", handleMessage);

        return () => {
            window.removeEventListener("message", handleMessage);
        };
    }, [addChatSession, isAuthenticated]);

    return (
        <div className="flex flex-col gap-y-6">
            <div className="relative w-full h-[700px] overflow-hidden">
                {isLoading && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100/85">
                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
                    </div>
                )}

                <iframe
                    ref={iframeRef}
                    src="/chatbot/"
                    className="h-full w-full border-0"
                    onLoad={() => {
                        setIsLoading(false);
                        setIframeLoaded(true);
                        setChatEnded(false);

                        if (!conversationId) {
                            currentConversation.current = [];
                        }
                    }}
                    title="Chatbot Interface"
                />
            </div>

            <div className="text-center text-sm text-slate-600">
                {isAuthenticated ? <p>Your chats are automatically saved to your account.</p> : <p>Sign in to save your chat history.</p>}
            </div>

            <Footer />
        </div>
    );
};

export default ChatbotPage;
