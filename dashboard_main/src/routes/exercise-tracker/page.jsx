import { useEffect, useMemo, useState } from "react";
import { Footer } from "@/layouts/footer";
import { useAuth } from "@/contexts/auth-context";
import axios from "axios";

const exerciseOptions = [
  "Push-ups", "Pull-ups", "Squats", "Dips", "Planks", "Burpees", "Jump Rope", "Deadlifts", "Bench Press", "Tuck Planche",
  "Straddle Planche", "Crow Pose", "Frog Pose", "Front Lever", "Muscle Ups", "Pistol Squats", "Dragon Squats", "One Arm Push-ups", "Clap Push-ups", "Back Lever",
  "Pike Press", "Dragon Flag", "Human Flag", "Side Plank", "Inverted Rows", "Ring Dips", "Leg Raises", "Barbell Rows", "Chin-ups", "Incline Push-ups",
  "Hip Thrusts", "Tricep Dips", "Wall Sit", "Superman Hold", "Jumping Lunges", "Mountain Climbers", "Glute Bridges", "Box Jumps", "Squat Jumps", "Archer Pull-ups",
  "Archer Push-ups", "Wide Push-ups", "Decline Push-ups", "Handstand Push-ups", "Pistol Squats (Assisted)", "Bulgarian Split Squats", "Wall Walks", "Planche Push-ups", "L-sit Hold", "V-sit Hold",
  "Human Flag (Progression)", "Front Lever Progression", "Back Lever Progression", "Muscle-up Progression", "Shoulder Taps", "Dip Bar Leg Raises", "Isometric Pull-up Hold", "Handstand Holds", "Crunches", "Bicep Curls",
  "Tricep Extensions", "Hammer Curls", "Barbell Curls", "Overhead Press", "Front Raises", "Lateral Raises", "Rear Delt Flyes", "Chest Press", "Romanian Deadlifts", "Leg Press",
  "Leg Curls", "Calf Raises", "Skull Crushers", "Concentration Curls", "Preacher Curls", "Arnold Press", "Bulgarian Split Squats (with weights)", "Weighted Step-ups", "Seated Rows", "Chest Flyes",
  "Deadlifts (Conventional)", "Squat Press", "Incline Bench Press", "Barbell Shrugs", "Kettlebell Swings", "Farmers Walk", "Pull-over", "Reverse Flyes",
];

const timedExercises = new Set([
  "Planks",
  "Tuck Planche",
  "Straddle Planche",
  "Crow Pose",
  "Frog Pose",
  "Front Lever",
  "Back Lever",
  "Dragon Flag",
  "Human Flag",
  "Side Plank",
  "Wall Sit",
  "Superman Hold",
  "L-sit Hold",
  "V-sit Hold",
  "Handstand Holds",
]);

const getTodayEST = () => {
  const estOptions = {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  };

  const estDate = new Date().toLocaleDateString("en-US", estOptions);
  const [month, day, year] = estDate.split("/");
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

const ExerciseTrackerPage = () => {
  const { isAuthenticated, user } = useAuth();

  const [trackerExercises, setTrackerExercises] = useState([]);
  const [notification, setNotification] = useState(null);
  const [form, setForm] = useState({
    exercise: exerciseOptions[0],
    sets: "",
    reps: "",
    time: "",
    weight: "",
    weightUnit: "kg",
    date: getTodayEST(),
  });

  const isTimedExercise = useMemo(() => timedExercises.has(form.exercise), [form.exercise]);

  useEffect(() => {
    const fetchExercisesFromServer = async () => {
      if (!isAuthenticated) {
        setTrackerExercises([]);
        return;
      }

      try {
        const response = await axios.get("/api/user-data/get-data");
        setTrackerExercises(response.data?.trackerExercises || []);
      } catch (error) {
        console.error("Error fetching tracker exercises:", error);
      }
    };

    fetchExercisesFromServer();
  }, [isAuthenticated]);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const persistExercises = async (nextExercises) => {
    if (!isAuthenticated) return;

    await axios.post("/api/user-data/save-data", {
      dataType: "trackerExercises",
      data: nextExercises,
    });
  };

  const addExercise = async () => {
    if (isTimedExercise && !form.time) {
      showNotification("error", "Please enter time for timed exercises.");
      return;
    }

    if (!isTimedExercise && (!form.sets || !form.reps)) {
      showNotification("error", "Please enter sets and reps.");
      return;
    }

    const newExercise = {
      id: Date.now().toString(),
      exercise: form.exercise,
      sets: form.sets,
      reps: form.reps,
      time: form.time,
      weight: form.weight || "Bodyweight",
      weightUnit: form.weightUnit,
      date: form.date,
      timestamp: new Date().toISOString(),
      userId: user?.id || null,
    };

    const nextExercises = [newExercise, ...trackerExercises];
    setTrackerExercises(nextExercises);

    if (isAuthenticated) {
      try {
        await persistExercises(nextExercises);
      } catch (error) {
        console.error("Error saving tracker exercise:", error);
        showNotification("error", "Failed to save exercise.");
      }
    } else {
      showNotification("warning", "Sign in to save exercises to your account.");
    }

    setForm((previous) => ({
      ...previous,
      sets: "",
      reps: "",
      time: "",
      weight: "",
      date: getTodayEST(),
    }));
  };

  const removeExercise = async (exerciseId) => {
    const nextExercises = trackerExercises.filter((item) => item.id !== exerciseId);
    setTrackerExercises(nextExercises);

    if (!isAuthenticated) return;

    try {
      await persistExercises(nextExercises);
    } catch (error) {
      console.error("Error deleting tracker exercise:", error);
      showNotification("error", "Failed to delete exercise.");
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      {notification && (
        <div
          className={`fixed right-4 top-4 z-50 rounded-lg px-4 py-3 text-sm shadow-md ${
            notification.type === "warning"
              ? "bg-amber-100 text-amber-800"
              : notification.type === "error"
              ? "bg-red-100 text-red-800"
              : "bg-green-100 text-green-800"
          }`}
        >
          {notification.message}
        </div>
      )}

      <div className="grid flex-grow grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-300 bg-white p-5">
          <h2 className="mb-4 text-xl font-semibold text-slate-900">Exercise Tracker</h2>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Exercise</label>
              <select
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={form.exercise}
                onChange={(event) => setForm((previous) => ({ ...previous, exercise: event.target.value }))}
              >
                {exerciseOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Sets</label>
                <input
                  type="number"
                  value={form.sets}
                  disabled={isTimedExercise}
                  onChange={(event) => setForm((previous) => ({ ...previous, sets: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                  placeholder="Sets"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Reps</label>
                <input
                  type="number"
                  value={form.reps}
                  disabled={isTimedExercise}
                  onChange={(event) => setForm((previous) => ({ ...previous, reps: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                  placeholder="Reps"
                />
              </div>
            </div>

            {isTimedExercise && (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Time (seconds)</label>
                <input
                  type="number"
                  value={form.time}
                  onChange={(event) => setForm((previous) => ({ ...previous, time: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Time in seconds"
                />
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Weight</label>
                <input
                  type="number"
                  value={form.weight}
                  onChange={(event) => setForm((previous) => ({ ...previous, weight: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Leave empty for bodyweight"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Unit</label>
                <select
                  value={form.weightUnit}
                  onChange={(event) => setForm((previous) => ({ ...previous, weightUnit: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="kg">kg</option>
                  <option value="lbs">lbs</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(event) => setForm((previous) => ({ ...previous, date: event.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <button
              type="button"
              onClick={addExercise}
              className="w-full rounded-lg bg-[#1e628c] px-4 py-2 text-sm font-medium text-white hover:bg-[#195476]"
            >
              Add Exercise
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-300 bg-white p-5">
          <h2 className="mb-4 text-xl font-semibold text-slate-900">Logged Exercises</h2>

          <div className="max-h-[620px] space-y-3 overflow-y-auto">
            {trackerExercises.length === 0 && <p className="text-sm text-slate-500">No exercises logged yet.</p>}

            {trackerExercises.map((exercise) => {
              const [year, month, day] = exercise.date.split("-");
              return (
                <div key={exercise.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="font-semibold text-slate-900">{exercise.exercise}</p>
                  <p className="text-sm text-slate-700">
                    {timedExercises.has(exercise.exercise)
                      ? `Time: ${exercise.time} seconds`
                      : `Sets: ${exercise.sets}, Reps: ${exercise.reps}`}
                  </p>
                  <p className="text-sm text-slate-700">
                    Weight: {exercise.weight === "Bodyweight" ? "Bodyweight" : `${exercise.weight} ${exercise.weightUnit}`}
                  </p>
                  <p className="text-xs text-slate-500">Date: {`${month}/${day}/${year}`}</p>
                  <button
                    type="button"
                    className="mt-2 rounded-md bg-red-500 px-3 py-1 text-xs font-medium text-white hover:bg-red-600"
                    onClick={() => removeExercise(exercise.id)}
                  >
                    Delete
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ExerciseTrackerPage;
