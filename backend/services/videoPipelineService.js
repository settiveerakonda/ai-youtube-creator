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
      "Stage 1: Generating AI script..."
    );

    const scenes =
      await generateStructuredScript(
        project
      );

    console.log(
      `✅ ${scenes.length} scenes generated`
    );

    // ==================================================
    // STAGE 2
    // VOICE
    // ==================================================

    console.log(
      "Stage 2: Generating voiceovers..."
    );

    for (
      const scene of scenes
    ) {

      const audioPath =
        await generateGoogleVoice({
          text:
            scene.narrationText,

          language:
            language === "Telugu"
              ? "te"
              : "en",

          sceneNumber:
            scene.sceneNumber,
        });

      // Store path inside scene
      scene.audioPath =
        audioPath;
    }

    console.log(
      "🎉 Stage 2 complete"
    );

    // ==================================================
    // STAGE 3
    // IMAGES
    // ==================================================

    console.log(
      "Stage 3: Generating visuals..."
    );

    for (
      const scene of scenes
    ) {

      const image =
        await generateSceneImage({
          scene,

          topic,

          category,
        });

      scene.imagePath =
        image.imagePath;

      scene.imageUrl =
        image.imageUrl;

      scene.pexelsId =
        image.pexelsId;
    }

    console.log(
      "🎉 Stage 3 complete"
    );

    // ==================================================
    // STAGE 4
    // VIDEO
    // ==================================================

    console.log(
      "Stage 4: Creating final video..."
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
      await createCompleteVideo({
        scenes,

        outputName,
      });

    console.log(
      "🎉 VIDEO PIPELINE COMPLETE!"
    );

    console.log(
      "📁 Final video:",
      result.finalVideo
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
      "❌ VIDEO PIPELINE FAILED:",
      error.message
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