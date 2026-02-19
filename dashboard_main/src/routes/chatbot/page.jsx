import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Footer } from "@/layouts/footer";
import { useChatbot } from "@/contexts/chatbot-context";
import { useAuth } from "@/contexts/auth-context";

const welcomeMessages = [
  "Hi! Welcome to RapidRoutines AI. How can I help you today?",
  "Yo! RapidRoutines AI. How can I help?",
  "Hey! RapidRoutines AI here. Need help creating a workout routine?",
  "Hi there! Got any fitness questions?",
  "Welcome to RapidRoutines AI! What can I do for you today?",
];

const getWelcomeMessage = () => welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];

const ChatbotPage = () => {
  const [searchParams] = useSearchParams();
  const { addChatSession, getChatHistory } = useChatbot();
  const { isAuthenticated } = useAuth();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasConversationChanges, setHasConversationChanges] = useState(false);

  const messagesEndRef = useRef(null);
  const messagesRef = useRef([]);

  const conversationId = searchParams.get("conversationId");

  useEffect(() => {
    messagesRef.current = messages;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isInitialized) return;

    if (conversationId && isAuthenticated) {
      const existingConversation = getChatHistory().find((chat) => chat.id.toString() === conversationId);

      if (existingConversation?.messages?.length) {
        setMessages(existingConversation.messages);
        setIsInitialized(true);
        return;
      }
    }

    setMessages([{ role: "assistant", content: getWelcomeMessage(), timestamp: new Date().toISOString() }]);
    setIsInitialized(true);
  }, [conversationId, getChatHistory, isAuthenticated, isInitialized]);

  useEffect(() => {
    return () => {
      const currentMessages = messagesRef.current;
      if (!isAuthenticated || !hasConversationChanges || currentMessages.length === 0) return;

      addChatSession({
        messages: currentMessages,
      });
    };
  }, [addChatSession, hasConversationChanges, isAuthenticated]);

  const startNewChat = () => {
    setMessages([{ role: "assistant", content: getWelcomeMessage(), timestamp: new Date().toISOString() }]);
    setInput("");
    setHasConversationChanges(false);
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    const trimmedMessage = input.trim();

    if (!trimmedMessage || isLoading) return;

    const userMessage = {
      role: "user",
      content: trimmedMessage,
      timestamp: new Date().toISOString(),
    };

    const nextMessages = [...messagesRef.current, userMessage];
    setMessages(nextMessages);
    setInput("");
    setIsLoading(true);
    setHasConversationChanges(true);

    try {
      const response = await fetch("/api/chatbot/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: trimmedMessage,
          context: nextMessages,
        }),
      });

      const data = await response.json();
      const apiResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't generate a response.";

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: apiResponse,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again later.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col gap-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Chatbot</h1>
        <button
          type="button"
          className="rounded-lg bg-[#1e628c] px-4 py-2 text-sm font-medium text-white hover:bg-[#195476]"
          onClick={startNewChat}
        >
          New chat
        </button>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-slate-300 bg-white">
        <div className="h-[560px] overflow-y-auto p-4">
          <div className="flex flex-col gap-3">
            {messages.map((message, index) => (
              <div key={`${message.timestamp}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
                    message.role === "user" ? "bg-[#1e628c] text-white" : "bg-slate-100 text-slate-900"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">Thinking...</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <form className="border-t border-slate-300 p-3" onSubmit={sendMessage}>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#1e628c]"
              placeholder="Type your message here..."
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="rounded-lg bg-[#1e628c] px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              Send
            </button>
          </div>
        </form>
      </div>

      <div className="text-center text-sm text-slate-600">
        {isAuthenticated ? <p>Your chats are automatically saved to your account.</p> : <p>Sign in to save your chat history.</p>}
      </div>

      <Footer />
    </div>
  );
};

export default ChatbotPage;
