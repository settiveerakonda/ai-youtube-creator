const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const {
  generateStructuredScript,
} = require("../services/scriptService");

const {
  generateCompleteVideo,
} = require("../services/videoPipelineService");

const router = express.Router();

// ============================================================
// DIRECTORIES
// ============================================================

const IMAGE_DIR = path.join(
  __dirname,
  "..",
  "public",
  "images"
);

fs.mkdirSync(IMAGE_DIR, {
  recursive: true,
});

// ============================================================
// MULTER STORAGE
// ============================================================

const imageStorage =
  multer.diskStorage({
    destination: (
      req,
      file,
      cb
    ) => {
      cb(
        null,
        IMAGE_DIR
      );
    },

    filename: (
      req,
      file,
      cb
    ) => {
      const extension =
        path.extname(
          file.originalname
        );

      const safeName =
        path
          .basename(
            file.originalname,
            extension
          )
          .replace(
            /[^a-zA-Z0-9_-]/g,
            "_"
          );

      const filename =
        `${safeName}_${Date.now()}${extension}`;

      cb(
        null,
        filename
      );
    },
  });

// ============================================================
// IMAGE FILTER
// ============================================================

const imageFilter = (
  req,
  file,
  cb
) => {
  if (
    file.mimetype &&
    file.mimetype.startsWith(
      "image/"
    )
  ) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Only image files are allowed."
      )
    );
  }
};

// ============================================================
// MULTER
// ============================================================

const uploadImage =
  multer({
    storage:
      imageStorage,

    fileFilter:
      imageFilter,

    limits: {
      fileSize:
        15 * 1024 * 1024,
    },
  });

// ============================================================
// TEST
// ============================================================

router.get(
  "/test",
  (req, res) => {
    res.json({
      success: true,

      message:
        "Video routes are working",
    });
  }
);

// ============================================================
// GENERATE SCRIPT
// ============================================================

router.post(
  "/generate-script",
  async (
    req,
    res
  ) => {
    try {
      console.log(
        "🧠 Script generation request received"
      );

      const {
        topic,
        category,
        duration,
        language,
        style,
      } = req.body;

      // --------------------------------------------------------
      // VALIDATION
      // --------------------------------------------------------

      if (!topic) {
        return res.status(400).json({
          success: false,

          message:
            "Topic is required",
        });
      }

      if (!duration) {
        return res.status(400).json({
          success: false,

          message:
            "Duration is required",
        });
      }

      if (!language) {
        return res.status(400).json({
          success: false,

          message:
            "Language is required",
        });
      }

      // --------------------------------------------------------
      // PROJECT
      // --------------------------------------------------------

      const project = {
        topic,

        category:
          category ||
          "General",

        duration:
          Number(duration),

        language,

        style:
          style ||
          "Educational",
      };

      console.log(
        "🎬 Project:",
        project
      );

      // --------------------------------------------------------
      // OPENROUTER
      // --------------------------------------------------------

      const scenes =
        await generateStructuredScript(
          project
        );

      console.log(
        `✅ ${scenes.length} scenes generated`
      );

      // --------------------------------------------------------
      // RESPONSE
      // --------------------------------------------------------

      return res.status(200).json({
        success: true,

        message:
          "Script generated successfully",

        project,

        scenes,
      });
    } catch (error) {
      console.error(
        "❌ Script generation failed:",
        error.message
      );

      return res.status(500).json({
        success: false,

        message:
          "Script generation failed",

        error:
          error.message,
      });
    }
  }
);

// ============================================================
// PEXELS SEARCH
// ============================================================
//
// GET
// /api/videos/search-pexels?query=stock market
//
// This route searches Pexels and returns images.
//
// ============================================================

router.get(
  "/search-pexels",
  async (
    req,
    res
  ) => {
    try {
      const {
        query,
        perPage,
      } = req.query;

      // --------------------------------------------------------
      // VALIDATION
      // --------------------------------------------------------

      if (
        !query ||
        !query.trim()
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Search query is required.",
        });
      }

      const apiKey =
        process.env.PEXELS_API_KEY;

      if (!apiKey) {
        return res.status(500).json({
          success: false,

          message:
            "PEXELS_API_KEY is missing in .env",
        });
      }

      const pageSize =
        Math.min(
          Math.max(
            Number(
              perPage || 12
            ),
            1
          ),
          80
        );

      console.log(
        `🔎 Pexels search: ${query}`
      );

      // --------------------------------------------------------
      // PEXELS API
      // --------------------------------------------------------

      const pexelsUrl =
        new URL(
          "https://api.pexels.com/v1/search"
        );

      pexelsUrl.searchParams.set(
        "query",
        query
      );

      pexelsUrl.searchParams.set(
        "per_page",
        String(pageSize)
      );

      const response =
        await fetch(
          pexelsUrl,
          {
            method:
              "GET",

            headers: {
              Authorization:
                apiKey,
            },
          }
        );

      // --------------------------------------------------------
      // ERROR
      // --------------------------------------------------------

      if (
        !response.ok
      ) {
        const errorText =
          await response.text();

        console.error(
          "❌ Pexels error:",
          response.status,
          errorText
        );

        return res.status(
          response.status
        ).json({
          success: false,

          message:
            "Pexels search failed.",

          error:
            errorText,
        });
      }

      const data =
        await response.json();

      // --------------------------------------------------------
      // RESPONSE
      // --------------------------------------------------------

      const photos =
        (
          data.photos ||
          []
        ).map(
          (photo) => ({
            id:
              photo.id,

            width:
              photo.width,

            height:
              photo.height,

            url:
              photo.url,

            photographer:
              photo.photographer,

            photographerUrl:
              photo.photographer_url,

            alt:
              photo.alt || "",

            src: {
              original:
                photo.src
                  ?.original,

              large2x:
                photo.src
                  ?.large2x,

              large:
                photo.src
                  ?.large,

              medium:
                photo.src
                  ?.medium,

              small:
                photo.src
                  ?.small,

              portrait:
                photo.src
                  ?.portrait,

              landscape:
                photo.src
                  ?.landscape,

              tiny:
                photo.src
                  ?.tiny,
            },
          })
        );

      console.log(
        `✅ Pexels returned ${photos.length} images`
      );

      return res.status(200).json({
        success: true,

        query,

        totalResults:
          data.total_results ||
          0,

        photos,
      });
    } catch (error) {
      console.error(
        "❌ Pexels search failed:",
        error.message
      );

      return res.status(500).json({
        success: false,

        message:
          "Pexels search failed.",

        error:
          error.message,
      });
    }
  }
);

// ============================================================
// UPLOAD USER IMAGES
// ============================================================
//
// POST
// /api/videos/upload-image
//
// FormData:
//
// image = file
//
// Multiple files are supported.
//
// ============================================================

router.post(
  "/upload-image",
  uploadImage.array(
    "images",
    20
  ),
  async (
    req,
    res
  ) => {
    try {
      console.log(
        "📁 User image upload request received"
      );

      if (
        !req.files ||
        req.files.length ===
          0
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Please select at least one image.",
        });
      }

      // --------------------------------------------------------
      // CREATE FILE DATA
      // --------------------------------------------------------

      const images =
        req.files.map(
          (file) => ({
            id:
              `local-${Date.now()}-${Math.random()
                .toString(36)
                .slice(2)}`,

            originalName:
              file.originalname,

            fileName:
              file.filename,

            source:
              "local",

            url:
              `/images/${file.filename}`,

            duration: 5,

            mimeType:
              file.mimetype,

            size:
              file.size,
          })
        );

      console.log(
        `✅ ${images.length} image(s) uploaded`
      );

      // --------------------------------------------------------
      // RESPONSE
      // --------------------------------------------------------

      return res.status(201).json({
        success: true,

        message:
          "Images uploaded successfully.",

        images,
      });
    } catch (error) {
      console.error(
        "❌ Image upload failed:",
        error.message
      );

      return res.status(500).json({
        success: false,

        message:
          "Image upload failed.",

        error:
          error.message,
      });
    }
  }
);

// ============================================================
// CREATE COMPLETE VIDEO
// ============================================================
//
// OLD PIPELINE
//
// Keep this route for now.
// We will update the final rendering pipeline later
// to consume:
//   scenes
//   audioUrl
//   images[]
//
// ============================================================

router.post(
  "/create",
  async (
    req,
    res
  ) => {
    try {
      console.log(
        "🎬 Create video request received"
      );

      const {
        topic,
        category,
        duration,
        language,
        style,
      } = req.body;

      // --------------------------------------------------------
      // VALIDATION
      // --------------------------------------------------------

      if (!topic) {
        return res.status(400).json({
          success: false,

          message:
            "Topic is required",
        });
      }

      if (!duration) {
        return res.status(400).json({
          success: false,

          message:
            "Duration is required",
        });
      }

      if (!language) {
        return res.status(400).json({
          success: false,

          message:
            "Language is required",
        });
      }

      // --------------------------------------------------------
      // OLD COMPLETE PIPELINE
      // --------------------------------------------------------

      const result =
        await generateCompleteVideo({
          topic,

          category:
            category ||
            "General",

          duration:
            Number(duration),

          language,

          style:
            style ||
            "Educational",
        });

      // --------------------------------------------------------
      // RESPONSE
      // --------------------------------------------------------

      return res.status(200).json({
        success: true,

        message:
          "Video generated successfully",

        finalVideo:
          result.finalVideo,

        scenes:
          result.scenes,

        sceneVideos:
          result.sceneVideos,
      });
    } catch (error) {
      console.error(
        "❌ Video creation failed:",
        error.message
      );

      return res.status(500).json({
        success: false,

        message:
          "Video generation failed",

        error:
          error.message,
      });
    }
  }
);

// ============================================================
// FINAL VIDEO DATA PREVIEW
// ============================================================
//
// This endpoint does NOT render the video yet.
//
// It validates the final scene structure:
//
// scene
//   ├── narrationText
//   ├── duration
//   ├── audioUrl
//   └── images[]
//
// Later we connect this directly to FFmpeg.
//
// ============================================================

router.post(
  "/prepare-final",
  async (
    req,
    res
  ) => {
    try {
      const {
        topic,
        language,
        scenes,
      } = req.body;

      console.log("");
      console.log(
        "======================================"
      );

      console.log(
        "🎬 PREPARING FINAL VIDEO"
      );

      console.log(
        "======================================"
      );

      // --------------------------------------------------------
      // VALIDATION
      // --------------------------------------------------------

      if (
        !Array.isArray(
          scenes
        ) ||
        scenes.length ===
          0
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Scenes are required.",
        });
      }

      // --------------------------------------------------------
      // VALIDATE SCENES
      // --------------------------------------------------------

      for (
        let i = 0;
        i < scenes.length;
        i++
      ) {
        const scene =
          scenes[i];

        if (
          !scene.narrationText
        ) {
          return res.status(400).json({
            success: false,

            message:
              `Scene ${
                i + 1
              } narration is missing.`,
          });
        }

        if (
          !scene.audioUrl
        ) {
          return res.status(400).json({
            success: false,

            message:
              `Scene ${
                i + 1
              } audio is missing.`,
          });
        }

        if (
          !Array.isArray(
            scene.images
          ) ||
          scene.images.length ===
            0
        ) {
          return res.status(400).json({
            success: false,

            message:
              `Scene ${
                i + 1
              } must have at least one image.`,
          });
        }

        for (
          let j = 0;
          j <
          scene.images.length;
          j++
        ) {
          if (
            !scene.images[j].url
          ) {
            return res.status(400).json({
              success: false,

              message:
                `Scene ${
                  i + 1
                } image ${
                  j + 1
                } URL is missing.`,
            });
          }
        }
      }

      // --------------------------------------------------------
      // CALCULATE IMAGE TIME
      // --------------------------------------------------------

      const preparedScenes =
        scenes.map(
          (
            scene,
            index
          ) => {
            const imageDuration =
              (
                scene.images ||
                []
              ).reduce(
                (
                  total,
                  image
                ) =>
                  total +
                  Number(
                    image.duration ||
                      0
                  ),
                0
              );

            return {
              ...scene,

              sceneNumber:
                scene.sceneNumber ||
                index + 1,

              imageDuration,

              ready:
                imageDuration >=
                Number(
                  scene.duration ||
                    0
                ),
            };
          }
        );

      // --------------------------------------------------------
      // CHECK DURATION
      // --------------------------------------------------------

      const invalidScene =
        preparedScenes.find(
          (scene) =>
            !scene.ready
        );

      if (
        invalidScene
      ) {
        return res.status(400).json({
          success: false,

          message:
            `Scene ${
              invalidScene.sceneNumber
            } image duration is shorter than scene duration.`,

          scene:
            invalidScene,
        });
      }

      // --------------------------------------------------------
      // SUCCESS
      // --------------------------------------------------------

      console.log(
        "✅ Final video data validated"
      );

      return res.status(200).json({
        success: true,

        message:
          "Final video data is ready for rendering.",

        project: {
          topic,
          language,
        },

        scenes:
          preparedScenes,
      });
    } catch (error) {
      console.error(
        "❌ Final video preparation failed:",
        error.message
      );

      return res.status(500).json({
        success: false,

        message:
          "Final video preparation failed.",

        error:
          error.message,
      });
    }
  }
);

// ============================================================
// MULTER ERROR HANDLER
// ============================================================

router.use(
  (
    error,
    req,
    res,
    next
  ) => {
    if (
      error instanceof
      multer.MulterError
    ) {
      return res.status(400).json({
        success: false,

        message:
          error.message,
      });
    }

    if (error) {
      return res.status(400).json({
        success: false,

        message:
          error.message,
      });
    }

    next();
  }
);

// ============================================================
// EXPORT
// ============================================================

module.exports =
  router;