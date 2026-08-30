const { OpenAI } = require("openai");
require("dotenv").config();

// Ensure the client instance is constructed perfectly
const openai = new OpenAI({
  baseURL: "https://openrouter.ai",
  apiKey: process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY,
});

// Explicitly exporting the instance so scriptService can read it
module.exports = openai;
