const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const googleTTS = require("google-tts-api");

const {
  createUserVoice,
  getUserVoices,
  getUserVoice,
  deleteUserVoice,
  setActiveVoice,
} = require("../services/userVoiceService");

const router = express.Router();

// ============================================================
// VOICE DIRECTORY
// ============================================================

const VOICE_DIR = path.join(
  __dirname,
  "..",
  "public",
  "voices"
);

const AUDIO_DIR = path.join(
  __dirname,
  "..",
  "public",
  "audio"
);

fs.mkdirSync(VOICE_DIR, {
  recursive: true,
});

fs.mkdirSync(AUDIO_DIR, {
  recursive: true,
});

// ============================================================
// MULTER STORAGE
// ============================================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, VOICE_DIR);
  },

  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname);

    const fileName =
      `voice_${Date.now()}${extension}`;

    cb(null, fileName);
  },
});

// ============================================================
// FILE FILTER
// ============================================================

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/x-wav",
    "audio/mp4",
    "audio/m4a",
    "audio/ogg",
    "audio/webm",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("Only audio files are allowed")
    );
  }
};

// ============================================================
// MULTER
// ============================================================

const upload = multer({
  storage,
  fileFilter,

  limits: {
    fileSize: 20 * 1024 * 1024,
  },
});

// ============================================================
// UPLOAD USER VOICE
// ============================================================

router.post(
  "/upload",
  upload.single("voice"),
  async (req, res) => {
    try {
      const {
        userId,
        name,
        language,
      } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "userId is required",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Voice file is required",
        });
      }

      const voice =
        await createUserVoice({
          userId,
          name,
          language,
          file: req.file,
        });

      return res.status(201).json({
        success: true,

        message:
          "Voice uploaded successfully",

        voice: {
          id: voice._id,
          name: voice.name,
          fileUrl: voice.fileUrl,
          language: voice.language,
          status: voice.status,
        },
      });
    } catch (error) {
      console.error(
        "❌ Voice upload error:",
        error.message
      );

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

// ============================================================
// GET USER VOICES
// ============================================================

router.get(
  "/user/:userId",
  async (req, res) => {
    try {
      const voices =
        await getUserVoices(
          req.params.userId
        );

      return res.json({
        success: true,
        voices,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

// ============================================================
// GET SINGLE VOICE
// ============================================================

router.get(
  "/:userId/:voiceId",
  async (req, res) => {
    try {
      const voice =
        await getUserVoice({
          userId:
            req.params.userId,

          voiceId:
            req.params.voiceId,
        });

      return res.json({
        success: true,
        voice,
      });
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
  }
);

// ============================================================
// SET ACTIVE VOICE
// ============================================================

router.put(
  "/:userId/:voiceId/activate",
  async (req, res) => {
    try {
      const voice =
        await setActiveVoice({
          userId:
            req.params.userId,

          voiceId:
            req.params.voiceId,
        });

      return res.json({
        success: true,

        message:
          "Voice activated successfully",

        voice,
      });
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
  }
);

// ============================================================
// DELETE VOICE
// ============================================================

router.delete(
  "/:userId/:voiceId",
  async (req, res) => {
    try {
      const result =
        await deleteUserVoice({
          userId:
            req.params.userId,

          voiceId:
            req.params.voiceId,
        });

      return res.json(result);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
  }
);

// ============================================================
// GOOGLE TTS FALLBACK
// ============================================================

const generateGoogleFallbackVoice = async ({
  text,
  language,
  sceneNumber,
}) => {
  console.log(
    `🆓 Using Google TTS fallback for Scene ${sceneNumber}...`
  );

  const lang =
    String(language || "")
      .toLowerCase()
      .includes("telugu")
      ? "te"
      : "en";

  const audioParts =
    await googleTTS.getAllAudioBase64(
      text,
      {
        lang,
        slow: false,
        host: "https://translate.google.com",
        timeout: 30000,
      }
    );

  if (
    !audioParts ||
    !Array.isArray(audioParts) ||
    audioParts.length === 0
  ) {
    throw new Error(
      `Google TTS returned no audio for Scene ${sceneNumber}`
    );
  }

  const timestamp = Date.now();

  const tempFiles = [];

  try {
    // --------------------------------------------------------
    // SAVE GOOGLE TTS PARTS
    // --------------------------------------------------------

    for (
      let i = 0;
      i < audioParts.length;
      i++
    ) {
      const tempName =
        `google_scene_${sceneNumber}_part_${i}_${timestamp}.mp3`;

      const tempPath =
        path.join(
          AUDIO_DIR,
          tempName
        );

      fs.writeFileSync(
        tempPath,
        Buffer.from(
          audioParts[i].base64,
          "base64"
        )
      );

      tempFiles.push(tempPath);
    }

    // --------------------------------------------------------
    // CONCAT FILE
    // --------------------------------------------------------

    const finalName =
      `video_scene_${sceneNumber}_${timestamp}_google.mp3`;

    const finalPath =
      path.join(
        AUDIO_DIR,
        finalName
      );

    // For a single Google chunk, directly use it.
    if (tempFiles.length === 1) {
      fs.copyFileSync(
        tempFiles[0],
        finalPath
      );
    } else {
      // Use ffmpeg from server.js indirectly is not available here,
      // so use Node child_process.
      const { execFile } =
        require("child_process");

      const ffmpegPath =
        require("ffmpeg-static");

      const concatFile =
        path.join(
          AUDIO_DIR,
          `google_concat_${sceneNumber}_${timestamp}.txt`
        );

      const concatContent =
        tempFiles
          .map(
            (file) =>
              `file '${file
                .replace(/\\/g, "/")
                .replace(
                  /'/g,
                  "'\\''"
                )}'`
          )
          .join("\n");

      fs.writeFileSync(
        concatFile,
        concatContent,
        "utf8"
      );

      await new Promise(
        (resolve, reject) => {
          execFile(
            ffmpegPath,
            [
              "-y",
              "-f",
              "concat",
              "-safe",
              "0",
              "-i",
              concatFile,
              "-c:a",
              "libmp3lame",
              "-b:a",
              "128k",
              finalPath,
            ],
            {
              windowsHide: true,
            },
            (error, stdout, stderr) => {
              if (error) {
                console.error(
                  "❌ Google TTS FFmpeg error:",
                  stderr
                );

                return reject(error);
              }

              resolve();
            }
          );
        }
      );

      if (fs.existsSync(concatFile)) {
        fs.unlinkSync(concatFile);
      }
    }

    console.log(
      `✅ Google TTS audio saved: ${finalName}`
    );

    return {
      audioFileName: finalName,
      audioFilePath: finalPath,
      audioUrl:
        `/audio/${finalName}`,
    };
  } finally {
    // --------------------------------------------------------
    // CLEAN TEMP GOOGLE FILES
    // --------------------------------------------------------

    for (const file of tempFiles) {
      if (fs.existsSync(file)) {
        try {
          fs.unlinkSync(file);
        } catch (error) {
          console.warn(
            `⚠️ Could not remove temp audio: ${file}`
          );
        }
      }
    }
  }
};

// ============================================================
// GENERATE VIDEO AUDIO
// ============================================================

router.post(
  "/generate-video-audio",
  async (req, res) => {
    try {
      const {
        scenes,
        voiceType,
        voiceId,
        userVoiceId,
        language,
      } = req.body;

      console.log("");
      console.log(
        "======================================"
      );
      console.log(
        "🎙️ VIDEO AUDIO GENERATION STARTED"
      );
      console.log(
        "======================================"
      );

      // ======================================================
      // VALIDATION
      // ======================================================

      if (
        !Array.isArray(scenes) ||
        scenes.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Scenes are required.",
        });
      }

      if (
        voiceType !== "ai" &&
        voiceType !== "user"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "voiceType must be 'ai' or 'user'.",
        });
      }

      // ======================================================
      // USER VOICE
      // ======================================================

      if (voiceType === "user") {
        if (!userVoiceId) {
          return res.status(400).json({
            success: false,
            message:
              "User voice ID is required.",
          });
        }

        console.log(
          "👤 Selected user voice:",
          userVoiceId
        );

        return res.status(400).json({
          success: false,
          message:
            "User voice audio generation is not connected yet. AI voice is ready. We will connect the local/user voice pipeline separately.",
        });
      }

      // ======================================================
      // AI VOICE
      // ======================================================

      if (!voiceId) {
        return res.status(400).json({
          success: false,
          message:
            "AI voice ID is required.",
        });
      }

      console.log(
        "🤖 Selected AI voice:",
        voiceId
      );

      const ELEVENLABS_API_KEY =
        process.env.ELEVENLABS_API_KEY;

      const generatedScenes = [];

      // ======================================================
      // GENERATE EACH SCENE
      // ======================================================

      for (
        let index = 0;
        index < scenes.length;
        index++
      ) {
        const scene =
          scenes[index];

        const sceneNumber =
          scene.sceneNumber ||
          index + 1;

        const narration =
          String(
            scene.narrationText || ""
          ).trim();

        if (!narration) {
          throw new Error(
            `Scene ${sceneNumber} narration is empty.`
          );
        }

        console.log(
          `🎙️ Generating AI voice for Scene ${sceneNumber}...`
        );

        let audioFileName = null;
        let audioFilePath = null;
        let audioUrl = null;
        let actualVoiceType = "ai";
        let actualProvider = "ElevenLabs";

        // ====================================================
        // TRY ELEVENLABS
        // ====================================================

        if (ELEVENLABS_API_KEY) {
          try {
            const elevenLabsUrl =
              `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

            const elevenResponse =
              await fetch(
                elevenLabsUrl,
                {
                  method: "POST",

                  headers: {
                    "xi-api-key":
                      ELEVENLABS_API_KEY,

                    "Content-Type":
                      "application/json",

                    Accept:
                      "audio/mpeg",
                  },

                  body: JSON.stringify({
                    text: narration,

                    model_id:
                      "eleven_multilingual_v2",

                    voice_settings: {
                      stability: 0.5,

                      similarity_boost: 0.75,

                      style: 0.0,

                      use_speaker_boost:
                        true,
                    },
                  }),
                }
              );

            // ==================================================
            // ELEVENLABS FAILED
            // ==================================================

            if (!elevenResponse.ok) {
              let errorBody = "";

              try {
                errorBody =
                  await elevenResponse.text();
              } catch {
                errorBody =
                  "Unknown ElevenLabs error";
              }

              console.warn("");
              console.warn(
                "⚠️ ElevenLabs failed."
              );

              console.warn(
                "Status:",
                elevenResponse.status
              );

              console.warn(
                "Response:",
                errorBody
              );

              console.warn(
                "🆓 Falling back to Google TTS..."
              );
            } else {
              // ================================================
              // ELEVENLABS SUCCESS
              // ================================================

              const audioBuffer =
                Buffer.from(
                  await elevenResponse.arrayBuffer()
                );

              audioFileName =
                `video_scene_${sceneNumber}_${Date.now()}.mp3`;

              audioFilePath =
                path.join(
                  AUDIO_DIR,
                  audioFileName
                );

              fs.writeFileSync(
                audioFilePath,
                audioBuffer
              );

              audioUrl =
                `/audio/${audioFileName}`;

              actualProvider =
                "ElevenLabs";

              console.log(
                `✅ Scene ${sceneNumber} ElevenLabs audio saved: ${audioFileName}`
              );
            }
          } catch (elevenError) {
            console.warn("");
            console.warn(
              `⚠️ ElevenLabs request failed for Scene ${sceneNumber}:`
            );

            console.warn(
              elevenError.message
            );

            console.warn(
              "🆓 Falling back to Google TTS..."
            );
          }
        } else {
          console.warn(
            "⚠️ ELEVENLABS_API_KEY not found."
          );

          console.warn(
            "🆓 Using Google TTS directly."
          );
        }

        // ====================================================
        // GOOGLE TTS FALLBACK
        // ====================================================

        if (
          !audioFilePath ||
          !fs.existsSync(audioFilePath)
        ) {
          const fallback =
            await generateGoogleFallbackVoice({
              text: narration,
              language,
              sceneNumber,
            });

          audioFileName =
            fallback.audioFileName;

          audioFilePath =
            fallback.audioFilePath;

          audioUrl =
            fallback.audioUrl;

          actualProvider =
            "Google TTS";

          actualVoiceType =
            "ai";

          console.log(
            `✅ Scene ${sceneNumber} fallback audio ready`
          );
        }

        // ====================================================
        // RETURN SCENE
        // ====================================================

        generatedScenes.push({
          ...scene,

          audioUrl,

          audioFileName,

          audioPath:
            audioFilePath,

          voiceType:
            actualVoiceType,

          voiceId,

          voiceProvider:
            actualProvider,

          language:
            language || "Telugu",
        });
      }

      // ========================================================
      // COMPLETE
      // ========================================================

      console.log(
        "======================================"
      );

      console.log(
        "🎉 ALL SCENE AUDIO GENERATED"
      );

      console.log(
        "======================================"
      );

      return res.status(200).json({
        success: true,

        message:
          "Audio generated successfully.",

        voiceType,

        voiceId,

        scenes:
          generatedScenes,

        totalScenes:
          generatedScenes.length,
      });
    } catch (error) {
      console.error("");
      console.error(
        "❌ VIDEO AUDIO GENERATION FAILED"
      );

      console.error(
        error.message
      );

      return res.status(500).json({
        success: false,

        message:
          "Audio generation failed.",

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
  (error, req, res, next) => {
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

module.exports = router;