const fs = require("fs");
const path = require("path");

const UserVoice = require("../models/UserVoice");

// ============================================================
// VOICE DIRECTORY
// ============================================================

const VOICE_DIR = path.join(
  __dirname,
  "..",
  "public",
  "voices"
);

if (!fs.existsSync(VOICE_DIR)) {
  fs.mkdirSync(VOICE_DIR, {
    recursive: true,
  });
}

// ============================================================
// VALIDATE VOICE FILE
// ============================================================

const validateVoiceFile = (file) => {
  if (!file) {
    throw new Error(
      "Voice file is required"
    );
  }

  const allowedMimeTypes = [
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
    !allowedMimeTypes.includes(
      file.mimetype
    )
  ) {
    throw new Error(
      "Unsupported audio format. Please upload MP3, WAV, M4A, OGG or WEBM."
    );
  }

  const maxSize =
    20 * 1024 * 1024;

  if (file.size > maxSize) {
    throw new Error(
      "Voice file must be smaller than 20 MB."
    );
  }

  return true;
};

// ============================================================
// CREATE VOICE PROFILE
// ============================================================

const createUserVoice = async ({
  name,
  language,
  file,
}) => {
  try {
    console.log(
      "🎙️ Creating voice profile..."
    );

    // Validate file
    validateVoiceFile(file);

    // Voice name
    const voiceName =
      name?.trim() ||
      "My Voice";

    // File paths
    const filePath =
      file.path;

    const fileUrl =
      `/voices/${file.filename}`;

    // ========================================================
    // SAVE VOICE PROFILE
    // ========================================================

    const userVoice =
      await UserVoice.create({
        name:
          voiceName,

        filePath,

        fileUrl,

        originalFileName:
          file.originalname,

        mimeType:
          file.mimetype,

        language:
          language || "Telugu",

        duration:
          0,

        status:
          "uploaded",

        provider:
          "none",

        externalVoiceId:
          null,

        isActive:
          true,
      });

    console.log(
      "✅ Voice profile created:",
      userVoice._id.toString()
    );

    return userVoice;

  } catch (error) {

    console.error(
      "❌ Voice profile creation failed:",
      error.message
    );

    // Remove uploaded file if DB failed
    if (
      file?.path &&
      fs.existsSync(file.path)
    ) {
      try {
        fs.unlinkSync(
          file.path
        );
      } catch (deleteError) {
        console.error(
          "⚠️ Could not delete voice file:",
          deleteError.message
        );
      }
    }

    throw error;
  }
};

// ============================================================
// GET ALL VOICES
// ============================================================

const getUserVoices = async () => {

  const voices =
    await UserVoice.find({
      isActive: true,
    }).sort({
      createdAt: -1,
    });

  return voices;
};

// ============================================================
// GET SINGLE VOICE
// ============================================================

const getUserVoice = async (
  voiceId
) => {

  if (!voiceId) {
    throw new Error(
      "voiceId is required"
    );
  }

  const voice =
    await UserVoice.findOne({
      _id: voiceId,
      isActive: true,
    });

  if (!voice) {
    throw new Error(
      "Voice profile not found"
    );
  }

  return voice;
};

// ============================================================
// DELETE VOICE
// ============================================================

const deleteUserVoice = async (
  voiceId
) => {

  const voice =
    await getUserVoice(
      voiceId
    );

  // Delete physical file
  if (
    voice.filePath &&
    fs.existsSync(
      voice.filePath
    )
  ) {
    fs.unlinkSync(
      voice.filePath
    );

    console.log(
      "🗑️ Voice file deleted"
    );
  }

  // Delete MongoDB record
  await UserVoice.findByIdAndDelete(
    voice._id
  );

  console.log(
    "✅ Voice profile deleted"
  );

  return {
    success: true,

    voiceId:
      voice._id,
  };
};

// ============================================================
// SET ACTIVE VOICE
// ============================================================

const setActiveVoice = async (
  voiceId
) => {

  // Deactivate all
  await UserVoice.updateMany(
    {},
    {
      $set: {
        isActive: false,
      },
    }
  );

  // Activate selected voice
  const voice =
    await UserVoice.findByIdAndUpdate(
      voiceId,
      {
        $set: {
          isActive: true,
        },
      },
      {
        new: true,
      }
    );

  if (!voice) {
    throw new Error(
      "Voice profile not found"
    );
  }

  console.log(
    "✅ Active voice:",
    voice.name
  );

  return voice;
};

// ============================================================
// PREPARE VOICE FOR CLONING
// ============================================================

const prepareVoiceForCloning = async (
  voiceId
) => {

  const voice =
    await UserVoice.findById(
      voiceId
    );

  if (!voice) {
    throw new Error(
      "Voice profile not found"
    );
  }

  if (
    !voice.filePath ||
    !fs.existsSync(
      voice.filePath
    )
  ) {
    throw new Error(
      "Original voice file not found"
    );
  }

  await UserVoice.findByIdAndUpdate(
    voiceId,
    {
      $set: {
        status:
          "processing",
      },
    }
  );

  console.log(
    "🎙️ Voice prepared for cloning:",
    voice.name
  );

  return voice;
};

// ============================================================
// EXPORT
// ============================================================

module.exports = {
  validateVoiceFile,
  createUserVoice,
  getUserVoices,
  getUserVoice,
  deleteUserVoice,
  setActiveVoice,
  prepareVoiceForCloning,
};