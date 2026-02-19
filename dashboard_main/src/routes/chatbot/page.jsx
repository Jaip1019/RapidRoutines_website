import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Footer } from "@/layouts/footer";
import { useChatbot } from "@/contexts/chatbot-context";
import { useAuth } from "@/contexts/auth-context";
import { mountLegacyApp } from "@/utils/legacy-app-loader";

const ChatbotPage = () => {
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [chatEnded, setChatEnded] = useState(false);
  const [appReady, setAppReady] = useState(false);
  const mountRef = useRef(null);
  const { addChatSession, getChatHistory } = useChatbot();
  const { isAuthenticated } = useAuth();

  const conversationId = searchParams.get("conversationId");
  const currentConversation = useRef([]);
  const skipHistoryLoadRef = useRef(false);

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
    let cleanup = () => {};
    let isMounted = true;

    const setup = async () => {
      try {
        cleanup = await mountLegacyApp({
          appBasePath: "/chatbot",
          mountNode: mountRef.current,
        });

        if (!isMounted) return;

        setIsLoading(false);
        setAppReady(true);
        setChatEnded(false);
      } catch (error) {
        if (!isMounted) return;
        setIsLoading(false);
        setAppReady(false);
      }
    };

    setup();

    return () => {
      isMounted = false;
      cleanup();
    };
  }, []);

  useEffect(() => {
    const loadPreviousConversation = async () => {
      if (skipHistoryLoadRef.current) return;
      if (!conversationId || !appReady || !isAuthenticated) return;

      const chatHistory = getChatHistory();
      const conversation = chatHistory.find((chat) => chat.id.toString() === conversationId);

      if (conversation && conversation.messages && conversation.messages.length > 0) {
        currentConversation.current = [...conversation.messages];

        for (const message of conversation.messages) {
          if (!message?.role || !message?.content) continue;

          window.postMessage(
            {
              type: "loadMessage",
              role: message.role,
              content: message.content,
            },
            "*",
          );

          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
    };

    loadPreviousConversation();
  }, [conversationId, getChatHistory, appReady, isAuthenticated]);

  useEffect(() => {
    return () => {
      handleChatEnd();
    };
  }, [isAuthenticated]);

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      if (!event.data?.type) return;

      if (event.data.type === "chatMessage") {
        const { role, content } = event.data;
        if (!content) return;

        currentConversation.current.push({
          role,
          content,
          timestamp: new Date().toISOString(),
        });
      }

      if (event.data.type === "chatEnded") {
        handleChatEnd();
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [addChatSession, isAuthenticated]);

  const handleNewChat = () => {
    currentConversation.current = [];
    setChatEnded(false);
    skipHistoryLoadRef.current = true;
    if (window.chatApp?.startNewChat) {
      window.chatApp.startNewChat();
    }
    setTimeout(() => {
      skipHistoryLoadRef.current = false;
    }, 0);
  };

  return (
    <div className="flex flex-col gap-y-6">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleNewChat}
          className="rounded-lg bg-[#1e628c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#185274]"
        >
          New chat
        </button>
      </div>

      <div className="relative h-[700px] w-full rounded-xl overflow-hidden bg-white dark:bg-slate-950 shadow-md">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 dark:bg-slate-950/80">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent dark:border-blue-400"></div>
          </div>
        )}
        <div ref={mountRef} className="h-full w-full p-0" />
      </div>

      <div className="text-center text-sm text-slate-600">
        {isAuthenticated ? <p>Your chats are automatically saved to your account.</p> : <p>Sign in to save your chat history.</p>}
      </div>

      <Footer />
    </div>
  );
};

export default ChatbotPage;
