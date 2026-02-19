import { useEffect } from "react";

const ChatbotPage = () => {
  useEffect(() => {
    window.location.replace("/chatbot/");
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
    </div>
  );
};

export default ChatbotPage;
