const axios = require("axios");
const fs = require("fs");
const path = require("path");

// ======================================================
// IMAGE DIRECTORY
// ======================================================

const IMAGE_DIR = path.join(
  __dirname,
  "..",
  "public",
  "images"
);

fs.mkdirSync(IMAGE_DIR, {
  recursive: true,
});

// ======================================================
// PEXELS API KEY
// ======================================================

const PEXELS_API_KEY =
  process.env.PEXELS_API_KEY;

if (!PEXELS_API_KEY) {
  console.warn(
    "⚠️ PEXELS_API_KEY is not configured"
  );
}

// ======================================================
// SEARCH PEXELS
// ======================================================

const searchPexelsImage = async ({
  query,
}) => {
  try {
    if (!query) {
      throw new Error(
        "Pexels search query is required"
      );
    }

    console.log(
      `🔎 Pexels search: ${query}`
    );

    const response =
      await axios.get(
        "https://api.pexels.com/v1/search",
        {
          headers: {
            Authorization:
              PEXELS_API_KEY,
          },

          params: {
            query,
            per_page: 10,
            orientation: "landscape",
          },

          timeout: 20000,
        }
      );

    const photos =
      response.data?.photos || [];

    if (!photos.length) {
      throw new Error(
        `No Pexels images found for: ${query}`
      );
    }

    // Prefer large landscape image
    const selectedPhoto =
      photos.find(
        (photo) =>
          photo?.src?.landscape ||
          photo?.src?.large2x
      ) || photos[0];

    console.log(
      `✅ Selected Pexels photo ID: ${selectedPhoto.id}`
    );

    return {
      id: selectedPhoto.id,

      photographer:
        selectedPhoto.photographer,

      url:
        selectedPhoto.src?.large2x ||
        selectedPhoto.src?.large ||
        selectedPhoto.src?.landscape ||
        selectedPhoto.src?.original,
    };

  } catch (error) {
    console.error(
      "❌ Pexels search failed:",
      error.response?.data ||
        error.message
    );

    throw error;
  }
};

// ======================================================
// DOWNLOAD IMAGE
// ======================================================

const downloadImage = async ({
  imageUrl,
  sceneNumber,
}) => {
  try {
    if (!imageUrl) {
      throw new Error(
        "Image URL is required"
      );
    }

    const fileName =
      `scene_${sceneNumber}_${Date.now()}.jpg`;

    const outputPath =
      path.join(
        IMAGE_DIR,
        fileName
      );

    console.log(
      `⬇️ Downloading image for Scene ${sceneNumber}...`
    );

    const response =
      await axios.get(
        imageUrl,
        {
          responseType:
            "arraybuffer",

          timeout: 30000,
        }
      );

    fs.writeFileSync(
      outputPath,
      response.data
    );

    console.log(
      `✅ Scene ${sceneNumber} image saved`
    );

    return outputPath;

  } catch (error) {
    console.error(
      `❌ Image download failed for Scene ${sceneNumber}:`,
      error.message
    );

    throw error;
  }
};

// ======================================================
// CREATE SEARCH QUERY
// ======================================================

const createImageSearchQuery = ({
  visualDescription,
  category,
  topic,
}) => {

  const description =
    String(
      visualDescription || ""
    )
      .replace(
        /[^\w\s₹-]/g,
        " "
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim();

  const categoryText =
    category
      ? String(category)
      : "";

  const topicText =
    topic
      ? String(topic)
      : "";

  // Keep query reasonably short
  const query =
    `${categoryText} ${topicText} ${description}`
      .trim()
      .substring(0, 180);

  return query;
};

// ======================================================
// GENERATE SCENE IMAGE
// ======================================================

const generateSceneImage = async ({
  scene,
  topic,
  category,
}) => {

  console.log(
    `🖼️ Finding image for Scene ${scene.sceneNumber}...`
  );

  const query =
    createImageSearchQuery({
      visualDescription:
        scene.visualDescription,

      category,

      topic,
    });

  const image =
    await searchPexelsImage({
      query,
    });

  const imagePath =
    await downloadImage({
      imageUrl:
        image.url,

      sceneNumber:
        scene.sceneNumber,
    });

  return {
    imagePath,

    imageUrl:
      image.url,

    photographer:
      image.photographer,

    pexelsId:
      image.id,

    searchQuery:
      query,
  };
};

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  searchPexelsImage,
  downloadImage,
  createImageSearchQuery,
  generateSceneImage,
};