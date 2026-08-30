const mongoose = require("mongoose");

// ============================================================
// SCENE SCHEMA
// ============================================================

const sceneSchema = new mongoose.Schema(
  {
    sceneNumber: {
      type: Number,
      required: true,
    },

    duration: {
      type: Number,
      required: true,
      min: 1,
    },

    visualDescription: {
      type: String,
      required: true,
      trim: true,
    },

    narrationText: {
      type: String,
      required: true,
      trim: true,
    },

    // ========================================================
    // GENERATED AUDIO
    // ========================================================

    audioPath: {
      type: String,
      default: null,
    },

    audioDuration: {
      type: Number,
      default: 0,
    },

    // ========================================================
    // GENERATED IMAGE
    // ========================================================

    imagePath: {
      type: String,
      default: null,
    },

    imageUrl: {
      type: String,
      default: null,
    },

    // ========================================================
    // SCENE VIDEO
    // ========================================================

    sceneVideoPath: {
      type: String,
      default: null,
    },

    // ========================================================
    // CAPTION STATUS
    // ========================================================

    captionsGenerated: {
      type: Boolean,
      default: false,
    },
  },
  {
    _id: false,
  }
);

// ============================================================
// VIDEO PROJECT SCHEMA
// ============================================================

const videoProjectSchema = new mongoose.Schema(
  {
    // ========================================================
    // VIDEO TOPIC
    // ========================================================

    topic: {
      type: String,
      required: true,
      trim: true,
    },

    // ========================================================
    // VIDEO LANGUAGE
    // ========================================================

    language: {
      type: String,
      required: true,
      trim: true,
    },

    // ========================================================
    // VIDEO DURATION
    // Stored in minutes
    // ========================================================

    duration: {
      type: Number,
      required: true,
      min: 1,

      set: function (value) {
        if (typeof value === "string") {
          const parsed = parseInt(
            value.replace(/[^0-9]/g, ""),
            10
          );

          return Number.isNaN(parsed)
            ? value
            : parsed;
        }

        return value;
      },
    },

    // ========================================================
    // VIDEO CATEGORY
    // ========================================================

    category: {
      type: String,
      required: true,
      trim: true,
    },

    // ========================================================
    // VIDEO STYLE
    // ========================================================

    style: {
      type: String,
      required: true,
      trim: true,
    },

    // ========================================================
    // PIPELINE STATUS
    // ========================================================

    status: {
      type: String,

      enum: [
        "created",
        "script_generating",
        "script_generated",
        "voice_generating",
        "voice_generated",
        "visuals_generating",
        "visuals_generated",
        "rendering",
        "completed",
        "failed",
      ],

      default: "created",
    },

    // ========================================================
    // GENERATED VIDEO SCRIPT
    // ========================================================

    script: {
      type: [sceneSchema],
      default: [],
    },

    // ========================================================
    // FINAL VIDEO
    // ========================================================

    finalVideoPath: {
      type: String,
      default: null,
    },

    finalVideoUrl: {
      type: String,
      default: null,
    },

    // ========================================================
    // ACTUAL GENERATED DURATION
    // Stored in seconds
    // ========================================================

    actualDuration: {
      type: Number,
      default: 0,
    },

    // ========================================================
    // USER VOICE
    // ========================================================
    // Later:
    //
    // User uploads voice
    //        ↓
    // voice profile
    //        ↓
    // generated narration
    //
    // ========================================================

    voiceMode: {
      type: String,

      enum: [
        "google",
        "user",
      ],

      default: "google",
    },

    userVoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserVoice",
      default: null,
    },
  },

  {
    timestamps: true,
  }
);

// ============================================================
// MODEL
// ============================================================

const VideoProject = mongoose.model(
  "VideoProject",
  videoProjectSchema
);

module.exports = VideoProject;