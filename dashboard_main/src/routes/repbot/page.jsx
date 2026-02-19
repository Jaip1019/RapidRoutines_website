import { useEffect, useRef, useState } from "react";
import { Footer } from "@/layouts/footer";
import { useExercises } from "@/contexts/exercise-context";

const exerciseTypes = [
  { value: "bicepCurl", label: "Bicep Curl" },
  { value: "squat", label: "Squat" },
  { value: "pushup", label: "Push-up" },
  { value: "shoulderPress", label: "Shoulder Press" },
  { value: "tricepExtension", label: "Floor Tricep Extension" },
  { value: "lunge", label: "Lunge" },
  { value: "russianTwist", label: "Russian Twist" },
];

const mapExerciseLabel = (value) => exerciseTypes.find((item) => item.value === value)?.label || value;

const ensureScript = (src) =>
  new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-repbot-src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === "true") {
        resolve();
      } else {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
      }
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.dataset.repbotSrc = src;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });

const RepBotPage = () => {
  const { addExercise } = useExercises();

  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [isCameraStarted, setIsCameraStarted] = useState(false);
  const [isEngineReady, setIsEngineReady] = useState(false);
  const [repCounter, setRepCounter] = useState(0);
  const [exerciseType, setExerciseType] = useState("bicepCurl");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const poseRef = useRef(null);
  const cameraRef = useRef(null);
  const streamRef = useRef(null);
  const sessionIdRef = useRef(`user_${Math.random().toString(36).slice(2, 9)}_${Date.now()}`);
  const previousRepCountRef = useRef(0);
  const exerciseTypeRef = useRef("bicepCurl");
  const addExerciseRef = useRef(addExercise);

  useEffect(() => {
    exerciseTypeRef.current = exerciseType;
  }, [exerciseType]);

  useEffect(() => {
    addExerciseRef.current = addExercise;
  }, [addExercise]);

  const resizeCanvas = () => {
    if (!containerRef.current || !canvasRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    canvasRef.current.width = width;
    canvasRef.current.height = height;
  };

  const sendLandmarksToBackend = async (landmarks) => {
    const response = await fetch("/api/repbot/process_landmarks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        landmarks,
        exerciseType: exerciseTypeRef.current,
        sessionId: sessionIdRef.current,
      }),
    });

    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status}`);
    }

    const result = await response.json();

    if (typeof result.repCounter === "number") {
      const previous = previousRepCountRef.current;
      const current = result.repCounter;

      if (current > previous) {
        const repDiff = current - previous;

        await addExerciseRef.current({
          exerciseType: mapExerciseLabel(exerciseTypeRef.current),
          count: repDiff,
          timestamp: new Date().toISOString(),
        });
      }

      previousRepCountRef.current = current;
      setRepCounter(current);
    }

    if (typeof result.feedback === "string") {
      setFeedback(result.feedback);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const setupEngine = async () => {
      try {
        setError("");

        await ensureScript("https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js");
        await ensureScript("https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js");
        await ensureScript("https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js");

        if (!isMounted) return;

        if (!window.Pose || !window.POSE_CONNECTIONS || !window.drawConnectors || !window.drawLandmarks || !window.Camera) {
          throw new Error("RepBot engine failed to initialize.");
        }

        const pose = new window.Pose({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
        });

        pose.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        pose.onResults(async (results) => {
          const canvas = canvasRef.current;
          const ctx = canvas?.getContext("2d");

          if (!canvas || !ctx) return;

          ctx.clearRect(0, 0, canvas.width, canvas.height);

          if (results.poseLandmarks) {
            window.drawConnectors(ctx, results.poseLandmarks, window.POSE_CONNECTIONS, {
              color: "#1E628C",
              lineWidth: 2,
            });

            window.drawLandmarks(ctx, results.poseLandmarks, {
              color: "#FF0000",
              lineWidth: 1,
              radius: 3,
            });

            try {
              await sendLandmarksToBackend(results.poseLandmarks);
            } catch (requestError) {
              setError("Connection error with RepBot backend.");
            }
          }
        });

        poseRef.current = pose;
        setIsEngineReady(true);
      } catch (engineError) {
        if (!isMounted) return;
        setError(engineError.message || "Failed to load RepBot engine.");
      }
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    setupEngine();

    return () => {
      isMounted = false;
      window.removeEventListener("resize", resizeCanvas);

      if (cameraRef.current) {
        cameraRef.current.stop();
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      setError("");
      setIsCameraLoading(true);

      if (!isEngineReady) {
        throw new Error("RepBot engine is still loading. Please wait a moment.");
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("getUserMedia is not supported in this browser");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;

      if (!videoRef.current) {
        throw new Error("Video element not found");
      }

      videoRef.current.srcObject = stream;

      await new Promise((resolve) => {
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().then(resolve);
        };
      });

      const camera = new window.Camera(videoRef.current, {
        onFrame: async () => {
          if (poseRef.current && videoRef.current) {
            await poseRef.current.send({ image: videoRef.current });
          }
        },
        width: 1280,
        height: 720,
      });

      cameraRef.current = camera;
      await camera.start();

      setIsCameraStarted(true);
    } catch (cameraError) {
      setError(cameraError.message || "Failed to start camera.");
      setIsCameraStarted(false);
    } finally {
      setIsCameraLoading(false);
    }
  };

  const handleExerciseChange = (event) => {
    setExerciseType(event.target.value);
    setRepCounter(0);
    previousRepCountRef.current = 0;
    setFeedback("");
  };

  return (
    <div className="flex min-h-screen flex-col gap-y-6">
      <div className="rounded-xl border border-slate-300 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="rounded-lg bg-[#1e628c] px-4 py-2 text-xl font-bold text-white">Reps: {repCounter}</div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="exercise-type">
              Exercise
            </label>
            <select
              id="exercise-type"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={exerciseType}
              onChange={handleExerciseChange}
            >
              {exerciseTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div ref={containerRef} className="relative h-[620px] w-full overflow-hidden rounded-lg bg-slate-100">
          <video ref={videoRef} playsInline className="absolute inset-0 h-full w-full object-cover" />
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

          {!isCameraStarted && (
            <button
              type="button"
              onClick={startCamera}
              disabled={isCameraLoading || !isEngineReady}
              className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-[#1e628c] px-5 py-3 text-white disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isCameraLoading ? "Starting..." : isEngineReady ? "Start Camera" : "Loading RepBot..."}
            </button>
          )}

          {feedback && <div className="absolute right-3 top-3 rounded-lg bg-[#1e628c]/90 px-3 py-2 text-sm text-white">{feedback}</div>}
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>

      <div className="text-center text-sm text-slate-600">
        <p>Your reps are automatically saved if you are signed in. Do not leave the RepBot page instantly or reps may not fully sync.</p>
      </div>

      <Footer />
    </div>
  );
};

export default RepBotPage;
