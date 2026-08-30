const fs = require("fs");
const path = require("path");
const googleTTS = require("google-tts-api");

// ======================================================
// DIRECTORIES
// ======================================================

const AUDIO_DIR = path.join(
  __dirname,
  "..",
  "public",
  "audio"
);

const USER_VOICE_DIR = path.join(
  __dirname,
  "..",
  "public",
  "voices"
);

fs.mkdirSync(AUDIO_DIR, {
  recursive: true,
});

fs.mkdirSync(USER_VOICE_DIR, {
  recursive: true,
});

// ======================================================
// GOOGLE TTS
// ======================================================

const generateGoogleVoice = async ({
  text,
  language = "te",
  sceneNumber,
}) => {
  try {
    if (!text || !text.trim()) {
      throw new Error(
        "Narration text is required"
      );
    }

    console.log(
      `🎙️ Generating ${language} voice for Scene ${sceneNumber}...`
    );

    const audioParts =
      await googleTTS.getAllAudioBase64(
        text,
        {
          lang: language,
          slow: false,
          host: "https://translate.google.com",
        }
      );

    console.log(
      `✅ Scene ${sceneNumber}: received ${audioParts.length} audio parts`
    );

    const outputFile =
      path.join(
        AUDIO_DIR,
        `voice_scene_${sceneNumber}_${Date.now()}.mp3`
      );

    const buffers =
      audioParts.map((part) =>
        Buffer.from(
          part.base64,
          "base64"
        )
      );

    fs.writeFileSync(
      outputFile,
      Buffer.concat(buffers)
    );

    console.log(
      `✅ Audio saved: ${path.basename(outputFile)}`
    );

    return outputFile;

  } catch (error) {
    console.error(
      `❌ Voice generation failed for Scene ${sceneNumber}:`,
      error.message
    );

    throw error;
  }
};

// ======================================================
// SAVE USER VOICE
// ======================================================
//
// Later the frontend will upload:
//
// user voice sample
//       ↓
// this function
//       ↓
// public/voices/user-id/
//

const saveUserVoice = ({
  userId,
  sourceFile,
}) => {
  try {
    if (!userId) {
      throw new Error(
        "User ID is required"
      );
    }

    if (!sourceFile) {
      throw new Error(
        "Voice file is required"
      );
    }

    const userVoiceDir =
      path.join(
        USER_VOICE_DIR,
        String(userId)
      );

    fs.mkdirSync(
      userVoiceDir,
      {
        recursive: true,
      }
    );

    const extension =
      path.extname(sourceFile) ||
      ".mp3";

    const destination =
      path.join(
        userVoiceDir,
        `voice${extension}`
      );

    fs.copyFileSync(
      sourceFile,
      destination
    );

    console.log(
      `🎤 User voice saved: ${destination}`
    );

    return destination;

  } catch (error) {
    console.error(
      "❌ Saving user voice failed:",
      error.message
    );

    throw error;
  }
};

// ======================================================
// GET USER VOICE
// ======================================================

const getUserVoice = (userId) => {

  if (!userId) {
    return null;
  }

  const userDir =
    path.join(
      USER_VOICE_DIR,
      String(userId)
    );

  if (!fs.existsSync(userDir)) {
    return null;
  }

  const files =
    fs.readdirSync(userDir);

  const voiceFile =
    files.find((file) =>
      /\.(mp3|wav|m4a|ogg)$/i.test(
        file
      )
    );

  if (!voiceFile) {
    return null;
  }

  return path.join(
    userDir,
    voiceFile
  );
};

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  generateGoogleVoice,
  saveUserVoice,
  getUserVoice,
};