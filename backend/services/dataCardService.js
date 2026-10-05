const fs = require("fs");
const path = require("path");

// ======================================================
// DATA CARD SERVICE
// Creates market-data visuals as SVG files.
// No paid API / no image-generation API required.
// ======================================================

const DATA_CARD_DIR = path.join(
  __dirname,
  "..",
  "public",
  "images",
  "data-cards"
);

fs.mkdirSync(DATA_CARD_DIR, {
  recursive: true,
});

// ======================================================
// ESCAPE XML
// ======================================================

const escapeXml = (value) => {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
};

// ======================================================
// FORMAT NUMBER
// ======================================================

const formatNumber = (
  value,
  decimals = 2
) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "--";
  }

  return number.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

// ======================================================
// FORMAT CHANGE
// ======================================================

const formatChange = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "--";
  }

  const sign =
    number > 0
      ? "+"
      : "";

  return `${sign}${formatNumber(number, 2)}`;
};

// ======================================================
// FORMAT CHANGE %
// ======================================================

const formatChangePercent = (
  value
) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "--";
  }

  const sign =
    number > 0
      ? "+"
      : "";

  return `${sign}${number.toFixed(2)}%`;
};

// ======================================================
// GET CARD CONFIG
// ======================================================

const getCardConfig = (
  type
) => {
  switch (type) {
    case "nifty":
      return {
        title: "NIFTY 50",
        subtitle:
          "NATIONAL STOCK EXCHANGE",
        unit: "POINTS",
        badge: "MARKET DATA",
      };

    case "sensex":
      return {
        title: "SENSEX",
        subtitle:
          "BOMBAY STOCK EXCHANGE",
        unit: "POINTS",
        badge: "MARKET DATA",
      };

    case "bankNifty":
      return {
        title: "BANK NIFTY",
        subtitle:
          "NSE BANKING INDEX",
        unit: "POINTS",
        badge: "MARKET DATA",
      };

    case "gold":
      return {
        title: "GOLD",
        subtitle:
          "GOLD MARKET",
        unit: "USD / TROY OUNCE",
        badge: "COMMODITY",
      };

    case "usdInr":
      return {
        title: "USD / INR",
        subtitle:
          "CURRENCY MARKET",
        unit: "INDIAN RUPEE",
        badge: "FOREX",
      };

    default:
      return {
        title: "MARKET DATA",
        subtitle:
          "FINANCIAL MARKET",
        unit: "",
        badge: "LIVE DATA",
      };
  }
};

// ======================================================
// CREATE SVG
// ======================================================

const createMarketDataSvg = ({
  type,
  price,
  previousClose,
  change,
  changePercent,
  timestamp,
}) => {
  const config =
    getCardConfig(type);

  const isPositive =
    Number(change) > 0;

  const isNegative =
    Number(change) < 0;

  const changeColor =
    isPositive
      ? "#16a34a"
      : isNegative
      ? "#dc2626"
      : "#64748b";

  const arrow =
    isPositive
      ? "▲"
      : isNegative
      ? "▼"
      : "—";

  let displayPrice;

  if (type === "usdInr") {
    displayPrice =
      `₹${formatNumber(price, 2)}`;
  } else if (type === "gold") {
    displayPrice =
      `$${formatNumber(price, 2)}`;
  } else {
    displayPrice =
      formatNumber(price, 2);
  }

  const displayChange =
    formatChange(change);

  const displayPercent =
    formatChangePercent(
      changePercent
    );

  const generatedAt =
    timestamp
      ? new Date(timestamp)
      : new Date();

  const timeText =
    Number.isNaN(
      generatedAt.getTime()
    )
      ? new Date().toLocaleString(
          "en-IN"
        )
      : generatedAt.toLocaleString(
          "en-IN",
          {
            dateStyle: "medium",
            timeStyle: "short",
          }
        );

  return `
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="1280"
  height="720"
  viewBox="0 0 1280 720"
>
  <defs>

    <linearGradient
      id="background"
      x1="0"
      y1="0"
      x2="1"
      y2="1"
    >
      <stop
        offset="0%"
        stop-color="#07111f"
      />

      <stop
        offset="55%"
        stop-color="#0f2742"
      />

      <stop
        offset="100%"
        stop-color="#07111f"
      />
    </linearGradient>

    <linearGradient
      id="card"
      x1="0"
      y1="0"
      x2="1"
      y2="1"
    >
      <stop
        offset="0%"
        stop-color="#ffffff"
      />

      <stop
        offset="100%"
        stop-color="#eef3f8"
      />
    </linearGradient>

    <filter
      id="shadow"
      x="-20%"
      y="-20%"
      width="140%"
      height="140%"
    >
      <feDropShadow
        dx="0"
        dy="14"
        stdDeviation="18"
        flood-opacity="0.28"
      />
    </filter>

  </defs>

  <!-- ============================================= -->
  <!-- BACKGROUND -->
  <!-- ============================================= -->

  <rect
    width="1280"
    height="720"
    fill="url(#background)"
  />

  <!-- ============================================= -->
  <!-- BACKGROUND MARKET LINES -->
  <!-- ============================================= -->

  <path
    d="M0 570
       C120 520 190 590 300 530
       S480 480 580 530
       S760 600 850 510
       S1040 450 1280 500"
    fill="none"
    stroke="#ffffff"
    stroke-opacity="0.07"
    stroke-width="3"
  />

  <path
    d="M0 610
       C150 560 220 620 360 570
       S580 520 690 570
       S850 620 980 550
       S1120 500 1280 540"
    fill="none"
    stroke="#ffffff"
    stroke-opacity="0.05"
    stroke-width="2"
  />

  <!-- ============================================= -->
  <!-- TOP LABEL -->
  <!-- ============================================= -->

  <text
    x="90"
    y="90"
    font-family="Arial, sans-serif"
    font-size="25"
    font-weight="700"
    fill="#cbd5e1"
    letter-spacing="3"
  >
    MARKET MITRA
  </text>

  <text
    x="1190"
    y="90"
    text-anchor="end"
    font-family="Arial, sans-serif"
    font-size="20"
    font-weight="600"
    fill="#94a3b8"
  >
    ${escapeXml(config.badge)}
  </text>

  <!-- ============================================= -->
  <!-- MAIN CARD -->
  <!-- ============================================= -->

  <rect
    x="90"
    y="135"
    width="1100"
    height="470"
    rx="32"
    fill="url(#card)"
    filter="url(#shadow)"
  />

  <!-- ============================================= -->
  <!-- TITLE -->
  <!-- ============================================= -->

  <text
    x="150"
    y="215"
    font-family="Arial, sans-serif"
    font-size="38"
    font-weight="800"
    fill="#0f172a"
  >
    ${escapeXml(config.title)}
  </text>

  <text
    x="150"
    y="255"
    font-family="Arial, sans-serif"
    font-size="18"
    font-weight="600"
    fill="#64748b"
    letter-spacing="1"
  >
    ${escapeXml(config.subtitle)}
  </text>

  <!-- ============================================= -->
  <!-- PRICE -->
  <!-- ============================================= -->

  <text
    x="150"
    y="385"
    font-family="Arial, sans-serif"
    font-size="92"
    font-weight="800"
    fill="#0f172a"
  >
    ${escapeXml(displayPrice)}
  </text>

  <text
    x="155"
    y="425"
    font-family="Arial, sans-serif"
    font-size="17"
    font-weight="700"
    fill="#64748b"
    letter-spacing="2"
  >
    ${escapeXml(config.unit)}
  </text>

  <!-- ============================================= -->
  <!-- CHANGE BOX -->
  <!-- ============================================= -->

  <rect
    x="790"
    y="220"
    width="315"
    height="150"
    rx="22"
    fill="${changeColor}"
    fill-opacity="0.10"
  />

  <text
    x="835"
    y="275"
    font-family="Arial, sans-serif"
    font-size="28"
    font-weight="800"
    fill="${changeColor}"
  >
    ${arrow} ${escapeXml(displayChange)}
  </text>

  <text
    x="835"
    y="320"
    font-family="Arial, sans-serif"
    font-size="25"
    font-weight="700"
    fill="${changeColor}"
  >
    ${escapeXml(displayPercent)}
  </text>

  <text
    x="835"
    y="350"
    font-family="Arial, sans-serif"
    font-size="14"
    font-weight="600"
    fill="#64748b"
  >
    VS PREVIOUS CLOSE
  </text>

  <!-- ============================================= -->
  <!-- PREVIOUS CLOSE -->
  <!-- ============================================= -->

  <text
    x="150"
    y="500"
    font-family="Arial, sans-serif"
    font-size="17"
    font-weight="600"
    fill="#64748b"
  >
    Previous Close
  </text>

  <text
    x="150"
    y="535"
    font-family="Arial, sans-serif"
    font-size="25"
    font-weight="800"
    fill="#334155"
  >
    ${escapeXml(
      Number.isFinite(
        Number(previousClose)
      )
        ? formatNumber(
            previousClose,
            2
          )
        : "--"
    )}
  </text>

  <!-- ============================================= -->
  <!-- TIMESTAMP -->
  <!-- ============================================= -->

  <text
    x="1105"
    y="535"
    text-anchor="end"
    font-family="Arial, sans-serif"
    font-size="14"
    font-weight="600"
    fill="#94a3b8"
  >
    Data time: ${escapeXml(timeText)}
  </text>

  <!-- ============================================= -->
  <!-- FOOTER -->
  <!-- ============================================= -->

  <line
    x1="150"
    y1="565"
    x2="1130"
    y2="565"
    stroke="#cbd5e1"
    stroke-width="1"
  />

  <text
    x="150"
    y="590"
    font-family="Arial, sans-serif"
    font-size="13"
    font-weight="600"
    fill="#94a3b8"
  >
    Market value shown at video-generation time
  </text>

</svg>
`;
};

// ======================================================
// CREATE DATA CARD FILE
// ======================================================

const generateMarketDataCard = async ({
  type,
  price,
  previousClose,
  change,
  changePercent,
  timestamp,
}) => {
  if (!type) {
    throw new Error(
      "Data card type is required"
    );
  }

  if (
    !Number.isFinite(
      Number(price)
    )
  ) {
    throw new Error(
      `Invalid price for ${type}`
    );
  }

  const svg =
    createMarketDataSvg({
      type,
      price,
      previousClose,
      change,
      changePercent,
      timestamp,
    });

  const fileName =
    `${type}_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}.svg`;

  const filePath =
    path.join(
      DATA_CARD_DIR,
      fileName
    );

  fs.writeFileSync(
    filePath,
    svg,
    "utf8"
  );

  console.log(
    `📊 Data card created: ${filePath}`
  );

  return {
    filePath,

    fileName,

    url:
      `/output/images/data-cards/${fileName}`,

    type,

    price,

    previousClose,

    change,

    changePercent,

    isDataCard: true,
  };
};

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  generateMarketDataCard,

  createMarketDataSvg,

  formatNumber,

  formatChange,

  formatChangePercent,

  getCardConfig,
};