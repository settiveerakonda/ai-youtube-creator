const fs = require("fs");

const ELEVENLABS_API_URL =
  "https://api.elevenlabs.io/v1";

const getApiKey = () => {
  const key =
    process.env.ELEVENLABS_API_KEY;

  if (!key) {
    throw new Error(
      "ELEVENLABS_API_KEY is missing in .env"
    );
  }

  return key;
};

// ======================================================
// CLONE USER VOICE
// ======================================================

const cloneVoice = async ({
  name,
  filePath,
}) => {
  const apiKey = getApiKey();

  if (!filePath) {
    throw new Error(
      "Voice file path is required."
    );
  }

  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Voice file not found: ${filePath}`
    );
  }

  console.log(
    "🎙️ Sending voice sample to ElevenLabs..."
  );

  const fileBuffer =
    fs.readFileSync(filePath);

  const blob = new Blob([
    fileBuffer,
  ]);

  const formData =
    new FormData();

  formData.append(
    "name",
    name || "My Voice"
  );

  formData.append(
    "files",
    blob,
    "voice.webm"
  );

  const response =
    await fetch(
      `${ELEVENLABS_API_URL}/voices/add`,
      {
        method: "POST",

        headers: {
          "xi-api-key":
            apiKey,
        },

        body: formData,
      }
    );

  const responseText =
    await response.text();

  if (!response.ok) {
    console.error(
      "❌ ElevenLabs clone failed:"
    );

    console.error(
      "Status:",
      response.status
    );

    console.error(
      "Response:",
      responseText
    );

    throw new Error(
      `ElevenLabs voice cloning failed: ${responseText}`
    );
  }

  let data;

  try {
    data =
      JSON.parse(
        responseText
      );
  } catch {
    throw new Error(
      "ElevenLabs returned invalid JSON."
    );
  }

  if (!data.voice_id) {
    throw new Error(
      "ElevenLabs did not return a voice_id."
    );
  }

  console.log(
    "✅ ElevenLabs cloned voice:",
    data.voice_id
  );

  return data.voice_id;
};

// ======================================================
// DELETE CLONED VOICE
// ======================================================

const deleteVoice =
  async (voiceId) => {
    const apiKey =
      getApiKey();

    const response =
      await fetch(
        `${ELEVENLABS_API_URL}/voices/${encodeURIComponent(
          voiceId
        )}`,
        {
          method: "DELETE",

          headers: {
            "xi-api-key":
              apiKey,
          },
        }
      );

    if (
      !response.ok &&
      response.status !== 404
    ) {
      const body =
        await response.text();

      throw new Error(
        `ElevenLabs voice deletion failed: ${body}`
      );
    }

    return true;
  };

module.exports = {
  cloneVoice,
  deleteVoice,
};