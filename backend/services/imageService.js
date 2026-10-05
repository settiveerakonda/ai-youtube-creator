const fs = require("fs");
const path = require("path");
const axios = require("axios");

const {
  getMarketDataForScene,
} = require("./marketDataService");

const {
  generateMarketDataCard,
} = require("./dataCardService");

// ============================================================
// DIRECTORIES
// ============================================================

const IMAGE_DIR = path.join(
  __dirname,
  "..",
  "public",
  "images"
);

fs.mkdirSync(IMAGE_DIR, {
  recursive: true,
});

// ============================================================
// TEXT HELPERS
// ============================================================

const normalizeText = (text) => {
  return String(text || "")
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const extractKeywords = (text) => {
  return normalizeText(text)
    .split(/\s+/)
    .filter((word) => word.length >= 3);
};

// ============================================================
// VISUAL KEYWORDS
// ============================================================

const VISUAL_KEYWORDS = {
  person: [
    "person",
    "people",
    "man",
    "woman",
    "investor",
    "investors",
    "trader",
    "traders",
    "analyst",
    "businessman",
    "businesswoman",
    "family",
    "customer",
    "employee",
  ],

  business: [
    "business",
    "company",
    "office",
    "corporate",
    "meeting",
    "ceo",
    "manager",
    "startup",
    "industry",
  ],

  technology: [
    "technology",
    "technology",
    "computer",
    "software",
    "ai",
    "artificial",
    "intelligence",
    "digital",
    "mobile",
    "laptop",
    "data",
  ],

  gold: [
    "gold",
    "bullion",
    "jewellery",
    "jewelry",
    "gold price",
    "precious metal",
  ],

  money: [
    "money",
    "cash",
    "rupee",
    "rupees",
    "currency",
    "income",
    "profit",
    "loss",
    "wealth",
    "banknote",
  ],

  news: [
    "news",
    "breaking",
    "headline",
    "announcement",
    "report",
    "media",
    "journalist",
  ],

  financial_environment: [
    "stock market",
    "share market",
    "stock exchange",
    "trading",
    "market",
    "finance",
    "financial",
    "investment",
  ],

  cinematic_broll: [
    "city",
    "building",
    "street",
    "business district",
    "office",
    "market",
  ],
};

// ============================================================
// DATA SCENE DETECTION
// ============================================================

const isDataScene = (scene) => {
  const text = normalizeText(
    `${scene?.narrationText || ""} ${
      scene?.visualDescription || ""
    } ${scene?.visualType || ""}`
  );

  const visualType = normalizeText(
    scene?.visualType || ""
  );

  // Explicit chart/data visual
  if (
    visualType === "chart" ||
    visualType === "infographic"
  ) {
    return true;
  }

  // NIFTY
  if (
    text.includes("nifty") ||
    text.includes("nifty 50")
  ) {
    return true;
  }

  // SENSEX
  if (
    text.includes("sensex") ||
    text.includes("bse sensex")
  ) {
    return true;
  }

  // BANK NIFTY
  if (
    text.includes("bank nifty") ||
    text.includes("banknifty")
  ) {
    return true;
  }

  // GOLD
  if (
    text.includes("gold price") ||
    text.includes("gold rate") ||
    text.includes("gold prices") ||
    text.includes("10 grams gold")
  ) {
    return true;
  }

  // USD INR
  if (
    text.includes("usd inr") ||
    text.includes("dollar rate") ||
    text.includes("rupee dollar") ||
    text.includes("dollar against rupee")
  ) {
    return true;
  }

  return false;
};

// ============================================================
// SEARCH QUERY BUILDER
// ============================================================

const buildSearchQuery = ({
  scene,
  topic,
  category,
}) => {
  const visualType = normalizeText(
    scene?.visualType || ""
  );

  const description = String(
    scene?.visualDescription || ""
  )
    .replace(/[^a-zA-Z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const narration = String(
    scene?.narrationText || ""
  )
    .replace(/[^a-zA-Z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  let queryParts = [];

  // ------------------------------------------
  // TYPE-SPECIFIC CONTEXT
  // ------------------------------------------

  if (visualType === "person") {
    queryParts.push("Indian people");
  }

  if (visualType === "business") {
    queryParts.push("Indian business");
  }

  if (
    visualType === "financial_environment"
  ) {
    queryParts.push(
      "Indian stock market finance"
    );
  }

  if (visualType === "technology") {
    queryParts.push(
      "Indian technology business"
    );
  }

  if (visualType === "gold") {
    queryParts.push(
      "gold bullion Indian market"
    );
  }

  if (visualType === "money") {
    queryParts.push(
      "Indian rupee money finance"
    );
  }

  if (visualType === "news") {
    queryParts.push(
      "financial news newsroom"
    );
  }

  // ------------------------------------------
  // DESCRIPTION
  // ------------------------------------------

  if (description) {
    queryParts.push(description);
  }

  // ------------------------------------------
  // TOPIC
  // ------------------------------------------

  if (topic) {
    queryParts.push(
      String(topic)
        .replace(/[^a-zA-Z0-9\s-]/g, " ")
        .trim()
    );
  }

  // ------------------------------------------
  // CATEGORY
  // ------------------------------------------

  if (category) {
    queryParts.push(
      String(category)
        .replace(/[^a-zA-Z0-9\s-]/g, " ")
        .trim()
    );
  }

  // ------------------------------------------
  // FINAL QUERY
  // ------------------------------------------

  const query = queryParts
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return query
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 20)
    .join(" ");
};

// ============================================================
// PHOTO RELEVANCE SCORE
// ============================================================

const scorePhoto = ({
  photo,
  scene,
  topic,
  category,
}) => {
  const alt = normalizeText(
    photo?.alt || ""
  );

  const description = normalizeText(
    scene?.visualDescription || ""
  );

  const narration = normalizeText(
    scene?.narrationText || ""
  );

  const visualType = normalizeText(
    scene?.visualType || ""
  );

  const topicText = normalizeText(
    topic || ""
  );

  const photoText =
    `${alt} ${normalizeText(
      photo?.photographer || ""
    )}`;

  const targetText =
    `${description} ${narration} ${topicText}`;

  const targetKeywords =
    extractKeywords(targetText);

  let score = 0;

  // ------------------------------------------
  // KEYWORD MATCH
  // ------------------------------------------

  for (const keyword of targetKeywords) {
    if (photoText.includes(keyword)) {
      score += 3;
    }
  }

  // ------------------------------------------
  // VISUAL TYPE BOOST
  // ------------------------------------------

  const typeKeywords =
    VISUAL_KEYWORDS[visualType] || [];

  for (const keyword of typeKeywords) {
    if (photoText.includes(normalizeText(keyword))) {
      score += 5;
    }
  }

  // ------------------------------------------
  // PERSON BOOST
  // ------------------------------------------

  if (visualType === "person") {
    const personWords = [
      "person",
      "people",
      "man",
      "woman",
      "businessman",
      "businesswoman",
      "investor",
      "trader",
      "analyst",
    ];

    if (
      personWords.some((word) =>
        photoText.includes(word)
      )
    ) {
      score += 10;
    }
  }

  // ------------------------------------------
  // GOLD BOOST
  // ------------------------------------------

  if (visualType === "gold") {
    if (
      photoText.includes("gold") ||
      photoText.includes("bullion")
    ) {
      score += 15;
    }
  }

  // ------------------------------------------
  // MONEY BOOST
  // ------------------------------------------

  if (visualType === "money") {
    if (
      photoText.includes("money") ||
      photoText.includes("cash") ||
      photoText.includes("currency") ||
      photoText.includes("rupee")
    ) {
      score += 12;
    }
  }

  // ------------------------------------------
  // BAD GRAPH PENALTY
  // ------------------------------------------

  const graphWords = [
    "graph",
    "chart",
    "stock chart",
    "candlestick",
    "trading screen",
    "screen",
    "dashboard",
  ];

  const isDataVisual =
    visualType === "chart" ||
    visualType === "infographic";

  if (!isDataVisual) {
    for (const word of graphWords) {
      if (photoText.includes(word)) {
        score -= 8;
      }
    }
  }

  // ------------------------------------------
  // IMAGE QUALITY
  // ------------------------------------------

  const width =
    Number(photo?.width) || 0;

  const height =
    Number(photo?.height) || 0;

  const pixels =
    width * height;

  if (pixels >= 2000000) {
    score += 3;
  }

  if (width >= 1280) {
    score += 2;
  }

  return score;
};

// ============================================================
// PEXELS SEARCH
// ============================================================

const searchPexelsImage = async ({
  query,
  scene,
  topic,
  category,
}) => {
  if (!process.env.PEXELS_API_KEY) {
    throw new Error(
      "PEXELS_API_KEY is missing."
    );
  }

  console.log(
    `🔎 Searching Pexels: ${query}`
  );

  const response =
    await axios.get(
      "https://api.pexels.com/v1/search",
      {
        headers: {
          Authorization:
            process.env.PEXELS_API_KEY,
        },

        params: {
          query,
          orientation: "landscape",
          size: "large",
          per_page: 30,
        },

        timeout: 30000,
      }
    );

  const photos =
    response.data?.photos || [];

  if (!photos.length) {
    throw new Error(
      `No Pexels images found for "${query}"`
    );
  }

  const scoredPhotos =
    photos
      .map((photo) => ({
        photo,

        score: scorePhoto({
          photo,
          scene,
          topic,
          category,
        }),
      }))
      .sort(
        (a, b) =>
          b.score - a.score
      );

  const best =
    scoredPhotos[0];

  if (!best?.photo) {
    throw new Error(
      "Could not select relevant Pexels image."
    );
  }

  console.log(
    `🎯 Best Pexels match: ${best.photo.id} | score=${best.score}`
  );

  return {
    ...best.photo,
    relevanceScore:
      best.score,
  };
};

// ============================================================
// DOWNLOAD IMAGE
// ============================================================

const downloadImage = async ({
  imageUrl,
  sceneNumber,
}) => {
  if (!imageUrl) {
    throw new Error(
      `No image URL for Scene ${sceneNumber}`
    );
  }

  const fileName =
    `scene_${sceneNumber}_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 7)}.jpg`;

  const filePath =
    path.join(
      IMAGE_DIR,
      fileName
    );

  console.log(
    `⬇️ Downloading Scene ${sceneNumber} image...`
  );

  const response =
    await axios.get(
      imageUrl,
      {
        responseType:
          "arraybuffer",
        timeout: 120000,
      }
    );

  fs.writeFileSync(
    filePath,
    Buffer.from(response.data)
  );

  if (
    !fs.existsSync(filePath) ||
    fs.statSync(filePath).size < 1000
  ) {
    throw new Error(
      `Downloaded image is invalid for Scene ${sceneNumber}`
    );
  }

  console.log(
    `✅ Image saved: ${fileName}`
  );

  return filePath;
};

// ============================================================
// GENERATE SCENE IMAGE
// ============================================================

const generateSceneImage = async ({
  scene,
  topic = "",
  category = "General",
}) => {
  if (!scene) {
    throw new Error(
      "Scene is required."
    );
  }

  const sceneNumber =
    Number(scene.sceneNumber) || 1;

  console.log(
    `🎨 Generating visual for Scene ${sceneNumber}`
  );

  console.log(
    `👁️ Visual type: ${
      scene.visualType || "unknown"
    }`
  );

  console.log(
    `📝 Visual description: ${
      scene.visualDescription || ""
    }`
  );

  // ========================================================
  // DATA SCENE
  // ========================================================

  if (isDataScene(scene)) {
    console.log(
      `📊 Scene ${sceneNumber} detected as DATA scene`
    );

    try {
      const marketData =
        await getMarketDataForScene(
          scene
        );

      if (
        !marketData ||
        marketData.price === undefined ||
        marketData.price === null
      ) {
        throw new Error(
          `No market data available for Scene ${sceneNumber}`
        );
      }

      console.log(
        `📈 Market data: ${marketData.type} = ${marketData.price}`
      );

      const card =
        await generateMarketDataCard({
          type: marketData.type,
          price: marketData.price,
          change:
            marketData.change,
          changePercent:
            marketData.changePercent,
          timestamp:
            marketData.timestamp,
        });

      return {
        imagePath:
          card.filePath,

        imageUrl:
          card.url,

        thumbnail:
          card.url,

        source:
          "market-data",

        isDataScene:
          true,

        dataCard:
          true,

        type:
          marketData.type,

        dataType:
          marketData.type,

        price:
          marketData.price,

        change:
          marketData.change,

        changePercent:
          marketData.changePercent,

        timestamp:
          marketData.timestamp,

        visualType:
          scene.visualType ||
          "chart",

        relevanceScore:
          100,
      };
    } catch (dataError) {
      console.warn(
        `⚠️ Data card failed for Scene ${sceneNumber}: ${dataError.message}`
      );

      console.log(
        `↩️ Falling back to relevant Pexels image`
      );
    }
  }

  // ========================================================
  // NORMAL PEXELS VISUAL
  // ========================================================

  const searchQuery =
    buildSearchQuery({
      scene,
      topic,
      category,
    });

  if (!searchQuery) {
    throw new Error(
      `Could not build image search query for Scene ${sceneNumber}`
    );
  }

  let lastError =
    null;

  // Retry 3 times
  for (
    let attempt = 1;
    attempt <= 3;
    attempt++
  ) {
    try {
      console.log(
        `🖼️ Scene ${sceneNumber} image attempt ${attempt}/3`
      );

      const selectedPhoto =
        await searchPexelsImage({
          query:
            searchQuery,
          scene,
          topic,
          category,
        });

      const imageUrl =
        selectedPhoto?.src?.landscape ||
        selectedPhoto?.src?.large2x ||
        selectedPhoto?.src?.large ||
        selectedPhoto?.src?.original;

      if (!imageUrl) {
        throw new Error(
          "Selected Pexels photo has no usable image URL."
        );
      }

      const imagePath =
        await downloadImage({
          imageUrl,
          sceneNumber,
        });

      return {
        imagePath,

        imageUrl,

        thumbnail:
          selectedPhoto?.src?.medium ||
          imageUrl,

        source:
          "pexels",

        isDataScene:
          false,

        dataCard:
          false,

        pexelsId:
          selectedPhoto.id,

        photographer:
          selectedPhoto.photographer ||
          "",

        photographerUrl:
          selectedPhoto.photographer_url ||
          "",

        pexelsUrl:
          selectedPhoto.url ||
          "",

        searchQuery,

        relevanceScore:
          selectedPhoto.relevanceScore ||
          0,

        visualType:
          scene.visualType ||
          "realistic_photo",
      };
    } catch (error) {
      lastError =
        error;

      console.warn(
        `⚠️ Scene ${sceneNumber} image attempt ${attempt} failed: ${error.message}`
      );

      if (attempt < 3) {
        await new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              1000 * attempt
            )
        );
      }
    }
  }

  throw new Error(
    `Could not generate relevant image for Scene ${sceneNumber} after 3 attempts. ${
      lastError?.message || ""
    }`
  );
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  generateSceneImage,
  searchPexelsImage,
  downloadImage,
  buildSearchQuery,
  scorePhoto,
  isDataScene,
};