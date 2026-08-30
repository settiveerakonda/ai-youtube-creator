const axios = require("axios");

const API_KEY =
  process.env.ELEVENLABS_API_KEY;

async function testElevenLabs() {
  try {
    if (!API_KEY) {
      throw new Error(
        "ELEVENLABS_API_KEY is missing in .env"
      );
    }

    console.log("🔑 ElevenLabs key loaded:", true);

    const response = await axios.get(
      "https://api.elevenlabs.io/v1/voices",
      {
        headers: {
          "xi-api-key": API_KEY,
        },
      }
    );

    console.log(
      "✅ ElevenLabs connection successful"
    );

    console.log(
      `🎙️ Available voices: ${response.data.voices.length}`
    );

    response.data.voices
      .slice(0, 5)
      .forEach((voice, index) => {
        console.log(
          `${index + 1}. ${voice.name} → ${voice.voice_id}`
        );
      });

    return response.data;

  } catch (error) {

    console.error(
      "❌ ElevenLabs connection failed"
    );

    console.error(
      error.response?.data ||
        error.message
    );

    throw error;
  }
}

module.exports = {
  testElevenLabs,
};