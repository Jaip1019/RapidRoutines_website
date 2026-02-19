import { useEffect } from "react";

const RepBotPage = () => {
  useEffect(() => {
    window.location.replace("/repbot/");
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#1e628c] border-t-transparent" />
    </div>
  );
};

export default RepBotPage;
