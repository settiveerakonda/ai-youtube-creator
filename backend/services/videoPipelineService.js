const path = require("path");

const {
  generateStructuredScript,
} = require("./scriptService");

const {
  generateGoogleVoice,
} = require("./voiceService");

const {
  generateSceneImage,
} = require("./imageService");

const {
  createCompleteVideo,
} = require("./videoService");

// ======================================================
// RETRY HELPER
// ======================================================

const retryOperation = async (
  operation,
  operationName,
  maxRetries = 3,
  delayMs = 1500
) => {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `🔄 ${operationName} - Attempt ${attempt}/${maxRetries}`
      );

      const result = await operation();

      console.log(
        `✅ ${operationName} - Success`
      );

      return result;
    } catch (error) {
      lastError = error;

      console.error(
        `❌ ${operationName} - Attempt ${attempt} failed:`,
        error.message
      );

      if (attempt < maxRetries) {
        console.log(
          `⏳ Retrying ${operationName}...`
        );

        await new Promise((resolve) =>
          setTimeout(resolve, delayMs)
        );
      }
    }
  }

  throw new Error(
    `${operationName} failed after ${maxRetries} attempts: ${lastError?.message}`
  );
};

// ======================================================
// COMPLETE VIDEO PIPELINE
// ======================================================

const generateCompleteVideo = async ({
  topic,
  category,
  duration,
  language,
  style,
}) => {
  try {
    console.log(
      "======================================"
    );

    console.log(
      "🎬 VIDEO PIPELINE STARTED"
    );

    console.log(
      "Topic:",
      topic
    );

    console.log(
      "Duration:",
      duration,
      "minutes"
    );

    console.log(
      "Language:",
      language
    );

    console.log(
      "======================================"
    );

    // ==================================================
    // PROJECT
    // ==================================================

    const project = {
      topic,
      category:
        category || "General",

      duration:
        Number(duration),

      language:
        language || "Telugu",

      style:
        style || "Educational",
    };

    // ==================================================
    // STAGE 1
    // SCRIPT
    // ==================================================

    console.log(
      "======================================"
    );

    console.log(
      "📝 STAGE 1: GENERATING AI SCRIPT"
    );

    console.log(
      "======================================"
    );

    const scenes =
      await retryOperation(
        () =>
          generateStructuredScript(
            project
          ),
        "AI Script Generation",
        3
      );

    if (
      !Array.isArray(scenes) ||
      scenes.length === 0
    ) {
      throw new Error(
        "AI script generated no scenes"
      );
    }

    console.log(
      `✅ ${scenes.length} scenes generated`
    );

    // ==================================================
    // STAGE 2
    // VOICE
    // ==================================================

    console.log(
      "======================================"
    );

    console.log(
      "🎙️ STAGE 2: GENERATING VOICEOVERS"
    );

    console.log(
      "======================================"
    );

    for (
      const scene of scenes
    ) {
      console.log(
        `🎙️ Scene ${scene.sceneNumber}/${scenes.length}`
      );

      const audioPath =
        await retryOperation(
          () =>
            generateGoogleVoice({
              text:
                scene.narrationText,

              language:
                language === "Telugu"
                  ? "te"
                  : "en",

              sceneNumber:
                scene.sceneNumber,
            }),

          `Voice Scene ${scene.sceneNumber}`,

          4,

          2000
        );

      if (
        !audioPath
      ) {
        throw new Error(
          `Voice generation returned empty path for scene ${scene.sceneNumber}`
        );
      }

      scene.audioPath =
        audioPath;

      console.log(
        `✅ Voice ready for scene ${scene.sceneNumber}`
      );
    }

    // Final voice validation
    const missingAudio =
      scenes.filter(
        (scene) =>
          !scene.audioPath
      );

    if (
      missingAudio.length > 0
    ) {
      throw new Error(
        `Missing audio for ${missingAudio.length} scenes`
      );
    }

    console.log(
      "🎉 STAGE 2 COMPLETE - ALL VOICES READY"
    );

    // ==================================================
    // STAGE 3
    // IMAGES
    // ==================================================

    console.log(
      "======================================"
    );

    console.log(
      "🖼️ STAGE 3: GENERATING VISUALS"
    );

    console.log(
      "======================================"
    );

    for (
      const scene of scenes
    ) {
      console.log(
        `🖼️ Scene ${scene.sceneNumber}/${scenes.length}`
      );

      const image =
        await retryOperation(
          () =>
            generateSceneImage({
              scene,

              topic,

              category,
            }),

          `Image Scene ${scene.sceneNumber}`,

          4,

          2000
        );

      if (
        !image ||
        !image.imagePath
      ) {
        throw new Error(
          `Image generation returned empty path for scene ${scene.sceneNumber}`
        );
      }

      scene.imagePath =
        image.imagePath;

      scene.imageUrl =
        image.imageUrl;

      scene.pexelsId =
        image.pexelsId;

      console.log(
        `✅ Image ready for scene ${scene.sceneNumber}`
      );
    }

    // Final image validation
    const missingImages =
      scenes.filter(
        (scene) =>
          !scene.imagePath
      );

    if (
      missingImages.length > 0
    ) {
      throw new Error(
        `Missing image for ${missingImages.length} scenes`
      );
    }

    console.log(
      "🎉 STAGE 3 COMPLETE - ALL IMAGES READY"
    );

    // ==================================================
    // FINAL VALIDATION
    // ==================================================

    console.log(
      "======================================"
    );

    console.log(
      "🔍 VALIDATING ALL SCENES"
    );

    console.log(
      "======================================"
    );

    for (
      const scene of scenes
    ) {
      if (
        !scene.audioPath
      ) {
        throw new Error(
          `Scene ${scene.sceneNumber} has no audio`
        );
      }

      if (
        !scene.imagePath
      ) {
        throw new Error(
          `Scene ${scene.sceneNumber} has no image`
        );
      }

      if (
        !scene.narrationText
      ) {
        throw new Error(
          `Scene ${scene.sceneNumber} has no narration`
        );
      }
    }

    console.log(
      "✅ ALL SCENES VALID"
    );

    // ==================================================
    // STAGE 4
    // VIDEO
    // ==================================================

    console.log(
      "======================================"
    );

    console.log(
      "🎬 STAGE 4: CREATING FINAL VIDEO"
    );

    console.log(
      "======================================"
    );

    const safeName =
      topic
        .replace(
          /[^a-zA-Z0-9]+/g,
          "_"
        )
        .substring(
          0,
          80
        );

    const outputName =
      `${safeName}_${Date.now()}.mp4`;

    const result =
      await retryOperation(
        () =>
          createCompleteVideo({
            scenes,

            outputName,
          }),

        "Final Video Rendering",

        3,

        3000
      );

    if (
      !result ||
      !result.finalVideo
    ) {
      throw new Error(
        "Final video was not created"
      );
    }

    console.log(
      "======================================"
    );

    console.log(
      "🎉 VIDEO PIPELINE COMPLETE!"
    );

    console.log(
      "📁 Final video:",
      result.finalVideo
    );

    console.log(
      "======================================"
    );

    // ==================================================
    // RETURN
    // ==================================================

    return {
      success: true,

      project,

      scenes,

      finalVideo:
        result.finalVideo,

      sceneVideos:
        result.sceneVideoPaths,
    };

  } catch (error) {
    console.error(
      "======================================"
    );

    console.error(
      "❌ VIDEO PIPELINE FAILED"
    );

    console.error(
      error.message
    );

    console.error(
      "======================================"
    );

    throw error;
  }
};

// ======================================================
// EXPORT
// ======================================================

module.exports = {
  generateCompleteVideo,
};
