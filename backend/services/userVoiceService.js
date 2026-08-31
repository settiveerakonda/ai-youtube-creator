const fs = require("fs");
const path = require("path");

const UserVoice =
  require("../models/UserVoice");

const {
  cloneVoice,
  deleteVoice,
} =
  require("./elevenLabsVoiceService");

// ======================================================
// VOICE DIRECTORY
// ======================================================

const VOICE_DIR =
  path.join(
    __dirname,
    "..",
    "public",
    "voices"
  );

if (!fs.existsSync(VOICE_DIR)) {
  fs.mkdirSync(
    VOICE_DIR,
    {
      recursive: true,
    }
  );
}

// ======================================================
// VALIDATE FILE
// ======================================================

const validateVoiceFile =
  (file) => {
    if (!file) {
      throw new Error(
        "Voice file is required."
      );
    }

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

    if (
      !allowedTypes.includes(
        file.mimetype
      )
    ) {
      throw new Error(
        "Only MP3, WAV, M4A, OGG or WEBM files are allowed."
      );
    }

    const maxSize =
      20 * 1024 * 1024;

    if (
      file.size >
      maxSize
    ) {
      throw new Error(
        "Voice file must be smaller than 20 MB."
      );
    }

    return true;
  };

// ======================================================
// CREATE + CLONE USER VOICE
// ======================================================

const createUserVoice =
  async ({
    name,
    language,
    file,
  }) => {
    validateVoiceFile(file);

    let voice;

    try {
      console.log(
        "🎙️ Creating user voice profile..."
      );

      voice =
        await UserVoice.create({
          name:
            name?.trim() ||
            "My Voice",

          filePath:
            file.path,

          fileUrl:
            `/voices/${file.filename}`,

          originalFileName:
            file.originalname,

          mimeType:
            file.mimetype,

          language:
            language ||
            "English",

          duration:
            0,

          status:
            "processing",

          provider:
            "elevenlabs",

          externalVoiceId:
            null,

          isActive:
            true,
        });

      console.log(
        "✅ UserVoice created:",
        voice._id.toString()
      );

      // ==============================================
      // CLONE WITH ELEVENLABS
      // ==============================================

      const externalVoiceId =
        await cloneVoice({
          name:
            name ||
            "My Voice",

          filePath:
            file.path,
        });

      voice.externalVoiceId =
        externalVoiceId;

      voice.provider =
        "elevenlabs";

      voice.status =
        "ready";

      await voice.save();

      console.log(
        "✅ User voice is ready:",
        voice._id.toString()
      );

      return voice;

    } catch (error) {

      console.error(
        "❌ User voice creation failed:",
        error.message
      );

      // If MongoDB record was created but
      // cloning failed, mark it failed.
      if (voice) {
        try {
          voice.status =
            "failed";

          await voice.save();
        } catch {}
      }

      throw error;
    }
  };

// ======================================================
// GET ALL VOICES
// ======================================================

const getUserVoices =
  async () => {
    return UserVoice.find({
      isActive: true,
    }).sort({
      createdAt: -1,
    });
  };

// ======================================================
// GET ONE VOICE
// ======================================================

const getUserVoice =
  async (voiceId) => {
    if (!voiceId) {
      throw new Error(
        "Voice ID is required."
      );
    }

    const voice =
      await UserVoice.findOne({
        _id: voiceId,

        isActive: true,
      });

    if (!voice) {
      throw new Error(
        "User voice not found."
      );
    }

    return voice;
  };

// ======================================================
// DELETE USER VOICE
// ======================================================

const deleteUserVoice =
  async (voiceId) => {
    const voice =
      await UserVoice.findById(
        voiceId
      );

    if (!voice) {
      throw new Error(
        "User voice not found."
      );
    }

    // Delete ElevenLabs clone
    if (
      voice.externalVoiceId
    ) {
      try {
        await deleteVoice(
          voice.externalVoiceId
        );
      } catch (error) {
        console.warn(
          "⚠️ Could not delete ElevenLabs voice:",
          error.message
        );
      }
    }

    // Delete local recording
    if (
      voice.filePath &&
      fs.existsSync(
        voice.filePath
      )
    ) {
      try {
        fs.unlinkSync(
          voice.filePath
        );
      } catch {}
    }

    await UserVoice.findByIdAndDelete(
      voiceId
    );

    return true;
  };

// ======================================================
// SET ACTIVE VOICE
// ======================================================

const setActiveVoice =
  async (voiceId) => {
    await UserVoice.updateMany(
      {},
      {
        isActive: false,
      }
    );

    const voice =
      await UserVoice.findByIdAndUpdate(
        voiceId,
        {
          isActive: true,
        },
        {
          new: true,
        }
      );

    if (!voice) {
      throw new Error(
        "User voice not found."
      );
    }

    return voice;
  };

module.exports = {
  createUserVoice,
  getUserVoices,
  getUserVoice,
  deleteUserVoice,
  setActiveVoice,
};