import { useState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { useExercises } from "@/contexts/exercise-context";
import { Footer } from "@/layouts/footer";

const RepBotPage = () => {
    const [isLoading, setIsLoading] = useState(true);
    const { addExercise } = useExercises();
    const iframeRef = useRef(null);

    const processedExercises = useRef(new Map());

    useEffect(() => {
        const handleMessage = (event) => {
            if (event.origin !== window.location.origin) {
                return;
            }

            if (event.data && event.data.type === "exerciseCompleted") {
                const { exerciseType, repCount, timestamp } = event.data;
                const exerciseTimestamp = timestamp || new Date().toISOString();

                const exerciseKey = `${exerciseType}-${repCount}-${exerciseTimestamp}`;

                if (!processedExercises.current.has(exerciseKey)) {
                    addExercise({
                        exerciseType: exerciseType,
                        count: repCount,
                        timestamp: exerciseTimestamp,
                    });

                    processedExercises.current.set(exerciseKey, true);

                    if (processedExercises.current.size > 50) {
                        const entries = Array.from(processedExercises.current.entries());
                        entries.slice(0, entries.length - 50).forEach(([key]) => {
                            processedExercises.current.delete(key);
                        });
                    }
                }
            }
        };

        window.addEventListener("message", handleMessage);

        return () => {
            window.removeEventListener("message", handleMessage);
        };
    }, [addExercise]);

    useEffect(() => {
        const checkLocalStorageForExercises = () => {
            try {
                const repbotExerciseKey = "repbot_lastExercise";
                const storedExercise = localStorage.getItem(repbotExerciseKey);

                if (storedExercise) {
                    const exerciseData = JSON.parse(storedExercise);
                    const exerciseTimestamp = exerciseData.timestamp || new Date().toISOString();
                    const exerciseKey = `${exerciseData.type}-${exerciseData.count}-${exerciseTimestamp}`;

                    if (!processedExercises.current.has(exerciseKey) && !exerciseData.processed) {
                        addExercise({
                            exerciseType: exerciseData.type,
                            count: exerciseData.count,
                            timestamp: exerciseTimestamp,
                        });

                        localStorage.setItem(
                            repbotExerciseKey,
                            JSON.stringify({
                                ...exerciseData,
                                processed: true,
                            }),
                        );

                        processedExercises.current.set(exerciseKey, true);
                    }
                }
            } catch (error) {
                console.error("Error checking localStorage for exercises:", error);
            }
        };

        checkLocalStorageForExercises();

        const interval = setInterval(checkLocalStorageForExercises, 2000);

        return () => clearInterval(interval);
    }, [addExercise]);

    return (
        <div className="flex flex-col gap-y-6">
            <div className="relative w-full h-[700px] overflow-hidden">
                {isLoading && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100/85">
                        <Loader2 className="h-10 w-10 animate-spin text-[#1e628c]" />
                    </div>
                )}

                <iframe
                    ref={iframeRef}
                    src="/repbot/"
                    className="h-full w-full border-0"
                    title="RepBot AI Exercise Counter"
                    onLoad={() => {
                        setIsLoading(false);
                        processedExercises.current.clear();
                    }}
                    allow="camera; microphone; accelerometer; gyroscope; fullscreen"
                    allowFullScreen
                />
            </div>

            <div className="text-center text-sm text-slate-600">
                <p>Your reps are automatically saved if you are signed in. Do not leave the RepBot page instantly or else reps will not save completely.</p>
            </div>

            <Footer />
        </div>
    );
};

export default RepBotPage;
