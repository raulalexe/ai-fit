import type { GenerateWorkoutPayload } from './workout-schema';

const jsonShape = `{
  "summary": "High level overview in 1-2 sentences",
  "totalDurationMinutes": 45,
  "warmup": ["Joint circles 2 min", "Light cardio 3 min"],
  "blocks": [
    {
      "id": "block-1",
      "title": "Power Primer",
      "focus": "Explosive full-body activation",
      "durationMinutes": 12,
      "instructions": "Pair movements as contrast sets. Keep pace brisk.",
      "timerSeconds": 600,
      "exercises": [
        {
          "id": "exercise-1",
          "name": "Kettlebell Swing",
          "prescription": "3 x 12 @ RPE 7, rest 45s",
          "equipment": "Kettlebell",
          "notes": ["Drive from hips", "Neutral spine"]
        }
      ],
      "tips": ["Emphasize nasal breathing", "Shake out arms between rounds"]
    }
  ],
  "finisher": ["Assault bike sprint ladder 5 min"],
  "cooldown": ["Box breathing 2 min", "90/90 hip stretch 2 min"],
  "metrics": {
    "intensity": "medium",
    "rpeTarget": "Stay between 6-8 RPE",
    "estimatedCalories": 350
  }
}`;

export function buildWorkoutPrompt(input: GenerateWorkoutPayload) {
  const { time, intensity, goal, equipment } = input;

  return `
Act as an elite strength & conditioning coach. You know how to design efficient, safe training blocks for every skill level.

Design a single-session workout with:
- Total available time: ${time} minutes (respect this cap)
- Intensity: ${intensity}
- Goal: ${goal}
- Equipment access: ${equipment}

Output requirements:
1. The plan must fit inside the available time (sum of warmup + blocks + finisher + cooldown).
2. Include 2-4 training blocks with focused themes tailored to the goal.
3. Each block must include at least 2 detailed exercises with actionable prescriptions.
4. Provide timer guidance per block via "timerSeconds" (convert minutes to seconds).
5. Suggest a finisher only if time allows; otherwise return an empty array.
6. Always include actionable cooldown breathing/mobility items.
7. Return VALID JSON only (no markdown, no comments) that matches this structure:
${jsonShape}

Prioritize clarity, specificity, and safe progressions.`;
}
