const axios = require("axios");

// ======================================================
// MARKET DATA SERVICE
// Free public Yahoo Finance chart endpoint
// No API key required
// ======================================================

const MARKET_SYMBOLS = {
  NIFTY: "^NSEI",
  SENSEX: "^BSESN",
  BANKNIFTY: "^NSEBANK",
  GOLD: "GC=F",
  USDINR: "INR=X",
};

// ======================================================
// FETCH ONE SYMBOL
// ======================================================

const fetchYahooQuote = async (symbol) => {
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/` +
    encodeURIComponent(symbol) +
    `?range=1d&interval=1m`;

  const response = await axios.get(url, {
    timeout: 15000,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });

  const result =
    response?.data?.chart?.result?.[0];

  if (!result) {
    throw new Error(
      `No market data returned for ${symbol}`
    );
  }

  const meta = result.meta || {};

  const regularMarketPrice =
    Number(meta.regularMarketPrice);

  const previousClose =
    Number(meta.previousClose);

  if (!Number.isFinite(regularMarketPrice)) {
    throw new Error(
      `Invalid market price for ${symbol}`
    );
  }

  let change = null;
  let changePercent = null;

  if (Number.isFinite(previousClose)) {
    change =
      regularMarketPrice -
      previousClose;

    if (previousClose !== 0) {
      changePercent =
        (change / previousClose) * 100;
    }
  }

  return {
    symbol,

    price: regularMarketPrice,

    previousClose:
      Number.isFinite(previousClose)
        ? previousClose
        : null,

    change,

    changePercent,

    currency:
      meta.currency || "INR",

    exchange:
      meta.exchange || "",

    marketState:
      meta.marketState || "",

    shortName:
      meta.shortName || "",

    longName:
      meta.longName || "",

    timestamp:
      meta.regularMarketTime
        ? new Date(
            meta.regularMarketTime * 1000
          ).toISOString()
        : new Date().toISOString(),
  };
};

// ======================================================
// FETCH NIFTY
// ======================================================

const getNifty = async () => {
  return fetchYahooQuote(
    MARKET_SYMBOLS.NIFTY
  );
};

// ======================================================
// FETCH SENSEX
// ======================================================

const getSensex = async () => {
  return fetchYahooQuote(
    MARKET_SYMBOLS.SENSEX
  );
};

// ======================================================
// FETCH BANK NIFTY
// ======================================================

const getBankNifty = async () => {
  return fetchYahooQuote(
    MARKET_SYMBOLS.BANKNIFTY
  );
};

// ======================================================
// FETCH GOLD
// ======================================================

const getGold = async () => {
  return fetchYahooQuote(
    MARKET_SYMBOLS.GOLD
  );
};

// ======================================================
// FETCH USD / INR
// ======================================================

const getUsdInr = async () => {
  return fetchYahooQuote(
    MARKET_SYMBOLS.USDINR
  );
};

// ======================================================
// FETCH ALL IMPORTANT MARKET DATA
// ======================================================

const getAllMarketData = async () => {
  const data = {};

  const requests = [
    ["nifty", getNifty],
    ["sensex", getSensex],
    ["bankNifty", getBankNifty],
    ["gold", getGold],
    ["usdInr", getUsdInr],
  ];

  for (const [name, getter] of requests) {
    try {
      console.log(
        `📊 Fetching ${name} market data...`
      );

      data[name] =
        await getter();

      console.log(
        `✅ ${name}:`,
        data[name].price
      );
    } catch (error) {
      console.warn(
        `⚠️ Could not fetch ${name}:`,
        error.message
      );

      data[name] = null;
    }
  }

  return data;
};

// ======================================================
// FIND MARKET DATA FROM SCENE TEXT
// ======================================================

const detectMarketDataType = (
  narrationText = "",
  visualDescription = ""
) => {
  const text =
    `${narrationText} ${visualDescription}`
      .toLowerCase();

  // NIFTY
  if (
    text.includes("nifty 50") ||
    text.includes("nifty50") ||
    text.includes("nifty")
  ) {
    return "nifty";
  }

  // SENSEX
  if (
    text.includes("sensex") ||
    text.includes("bse sensex")
  ) {
    return "sensex";
  }

  // BANK NIFTY
  if (
    text.includes("bank nifty") ||
    text.includes("banknifty")
  ) {
    return "bankNifty";
  }

  // GOLD
  if (
    text.includes("gold") ||
    text.includes("బంగారం") ||
    text.includes("gold price")
  ) {
    return "gold";
  }

  // USD / INR
  if (
    text.includes("usd/inr") ||
    text.includes("usd inr") ||
    text.includes("dollar") ||
    text.includes("rupee") ||
    text.includes("డాలర్") ||
    text.includes("రూపాయి")
  ) {
    return "usdInr";
  }

  return null;
};

// ======================================================
// GET DATA FOR SCENE
// ======================================================

const getMarketDataForScene = async ({
  narrationText = "",
  visualDescription = "",
}) => {
  const type =
    detectMarketDataType(
      narrationText,
      visualDescription
    );

  if (!type) {
    return null;
  }

  console.log(
    `🎯 Market data detected: ${type}`
  );

  let data = null;

  if (type === "nifty") {
    data = await getNifty();
  }

  if (type === "sensex") {
    data = await getSensex();
  }

  if (type === "bankNifty") {
    data = await getBankNifty();
  }

  if (type === "gold") {
    data = await getGold();
  }

  if (type === "usdInr") {
    data = await getUsdInr();
  }

  if (!data) {
    throw new Error(
      `Market data unavailable for ${type}`
    );
  }

  return {
    type,
    ...data,
  };
};

// ======================================================
// EXPORT
// ======================================================

module.exports = {
  MARKET_SYMBOLS,

  fetchYahooQuote,

  getNifty,

  getSensex,

  getBankNifty,

  getGold,

  getUsdInr,

  getAllMarketData,

  detectMarketDataType,

  getMarketDataForScene,
};