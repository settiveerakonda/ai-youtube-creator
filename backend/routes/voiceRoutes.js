const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const {
  createUserVoice,
  getUserVoices,
  getUserVoice,
  deleteUserVoice,
  setActiveVoice,
} = require("../services/userVoiceService");

const router =
  express.Router();

// ======================================================
// DIRECTORIES
// ======================================================

const VOICE_DIR =
  path.join(
    __dirname,
    "..",
    "public",
    "voices"
  );

const AUDIO_DIR =
  path.join(
    __dirname,
    "..",
    "public",
    "audio"
  );

fs.mkdirSync(
  VOICE_DIR,
  {
    recursive: true,
  }
);

fs.mkdirSync(
  AUDIO_DIR,
  {
    recursive: true,
  }
);

// ======================================================
// MULTER
// ======================================================

const storage =
  multer.diskStorage({
    destination:
      (req, file, cb) => {
        cb(
          null,
          VOICE_DIR
        );
      },

    filename:
      (req, file, cb) => {
        const extension =
          path.extname(
            file.originalname
          ) || ".webm";

        cb(
          null,
          `voice_${Date.now()}${extension}`
        );
      },
  });

const upload =
  multer({
    storage,

    limits: {
      fileSize:
        20 * 1024 * 1024,
    },

    fileFilter:
      (req, file, cb) => {
        const allowed = [
          "audio/mpeg",
          "audio/mp3",
          "audio/wav",
          "audio/x-wav",
          "audio/mp4",
          "audio/m4a",
          "audio/ogg",
          "audio/webm",
        ];

        if (
          allowed.includes(
            file.mimetype
          )
        ) {
          cb(null, true);
        } else {
          cb(
            new Error(
              "Only MP3, WAV, M4A, OGG or WEBM audio is allowed."
            )
          );
        }
      },
  });

// ======================================================
// UPLOAD + CLONE MY VOICE
// ======================================================

router.post(
  "/upload",
  upload.single("voice"),
  async (req, res) => {
    try {
      console.log(
        "======================================"
      );

      console.log(
        "🎙️ MY VOICE UPLOAD"
      );

      console.log(
        "======================================"
      );

      if (!req.file) {
        return res.status(400).json({
          success: false,

          message:
            "Please record or upload a voice sample.",
        });
      }

      const voice =
        await createUserVoice({
          name:
            req.body.name ||
            "My Voice",

          language:
            req.body.language ||
            "English",

          file:
            req.file,
        });

      return res.status(201).json({
        success: true,

        message:
          "Your voice was cloned successfully.",

        voice: {
          id:
            voice._id,

          name:
            voice.name,

          language:
            voice.language,

          status:
            voice.status,

          provider:
            voice.provider,

          externalVoiceId:
            voice.externalVoiceId,

          fileUrl:
            voice.fileUrl,
        },

        voiceId:
          voice._id.toString(),
      });

    } catch (error) {
      console.error(
        "❌ Voice upload error:",
        error.message
      );

      if (
        req.file?.path &&
        fs.existsSync(
          req.file.path
        )
      ) {
        try {
          fs.unlinkSync(
            req.file.path
          );
        } catch {}
      }

      return res.status(500).json({
        success: false,

        message:
          error.message ||
          "Voice upload failed.",
      });
    }
  }
);

// ======================================================
// GET MY VOICES
// ======================================================

router.get(
  "/my-voices",
  async (req, res) => {
    try {
      const voices =
        await getUserVoices();

      return res.json({
        success: true,

        voices:
          voices.map(
            (voice) => ({
              id:
                voice._id,

              name:
                voice.name,

              language:
                voice.language,

              status:
                voice.status,

              provider:
                voice.provider,

              externalVoiceId:
                voice.externalVoiceId,

              fileUrl:
                voice.fileUrl,

              isActive:
                voice.isActive,
            })
          ),
      });

    } catch (error) {
      return res.status(500).json({
        success: false,

        message:
          error.message,
      });
    }
  }
);

// ======================================================
// GET ONE VOICE
// ======================================================

router.get(
  "/:voiceId",
  async (req, res) => {
    try {
      const voice =
        await getUserVoice(
          req.params.voiceId
        );

      return res.json({
        success: true,

        voice,
      });

    } catch (error) {
      return res.status(404).json({
        success: false,

        message:
          error.message,
      });
    }
  }
);

// ======================================================
// SET ACTIVE
// ======================================================

router.put(
  "/:voiceId/active",
  async (req, res) => {
    try {
      const voice =
        await setActiveVoice(
          req.params.voiceId
        );

      return res.json({
        success: true,

        voice,
      });

    } catch (error) {
      return res.status(500).json({
        success: false,

        message:
          error.message,
      });
    }
  }
);

// ======================================================
// DELETE
// ======================================================

router.delete(
  "/:voiceId",
  async (req, res) => {
    try {
      await deleteUserVoice(
        req.params.voiceId
      );

      return res.json({
        success: true,

        message:
          "Voice deleted successfully.",
      });

    } catch (error) {
      return res.status(500).json({
        success: false,

        message:
          error.message,
      });
    }
  }
);

// ======================================================
// GENERATE VIDEO AUDIO
// ======================================================

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

      if (
        !Array.isArray(
          scenes
        ) ||
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
            "voiceType must be ai or user.",
        });
      }

      // ==================================================
      // RESOLVE VOICE
      // ==================================================

      let elevenLabsVoiceId =
        voiceId;

      let selectedUserVoice =
        null;

      if (
        voiceType === "user"
      ) {
        if (!userVoiceId) {
          return res.status(400).json({
            success: false,
            message:
              "Please select your voice.",
          });
        }

        selectedUserVoice =
          await getUserVoice(
            userVoiceId
          );

        if (
          selectedUserVoice.status !==
          "ready"
        ) {
          return res.status(400).json({
            success: false,

            message:
              "Your voice is not ready yet. Please record your voice again or wait until cloning is complete.",
          });
        }

        if (
          !selectedUserVoice.externalVoiceId
        ) {
          return res.status(400).json({
            success: false,

            message:
              "No cloned voice ID is available for this voice.",
          });
        }

        elevenLabsVoiceId =
          selectedUserVoice.externalVoiceId;

        console.log(
          "👤 Using cloned user voice:",
          elevenLabsVoiceId
        );
      }

      // ==================================================
      // AI VOICE
      // ==================================================

      if (
        voiceType === "ai" &&
        !elevenLabsVoiceId
      ) {
        return res.status(400).json({
          success: false,
          message:
            "AI voice ID is required.",
        });
      }

      const apiKey =
        process.env.ELEVENLABS_API_KEY;

      if (!apiKey) {
        return res.status(500).json({
          success: false,
          message:
            "ELEVENLABS_API_KEY is missing.",
        });
      }

      // ==================================================
      // GENERATE SCENE AUDIO
      // ==================================================

      const generatedScenes =
        [];

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
            scene.narrationText ||
              ""
          ).trim();

        if (!narration) {
          throw new Error(
            `Scene ${sceneNumber} narration is empty.`
          );
        }

        console.log(
          `🎙️ Generating ${
            voiceType === "user"
              ? "USER"
              : "AI"
          } voice for Scene ${sceneNumber}...`
        );

        const response =
          await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${elevenLabsVoiceId}`,
            {
              method: "POST",

              headers: {
                "xi-api-key":
                  apiKey,

                "Content-Type":
                  "application/json",

                Accept:
                  "audio/mpeg",
              },

              body: JSON.stringify({
                text:
                  narration,

                // Supports English,
                // Telugu and Hindi.
                model_id:
                  "eleven_multilingual_v2",

                voice_settings: {
                  stability:
                    0.5,

                  similarity_boost:
                    0.75,

                  style:
                    0,

                  use_speaker_boost:
                    true,
                },
              }),
            }
          );

        if (!response.ok) {
          const errorBody =
            await response.text();

          throw new Error(
            `ElevenLabs TTS failed for Scene ${sceneNumber}: ${errorBody}`
          );
        }
   
        const audioBuffer =
          Buffer.from(
            await response.arrayBuffer()
          );

        const audioFileName =
          `video_scene_${sceneNumber}_${Date.now()}.mp3`;

        const audioFilePath =
          path.join(
            AUDIO_DIR,
            audioFileName
          );

        fs.writeFileSync(
          audioFilePath,
          audioBuffer
        );

        const audioUrl =
          `/audio/${audioFileName}`;

        generatedScenes.push({
          ...scene,

          sceneNumber,

          audioUrl,

          audioPath:
            audioFilePath,

          voiceType,

          language:
            language ||
            "English",
        });

        console.log(
          `✅ Scene ${sceneNumber} audio saved`
        );
      }

      return res.json({
        success: true,

        message:
          "Audio generated successfully.",

        scenes:
          generatedScenes,

        voiceType,

        language:
          language ||
          "English",

        voiceId:
          elevenLabsVoiceId,

        userVoiceId:
          voiceType === "user"
            ? userVoiceId
            : null,
      });

    } catch (error) {
      console.error(
        "❌ Video audio generation failed:",
        error.message
      );

      return res.status(500).json({
        success: false,

        message:
          error.message ||
          "Audio generation failed.",
      });
    }
  }
);

module.exports = router;