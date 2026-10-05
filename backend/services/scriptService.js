
const axios = require("axios");

/**
 * AI YouTube Creator V2
 *
 * Creates many short, meaningful scenes instead of only 3 long scenes.
 *
 * Target:
 * 5 min  -> roughly 30-40 scenes
 * 10 min -> roughly 55-70 scenes
 *
 * Each scene contains:
 * - narrationText
 * - visualType
 * - visualDescription
 * - visualPrompt
 * - duration
 */

const generateStructuredScript = async (project) => {
  try {
    console.log("🚀 Starting AI Script + Scene Planning...");

    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY is missing in .env");
    }

    const totalMinutes = Math.max(
      1,
      Number(project.duration) || 1
    );

    const totalSeconds = totalMinutes * 60;

    /*
     * We want short scenes.
     *
     * 6-10 seconds per visual is much better
     * than keeping one image for 2-3 minutes.
     */
    const targetSceneCount = Math.max(
      8,
      Math.ceil(totalSeconds / 8)
    );

    console.log(
      `🎬 Target duration: ${totalMinutes} minutes`
    );

    console.log(
      `🎞️ Target scenes: ${targetSceneCount}`
    );

    // =========================================================
    // SYSTEM PROMPT
    // =========================================================

    const systemPrompt = `
You are an expert YouTube documentary and educational video producer.

Your job is to create a complete scene-by-scene YouTube video plan.

The video will be rendered automatically using narration + realistic visuals.

IMPORTANT:

DO NOT create only 3 long scenes.

Create many short scenes.

The target is approximately ${targetSceneCount} scenes.

Each scene should normally be 6-10 seconds long.

The total duration of all scenes MUST equal exactly ${totalSeconds} seconds.

--------------------------------------------------
NARRATION RULES
--------------------------------------------------

1. narrationText must be natural ${project.language}.
2. It must sound like a real native YouTube presenter.
3. Do not write robotic sentences.
4. Do not write instructions inside narration.
5. Do not say "show an image", "display a graph", etc.
6. Do not repeat the same information.
7. Make the narration flow continuously between scenes.
8. Use simple language suitable for normal YouTube viewers.
9. For financial topics, remain educational and avoid personalized financial advice.

--------------------------------------------------
VISUAL RULES
--------------------------------------------------

This is VERY IMPORTANT.

Do NOT use charts for every scene.

Charts should only be used when the narration is specifically explaining:

- price movement
- percentage change
- historical trend
- comparison
- financial data
- numerical information

For other narration, use realistic visual scenes.

Examples:

Gold topic:
- realistic gold jewellery
- gold bars
- Indian jewellery showroom
- customer looking at gold
- investor checking phone
- financial news environment
- Indian market environment
- close-up of gold
- professional presenter environment

Stock market topic:
- Indian investor using smartphone
- laptop with trading application
- realistic office
- business district
- company building
- financial newspaper
- investor thinking
- market-related environment
- professional trading environment
- charts only when actually needed

Mutual funds:
- person planning investments
- smartphone investment application
- family financial planning
- SIP concept
- calculator and financial documents
- professional financial environment
- charts only when data is being explained

--------------------------------------------------
VISUAL VARIETY
--------------------------------------------------

Do NOT repeat the same visual type in consecutive scenes.

Avoid:

scene 1 = graph
scene 2 = graph
scene 3 = graph
scene 4 = graph

Instead create visual variety.

Example:

scene 1 = realistic investor
scene 2 = smartphone
scene 3 = financial environment
scene 4 = gold/shop
scene 5 = chart
scene 6 = investor
scene 7 = company/business
scene 8 = chart

--------------------------------------------------
VISUAL TYPES
--------------------------------------------------

Every scene MUST select exactly one visualType from:

"realistic_photo"
"cinematic_broll"
"financial_environment"
"person"
"business"
"technology"
"gold"
"money"
"news"
"chart"
"infographic"

Use "chart" sparingly.

Use "infographic" only when a concept cannot be explained naturally using a realistic scene.

--------------------------------------------------
IMAGE PROMPT
--------------------------------------------------

visualPrompt must be a detailed English prompt for generating or finding a realistic visual.

It must describe:

- subject
- environment
- action
- camera framing
- lighting
- realism
- Indian context when relevant

Example:

"Photorealistic Indian retail investor in his early 30s sitting at a modern desk, checking a stock market investment app on his smartphone, laptop visible in background, natural office lighting, realistic skin texture, documentary photography, medium shot, professional financial atmosphere, no text, no watermark"

Do NOT create fake-looking AI art.

Do NOT use:
- cartoon
- anime
- illustration
- fantasy
- 3D character
- surreal
- unrealistic face

--------------------------------------------------
CHART RULES
--------------------------------------------------

If visualType is "chart":

chartData must describe what the chart should communicate.

Example:

"Simple line chart showing gold price increasing over the recent period"

If the script does not contain reliable numerical data, do NOT invent numbers.

Use a conceptual chart instead.

--------------------------------------------------
JSON
--------------------------------------------------

Return ONLY valid JSON.

Format:

{
  "scenes": [
    {
      "sceneNumber": 1,
      "duration": 8,
      "narrationText": "...",
      "visualType": "realistic_photo",
      "visualDescription": "...",
      "visualPrompt": "...",
      "chartData": null
    }
  ]
}

Do not return markdown.
Do not return code fences.
Do not explain anything outside JSON.
`;

    // =========================================================
    // USER PROMPT
    // =========================================================

    const userPrompt = `
Create a complete ${totalMinutes}-minute YouTube video.

Topic:
${project.topic}

Category:
${project.category}

Language:
${project.language}

Style:
${project.style}

Target scene count:
${targetSceneCount}

Total required duration:
${totalSeconds} seconds

The video must feel like a professional YouTube educational video.

The narration should continuously explain the topic.

The visuals must change frequently and naturally.

IMPORTANT:

This is NOT a graph-only video.

Use realistic people, environments, objects, businesses, phones, laptops, money, gold, offices, news-style visuals and other relevant B-roll.

Use charts only when they actually help explain numerical or market information.

Do not invent financial numbers.

Create approximately ${targetSceneCount} scenes.

Each scene should normally be 6-10 seconds.

The final total of all scene durations must equal exactly ${totalSeconds} seconds.

Return ONLY JSON.
`;

    // =========================================================
    // AI REQUEST
    // =========================================================

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
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

        temperature: 0.65,

        /*
         * Many scenes require more output tokens.
         */
        max_tokens: Math.min(
          12000,
          Math.max(
            6000,
            targetSceneCount * 350
          )
        ),

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
            "AI YouTube Creator V2",
        },

        timeout: 180000,
      }
    );

    console.log("✅ AI scene plan received");

    const responseText =
      response.data?.choices?.[0]?.message?.content;

    if (!responseText) {
      throw new Error(
        "AI returned an empty script response."
      );
    }

    // =========================================================
    // CLEAN JSON
    // =========================================================

    let cleanedText =
      String(responseText).trim();

    cleanedText =
      cleanedText
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

    // =========================================================
    // PARSE
    // =========================================================

    let parsedData;

    try {
      parsedData =
        JSON.parse(cleanedText);
    } catch (error) {
      const start =
        cleanedText.indexOf("{");

      const end =
        cleanedText.lastIndexOf("}");

      if (
        start === -1 ||
        end === -1
      ) {
        throw new Error(
          "AI response does not contain valid JSON."
        );
      }

      parsedData =
        JSON.parse(
          cleanedText.substring(
            start,
            end + 1
          )
        );
    }

    // =========================================================
    // VALIDATE
    // =========================================================

    if (
      !parsedData ||
      !Array.isArray(parsedData.scenes) ||
      parsedData.scenes.length < 2
    ) {
      throw new Error(
        "AI returned an invalid scenes array."
      );
    }

    console.log(
      `🎞️ AI returned ${parsedData.scenes.length} scenes`
    );

    // =========================================================
    // NORMALIZE SCENES
    // =========================================================

    const allowedVisualTypes = new Set([
      "realistic_photo",
      "cinematic_broll",
      "financial_environment",
      "person",
      "business",
      "technology",
      "gold",
      "money",
      "news",
      "chart",
      "infographic",
    ]);

    const scenes =
      parsedData.scenes.map(
        (scene, index) => {

          let visualType =
            String(
              scene.visualType ||
                "realistic_photo"
            ).trim();

          if (
            !allowedVisualTypes.has(
              visualType
            )
          ) {
            visualType =
              "realistic_photo";
          }

          return {
            sceneNumber:
              index + 1,

            duration:
              Math.max(
                4,
                Math.min(
                  12,
                  Number(scene.duration) || 8
                )
              ),

            narrationText:
              String(
                scene.narrationText || ""
              ).trim(),

            visualType,

            visualDescription:
              String(
                scene.visualDescription || ""
              ).trim(),

            visualPrompt:
              String(
                scene.visualPrompt ||
                  scene.visualDescription ||
                  ""
              ).trim(),

            chartData:
              scene.chartData || null,
          };
        }
      );

    // =========================================================
    // REMOVE EMPTY SCENES
    // =========================================================

    const validScenes =
      scenes.filter(
        (scene) =>
          scene.narrationText &&
          scene.visualPrompt
      );

    if (
      validScenes.length < 2
    ) {
      throw new Error(
        "AI did not generate enough valid scenes."
      );
    }

    // =========================================================
    // RE-NUMBER
    // =========================================================

    validScenes.forEach(
      (scene, index) => {
        scene.sceneNumber =
          index + 1;
      }
    );

    // =========================================================
    // ADJUST TOTAL DURATION
    // =========================================================

    /*
     * The AI can occasionally produce slightly wrong
     * durations.
     *
     * Application fixes them here.
     */

    let currentTotal =
      validScenes.reduce(
        (sum, scene) =>
          sum + scene.duration,
        0
      );

    let difference =
      totalSeconds -
      currentTotal;

    console.log(
      `⏱️ AI duration: ${currentTotal}s`
    );

    console.log(
      `⏱️ Required duration: ${totalSeconds}s`
    );

    // Add/remove seconds from scenes while
    // keeping every scene between 4 and 12 sec.

    let safety = 0;

    while (
      difference !== 0 &&
      safety < 5000
    ) {
      safety++;

      if (difference > 0) {
        const scene =
          validScenes[
            safety %
              validScenes.length
          ];

        if (scene.duration < 12) {
          scene.duration++;
          difference--;
        }
      } else {
        const scene =
          validScenes[
            safety %
              validScenes.length
          ];

        if (scene.duration > 4) {
          scene.duration--;
          difference++;
        }
      }

      /*
       * Prevent infinite loops if duration
       * cannot be adjusted.
       */
      if (
        safety >= 4999 &&
        difference !== 0
      ) {
        break;
      }
    }

    // =========================================================
    // FINAL DURATION CHECK
    // =========================================================

    const finalDuration =
      validScenes.reduce(
        (sum, scene) =>
          sum + scene.duration,
        0
      );

    if (
      finalDuration !==
      totalSeconds
    ) {
      throw new Error(
        `Could not normalize video duration. Required ${totalSeconds}s but got ${finalDuration}s.`
      );
    }

    console.log(
      `✅ Final scene count: ${validScenes.length}`
    );

    console.log(
      `✅ Final duration: ${finalDuration}s`
    );

    return validScenes;

  } catch (error) {

    console.error(
      "❌ Script generation failed:",
      error.response?.data ||
        error.message
    );

    throw error;
  }
};

module.exports = {
  generateStructuredScript,
};