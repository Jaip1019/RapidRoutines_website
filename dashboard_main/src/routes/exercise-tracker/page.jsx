import { useState, useEffect } from "react";
import { Footer } from "@/layouts/footer";
import { useAuth } from "@/contexts/auth-context";
import axios from "axios";

const ExerciseTrackerPage = ({ limited = false }) => {
  const [isLoading, setIsLoading] = useState(true);
  const { isAuthenticated, user } = useAuth();
  const [trackerExercises, setTrackerExercises] = useState([]);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchExercisesFromServer();
    }
  }, [isAuthenticated]);

  const fetchExercisesFromServer = async () => {
    try {
      const response = await axios.get("/api/user-data/get-data");
      const userData = response.data;
      if (userData.trackerExercises) {
        setTrackerExercises(userData.trackerExercises);
      }
    } catch (error) {}
  };

  const saveExerciseToServer = async (exercise) => {
    try {
      const updatedExercises = [...trackerExercises, exercise];
      setTrackerExercises(updatedExercises);
      await axios.post("/api/user-data/save-data", {
        dataType: "trackerExercises",
        data: updatedExercises,
      });
      return true;
    } catch (error) {
      return false;
    }
  };

  const removeExerciseFromServer = async (exerciseId) => {
    try {
      const updatedExercises = trackerExercises.filter((ex) => ex.id !== exerciseId);
      setTrackerExercises(updatedExercises);
      await axios.post("/api/user-data/save-data", {
        dataType: "trackerExercises",
        data: updatedExercises,
      });
      return true;
    } catch (error) {
      return false;
    }
  };

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  useEffect(() => {
    const messageHandler = (event) => {
      if (event.origin !== window.location.origin) {
        return;
      }
      if (event.data && event.data.type) {
        switch (event.data.type) {
          case "checkAuth": {
            const iframe = document.querySelector("iframe");
            if (iframe && iframe.contentWindow) {
              iframe.contentWindow.postMessage(
                {
                  type: "authStatus",
                  isAuthenticated: isAuthenticated,
                  userId: user?.id || null,
                },
                "*"
              );
            }
            break;
          }
          case "getTrackerExercises": {
            const iframeForData = document.querySelector("iframe");
            if (iframeForData && iframeForData.contentWindow) {
              iframeForData.contentWindow.postMessage(
                {
                  type: "trackerExercisesData",
                  exercises: trackerExercises,
                },
                "*"
              );
            }
            break;
          }
          case "saveTrackerExercise":
            if (isAuthenticated && event.data.exercise) {
              saveExerciseToServer(event.data.exercise);
            }
            break;
          case "removeTrackerExercise":
            if (isAuthenticated && event.data.exerciseId) {
              removeExerciseFromServer(event.data.exerciseId);
            }
            break;
          case "exerciseNotAuthenticated":
            showNotification("warning", "Sign in to save exercises");
            break;
        }
      }
    };
    window.addEventListener("message", messageHandler);
    return () => {
      window.removeEventListener("message", messageHandler);
    };
  }, [isAuthenticated, user, trackerExercises]);

  return (
    <div className="flex flex-col min-h-screen">
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg p-3 pr-4 shadow-md transition-all ${
            notification.type === "success"
              ? "bg-green-100 text-green-800"
              : notification.type === "warning"
              ? "bg-amber-100 text-amber-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          <div className="flex items-center">{notification.message}</div>
        </div>
      )}

      <div className="flex-grow flex flex-col gap-y-4 p-0 md:p-2">
        <div className="relative rounded-lg shadow-sm overflow-hidden flex-grow h-[calc(100vh-120px)]">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
              <div className="h-12 w-12 rounded-full border-4 border-[#1e628c]/30 border-t-[#1e628c] animate-spin"></div>
            </div>
          )}

          <div className="w-full h-full">
            <iframe
              src="/exercise-tracker/"
              className="w-full h-full border-0"
              title="Exercise Tracker"
              onLoad={() => setIsLoading(false)}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ height: "100%", width: "100%" }}
            ></iframe>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ExerciseTrackerPage;
