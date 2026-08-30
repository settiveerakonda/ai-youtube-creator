const mongoose = require("mongoose");

// ============================================================
// USER VOICE SCHEMA
// ============================================================

const userVoiceSchema = new mongoose.Schema(
  {
    // ========================================================
    // VOICE NAME
    // ========================================================

    name: {
      type: String,
      required: true,
      trim: true,
    },

    // ========================================================
    // ORIGINAL VOICE FILE
    // ========================================================

    filePath: {
      type: String,
      required: true,
    },

    fileUrl: {
      type: String,
      default: null,
    },

    originalFileName: {
      type: String,
      default: null,
    },

    mimeType: {
      type: String,
      default: null,
    },

    // ========================================================
    // AUDIO INFORMATION
    // ========================================================

    duration: {
      type: Number,
      default: 0,
    },

    language: {
      type: String,
      default: "Telugu",
      trim: true,
    },

    // ========================================================
    // VOICE STATUS
    // ========================================================

    status: {
      type: String,

      enum: [
        "uploaded",
        "processing",
        "ready",
        "failed",
      ],

      default: "uploaded",
    },

    // ========================================================
    // VOICE PROVIDER
    // ========================================================

    provider: {
      type: String,

      enum: [
        "none",
        "elevenlabs",
        "other",
      ],

      default: "none",
    },

    // ========================================================
    // CLONED VOICE ID
    // ========================================================

    externalVoiceId: {
      type: String,
      default: null,
    },

    // ========================================================
    // ACTIVE
    // ========================================================

    isActive: {
      type: Boolean,
      default: true,
    },
  },

  {
    timestamps: true,
  }
);

// ============================================================
// MODEL
// ============================================================

const UserVoice = mongoose.model(
  "UserVoice",
  userVoiceSchema
);

module.exports = UserVoice;