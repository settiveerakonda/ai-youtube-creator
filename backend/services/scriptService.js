const axios = require("axios");

/**
 * Stage 1:
 * Generate exactly 3 structured YouTube scenes using OpenRouter.
 */
const generateStructuredScript = async (project) => {
  try {
    console.log("🚀 Starting OpenRouter AI Script Generation...");

    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY is missing in .env");
    }

    // -----------------------------------------
    // Calculate total video duration
    // -----------------------------------------

    const totalSeconds =
      Math.max(1, Number(project.duration) || 1) * 60;

    // -----------------------------------------
    // Divide duration between 3 scenes
    // -----------------------------------------

    const baseDuration = Math.floor(totalSeconds / 3);
    const remainder = totalSeconds % 3;

    const sceneDurations = [
      baseDuration + (remainder > 0 ? 1 : 0),
      baseDuration + (remainder > 1 ? 1 : 0),
      baseDuration,
    ];

    console.log(
      "Scene durations:",
      sceneDurations
    );

    // =========================================
    // SYSTEM PROMPT
    // =========================================

    const systemPrompt = `
You are an expert YouTube video script writer.

Your job is to create a structured YouTube video script.

STRICT RULES:

1. Return ONLY valid JSON.
2. Do NOT return markdown.
3. Do NOT use code fences.
4. Do NOT explain your reasoning.
5. Do NOT write anything outside the JSON.
6. Generate EXACTLY 3 scenes.
7. Scene numbers must be 1, 2, and 3.
8. Use the exact scene durations provided.
9. visualDescription MUST be written in clear English.
10. narrationText MUST be written in natural ${project.language}.
11. narrationText must sound like a native speaker.
12. Do not write instructions inside narrationText.
13. Do not write phrases like "in Telugu" inside narrationText.
14. Make the three scenes flow naturally from beginning to end.
15. Keep the content educational and engaging.
16. If the topic is about finance or investing, provide educational information only.

The required JSON structure is:

{
  "scenes": [
    {
      "sceneNumber": 1,
      "duration": ${sceneDurations[0]},
      "visualDescription": "English visual description",
      "narrationText": "Natural ${project.language} narration"
    },
    {
      "sceneNumber": 2,
      "duration": ${sceneDurations[1]},
      "visualDescription": "English visual description",
      "narrationText": "Natural ${project.language} narration"
    },
    {
      "sceneNumber": 3,
      "duration": ${sceneDurations[2]},
      "visualDescription": "English visual description",
      "narrationText": "Natural ${project.language} narration"
    }
  ]
}
`;

    // =========================================
    // USER PROMPT
    // =========================================

    const userPrompt = `
Create a YouTube video script using these details:

Topic:
${project.topic}

Category:
${project.category}

Total Duration:
${project.duration} minutes

Language:
${project.language}

Style:
${project.style}

Required scene durations:

Scene 1:
${sceneDurations[0]} seconds

Scene 2:
${sceneDurations[1]} seconds

Scene 3:
${sceneDurations[2]} seconds

Make the three scenes form one continuous explanation.

IMPORTANT:

The narrationText must be written naturally in ${project.language}.

Do not write broken translations.

Do not write English instructions inside narrationText.

Return ONLY JSON.
`;

    // =========================================
    // OPENROUTER REQUEST
    // =========================================

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",

      {
        /*
         * Use a free model that is better suited
         * for normal text generation.
         */
        model: "google/gemma-3-27b-it",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],

        temperature: 0.4,

        max_tokens: 2500,

        /*
         * Ask OpenRouter for JSON.
         */
        response_format: {
          type: "json_object",
        },
      },

      {
        headers: {
          Authorization:
            `Bearer ${process.env.OPENROUTER_API_KEY}`,

          "Content-Type":
            "application/json",

          "HTTP-Referer":
            "http://localhost:5173",

          "X-Title":
            "AI YouTube Video Creator",
        },

        timeout: 120000,
      }
    );

    // =========================================
    // CHECK RESPONSE
    // =========================================

    console.log(
      "✅ OpenRouter response received"
    );

    const choice =
      response.data?.choices?.[0];

    const finishReason =
      choice?.finish_reason;

    const responseText =
      choice?.message?.content;

    console.log(
      "OpenRouter model:",
      response.data?.model
    );

    console.log(
      "Finish reason:",
      finishReason
    );

    console.log(
      "Content received:",
      Boolean(responseText)
    );

    // =========================================
    // EMPTY RESPONSE CHECK
    // =========================================

    if (!responseText) {
      console.error(
        "========== OPENROUTER RESPONSE =========="
      );

      console.error(
        JSON.stringify(
          response.data,
          null,
          2
        )
      );

      console.error(
        "=========================================="
      );

      throw new Error(
        `OpenRouter returned no content. Finish reason: ${
          finishReason || "unknown"
        }`
      );
    }

    // =========================================
    // CLEAN RESPONSE
    // =========================================

    let cleanedText =
      responseText.trim();

    // Remove ```json

    if (
      cleanedText.startsWith(
        "```json"
      )
    ) {
      cleanedText =
        cleanedText.replace(
          /^```json\s*/i,
          ""
        );
    }

    // Remove ```

    if (
      cleanedText.startsWith(
        "```"
      )
    ) {
      cleanedText =
        cleanedText.replace(
          /^```\s*/,
          ""
        );
    }

    if (
      cleanedText.endsWith(
        "```"
      )
    ) {
      cleanedText =
        cleanedText.replace(
          /\s*```$/,
          ""
        );
    }

    // =========================================
    // PARSE JSON
    // =========================================

    let parsedData;

    try {
      parsedData =
        JSON.parse(cleanedText);
    } catch (error) {
      console.log(
        "⚠️ Direct JSON parsing failed."
      );

      // Try extracting JSON object

      const jsonStart =
        cleanedText.indexOf("{");

      const jsonEnd =
        cleanedText.lastIndexOf("}");

      if (
        jsonStart === -1 ||
        jsonEnd === -1
      ) {
        console.error(
          "Invalid AI response:"
        );

        console.error(
          cleanedText
        );

        throw new Error(
          "AI response does not contain valid JSON."
        );
      }

      const jsonText =
        cleanedText.substring(
          jsonStart,
          jsonEnd + 1
        );

      try {
        parsedData =
          JSON.parse(jsonText);
      } catch (secondError) {
        console.error(
          "JSON parsing failed completely."
        );

        console.error(
          cleanedText
        );

        throw new Error(
          "OpenRouter returned invalid JSON."
        );
      }
    }

    // =========================================
    // VALIDATE SCENES
    // =========================================

    if (
      !parsedData ||
      !Array.isArray(
        parsedData.scenes
      )
    ) {
      throw new Error(
        "Invalid scenes array returned by AI."
      );
    }

    // Must have exactly 3 scenes

    if (
      parsedData.scenes.length !== 3
    ) {
      throw new Error(
        `Expected exactly 3 scenes but received ${parsedData.scenes.length}.`
      );
    }

    // =========================================
    // VALIDATE EACH SCENE
    // =========================================

    parsedData.scenes.forEach(
      (scene, index) => {

        if (
          scene.sceneNumber !==
            index + 1
        ) {
          throw new Error(
            `Scene number ${index + 1} is invalid.`
          );
        }

        if (
          !scene.visualDescription
        ) {
          throw new Error(
            `Scene ${index + 1} has no visualDescription.`
          );
        }

        if (
          !scene.narrationText
        ) {
          throw new Error(
            `Scene ${index + 1} has no narrationText.`
          );
        }

        // Application controls duration.
        scene.duration =
          sceneDurations[index];

        scene.visualDescription =
          String(
            scene.visualDescription
          ).trim();

        scene.narrationText =
          String(
            scene.narrationText
          ).trim();
      }
    );

    // =========================================
    // VERIFY TOTAL DURATION
    // =========================================

    const actualTotalDuration =
      parsedData.scenes.reduce(
        (total, scene) => {
          return (
            total +
            Number(scene.duration)
          );
        },
        0
      );

    if (
      actualTotalDuration !==
      totalSeconds
    ) {
      throw new Error(
        `Scene durations total ${actualTotalDuration}s but expected ${totalSeconds}s.`
      );
    }

    // =========================================
    // SUCCESS
    // =========================================

    console.log(
      `✅ Successfully generated ${parsedData.scenes.length} scenes`
    );

    console.log(
      `⏱️ Total scene duration: ${actualTotalDuration} seconds`
    );

    return parsedData.scenes;

  } catch (error) {

    console.error(
      "❌ OpenRouter Script Generation Error"
    );

    if (error.response) {

      console.error(
        "HTTP Status:",
        error.response.status
      );

      console.error(
        "OpenRouter Error:",
        JSON.stringify(
          error.response.data,
          null,
          2
        )
      );

    } else {

      console.error(
        error.message
      );
    }

    throw error;
  }
};

module.exports = {
  generateStructuredScript,
};