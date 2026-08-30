require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const googleTTS = require("google-tts-api");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { execFile } = require("child_process");
const multer = require("multer");
const connectDB = require("./config/db");
const VideoProject = require("./models/VideoProject");

const {
  generateStructuredScript,
} = require("./services/scriptService");

const voiceRoutes = require("./routes/voiceRoutes");
const app = express();
const PORT = process.env.PORT || 5000;

// ==========================================
// FFMPEG SETUP
// ==========================================

const ffmpegPath = require("ffmpeg-static");

if (!ffmpegPath) {
  console.error(
    "❌ ffmpeg-static was not found. Run: npm install ffmpeg-static"
  );
}

// ==========================================
// DATABASE
// ==========================================

connectDB();

// ==========================================
// MIDDLEWARE
// ==========================================

app.use(cors());

app.use(
  express.json({
    limit: "50mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "50mb",
  })
);

// ==========================================
// DIRECTORIES
// ==========================================

const publicDir = path.join(__dirname, "public");
const imageUploadFolder = path.join(publicDir, "images");
const audioFolder = path.join(publicDir, "audio");
const videoFolder = path.join(publicDir, "videos");
const tempFolder = path.join(publicDir, "temp");

[publicDir, imageUploadFolder, audioFolder, videoFolder, tempFolder].forEach((dir) => {
  fs.mkdirSync(dir, { recursive: true });
});

// ==========================================
// STATIC MEDIA & ROUTES
// ==========================================

app.use(
  "/output",
  express.static(publicDir)
);

app.use(
  "/api/voices",
  voiceRoutes
);

// ==========================================
// MULTER IMAGE STORAGE
// ==========================================

const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, imageUploadFolder);
  },

  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname);
    const name = path
      .basename(file.originalname, extension)
      .replace(/[^a-zA-Z0-9_-]/g, "_");

    cb(null, `${name}_${Date.now()}${extension}`);
  },
});

const uploadImages = multer({
  storage: imageStorage,
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// ==========================================
// HELPER UTILITIES
// ==========================================

const runFFmpeg = (args) => {
  return new Promise((resolve, reject) => {
    execFile(
      ffmpegPath,
      args,
      {
        windowsHide: true,
      },
      (error, stdout, stderr) => {
        if (error) {
          console.error("FFmpeg error:", stderr);
          return reject(
            new Error(stderr || error.message)
          );
        }
        resolve({ stdout, stderr });
      }
    );
  });
};

const getAudioDuration = (audioPath) => {
  return new Promise((resolve, reject) => {
    execFile(
      ffmpegPath,
      ["-i", audioPath],
      {
        windowsHide: true,
      },
      (error, stdout, stderr) => {
        const output = `${stdout}\n${stderr}`;
        const match = output.match(
          /Duration:\s*(\d+):(\d+):([\d.]+)/
        );

        if (!match) {
          return reject(
            new Error(
              `Could not detect audio duration: ${audioPath}`
            )
          );
        }

        const hours = Number(match[1]);
        const minutes = Number(match[2]);
        const seconds = Number(match[3]);

        const totalSeconds =
          hours * 3600 + minutes * 60 + seconds;

        resolve(totalSeconds);
      }
    );
  });
};

const downloadImage = async (imageUrl, outputPath) => {
  console.log("⬇️ Downloading image...");
  const response = await axios.get(imageUrl, {
    responseType: "arraybuffer",
    timeout: 120000,
  });

  fs.writeFileSync(
    outputPath,
    Buffer.from(response.data)
  );
  console.log("✅ Image downloaded");
  return outputPath;
};

const downloadFile = async (fileUrl, outputPath) => {
  const response = await axios.get(fileUrl, {
    responseType: "arraybuffer",
    timeout: 60000,
  });
  fs.writeFileSync(outputPath, Buffer.from(response.data));
  return outputPath;
};

// ==========================================
// SCENE VIDEO + CAPTION RENDERER
// ==========================================

const resolveLocalMediaPath = (mediaUrl, mediaType) => {
  if (!mediaUrl) return null;

  // Already a real filesystem path
  if (path.isAbsolute(mediaUrl) && fs.existsSync(mediaUrl)) {
    return mediaUrl;
  }

  let pathname = String(mediaUrl);

  // Convert http://localhost:5000/output/audio/file.mp3
  // into /output/audio/file.mp3
  try {
    if (/^https?:\/\//i.test(pathname)) {
      pathname = new URL(pathname).pathname;
    }
  } catch (error) {
    console.log("URL parsing warning:", error.message);
  }

  pathname = decodeURIComponent(pathname)
    .split("?")[0]
    .split("#")[0];

  // /output/audio/file.mp3
  //        ↓
  // public/audio/file.mp3
  if (pathname.startsWith("/output/")) {
    pathname = pathname.slice("/output/".length);
  } else if (pathname.startsWith("/")) {
    pathname = pathname.slice(1);
  }

  const candidate = path.join(
    publicDir,
    pathname
  );

  if (fs.existsSync(candidate)) {
    return candidate;
  }

  // Fallback
  const fallback = path.join(
    publicDir,
    mediaType,
    path.basename(pathname)
  );

  if (fs.existsSync(fallback)) {
    return fallback;
  }

  return null;
};

// ==========================================
// TEXT ESCAPE FOR FFMPEG
// ==========================================

const escapeDrawText = (text) => {
  return String(text || "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/:/g, "\\:")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]");
};

const createCaptionFiltersForScene = async ({
  scene,
  audioPath,
}) => {
  const narrationText = String(
    scene.narrationText ||
    scene.text ||
    ""
  )
    .replace(/\r?\n/g, " ")
    .trim();

  if (!narrationText) {
    return [];
  }

  const words = narrationText
    .split(/\s+/)
    .filter(Boolean);

  const audioDuration =
    await getAudioDuration(audioPath);

  const chunks = [];

  for (
    let i = 0;
    i < words.length;
    i += 7
  ) {
    chunks.push(
      words
        .slice(i, i + 7)
        .join(" ")
    );
  }

  const totalCharacters =
    chunks.reduce(
      (sum, value) =>
        sum + value.length,
      0
    ) || 1;

  let currentTime = 0;

  const filters = [];

  for (
    let i = 0;
    i < chunks.length;
    i++
  ) {
    const chunk = chunks[i];

    const duration =
      Math.max(
        audioDuration *
          (chunk.length /
            totalCharacters),
        1.2
      );

    const startTime =
      currentTime;

    const endTime =
      Math.min(
        currentTime + duration,
        audioDuration
      );

    const chunkWords =
      chunk.split(/\s+/);

    const middle =
      Math.ceil(
        chunkWords.length / 2
      );

    const line1 =
      chunkWords
        .slice(0, middle)
        .join(" ");

    const line2 =
      chunkWords
        .slice(middle)
        .join(" ");

    const caption =
      line2
        ? `${line1}\\n${line2}`
        : line1;

    const safeText =
      escapeDrawText(
        caption
      );

    /*
     * IMPORTANT:
     *
     * Do NOT put another drawtext after
     * the enable expression using a comma.
     *
     * Use semicolon to separate drawtext filters.
     */

    const filter =
      `drawtext=` +
      `text='${safeText}':` +
      `fontcolor=white:` +
      `fontsize=30:` +
      `line_spacing=8:` +
      `x=(w-text_w)/2:` +
      `y=h-text_h-55:` +
      `borderw=2:` +
      `bordercolor=black:` +
      `box=1:` +
      `boxcolor=black@0.70:` +
      `boxborderw=18:` +
      `text_align=center:` +
      `enable='between(t\\,${startTime.toFixed(
        3
      )}\\,${endTime.toFixed(
        3
      )})'`;

    filters.push(
      filter
    );

    currentTime =
      endTime;

    if (
      currentTime >=
      audioDuration
    ) {
      break;
    }
  }

  return filters;
};

// ==========================================
// CREATE ONE IMAGE VIDEO SEGMENT
// ==========================================

const createImageSegment = async ({
  imagePath,
  duration,
  outputPath,
  sceneNumber,
  imageIndex,
}) => {
  if (
    !imagePath ||
    !fs.existsSync(imagePath)
  ) {
    throw new Error(
      `Scene ${sceneNumber} Image ${
        imageIndex + 1
      } not found: ${imagePath}`
    );
  }

  const safeDuration =
    Math.max(
      0.5,
      Number(duration) || 5
    );

  console.log(
    `🖼️ Scene ${sceneNumber} Image ${
      imageIndex + 1
    }: ${safeDuration.toFixed(2)} sec`
  );

  await runFFmpeg([
    "-y",
    "-loop",
    "1",
    "-i",
    imagePath,
    "-t",
    safeDuration.toFixed(3),
    "-vf",
    [
      "scale=1280:720:force_original_aspect_ratio=decrease",
      "pad=1280:720:(ow-iw)/2:(oh-ih)/2:black",
      "format=yuv420p",
    ].join(","),
    "-r",
    "30",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-tune",
    "stillimage",
    "-an",
    "-pix_fmt",
    "yuv420p",
    outputPath,
  ]);
};

// ==========================================
// CONCAT VIDEO FILES
// ==========================================

const concatVideoFiles = async ({
  files,
  outputPath,
}) => {
  if (!files.length) {
    throw new Error(
      "No video files to concatenate."
    );
  }

  if (files.length === 1) {
    fs.copyFileSync(
      files[0],
      outputPath
    );
    return outputPath;
  }

  const concatFile =
    path.join(
      tempFolder,
      `concat_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2)}.txt`
    );

  const content =
    files
      .map(
        (file) =>
          `file '${file
            .replace(
              /\\/g,
              "/"
            )
            .replace(
              /'/g,
              "'\\''"
            )}'`
      )
      .join("\n");

  fs.writeFileSync(
    concatFile,
    content,
    "utf8"
  );

  try {
    await runFFmpeg([
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      concatFile,
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-pix_fmt",
      "yuv420p",
      outputPath,
    ]);
  } finally {
    if (
      fs.existsSync(
        concatFile
      )
    ) {
      fs.unlinkSync(
        concatFile
      );
    }
  }

  return outputPath;
};

// ==========================================
// ADD AUDIO + CAPTIONS
// ==========================================

const renderSceneVideoWithCaptions =
  async ({
    scene,
    imageVideoPath,
    audioPath,
    sceneVideoPath,
  }) => {
    if (
      !audioPath ||
      !fs.existsSync(
        audioPath
      )
    ) {
      throw new Error(
        `Audio file not found for Scene ${
          scene.sceneNumber
        }: ${audioPath}`
      );
    }

    const audioDuration =
      await getAudioDuration(
        audioPath
      );

    console.log(
      `🎙️ Audio duration: ${audioDuration.toFixed(
        2
      )} sec`
    );

    const captionFilters =
      await createCaptionFiltersForScene({
        scene,
        audioPath,
      });

   const baseFilters = [
  "scale=1280:720:force_original_aspect_ratio=decrease",
  "pad=1280:720:(ow-iw)/2:(oh-ih)/2:black",
  "format=yuv420p",
];

const videoFilter = [
  ...baseFilters,
  ...captionFilters,
].join(",");

    await runFFmpeg([
      "-y",
      "-i",
      imageVideoPath,
      "-i",
      audioPath,
      "-map",
      "0:v:0",
      "-map",
      "1:a:0",
      "-vf",
      videoFilter,
      "-t",
      audioDuration.toFixed(3),
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-shortest",
      sceneVideoPath,
    ]);

    return sceneVideoPath;
  };

// ==========================================
// MULTI-IMAGE FINAL VIDEO ENGINE
// ==========================================

const createCompleteVideo =
  async ({
    scenes,
    outputName,
  }) => {
    if (
      !Array.isArray(scenes) ||
      scenes.length === 0
    ) {
      throw new Error(
        "No scenes provided for final video."
      );
    }

    const finalVideoPath =
      path.join(
        videoFolder,
        outputName
      );

    const sceneVideoFiles = [];
    const tempFilesToClean = [];

    try {
      // ========================================
      // EACH SCENE
      // ========================================

      for (
        let i = 0;
        i < scenes.length;
        i++
      ) {
        const scene =
          scenes[i];

        const sceneNumber =
          Number(
            scene.sceneNumber
          ) || i + 1;

        const timestamp =
          Date.now();

        console.log(
          `🎬 Rendering Scene ${sceneNumber}...`
        );

        // ======================================
        // AUDIO
        // ======================================

        const rawAudio =
          scene.audioPath ||
          scene.audioUrl;

        if (!rawAudio) {
          throw new Error(
            `Scene ${sceneNumber} has no audio provided.`
          );
        }

        let audioPath =
          resolveLocalMediaPath(
            rawAudio,
            "audio"
          );

        // Remote audio fallback
        if (
          !audioPath &&
          /^https?:\/\//i.test(
            rawAudio
          )
        ) {
          const tempAudio =
            path.join(
              tempFolder,
              `temp_audio_${sceneNumber}_${timestamp}.mp3`
            );

          await downloadFile(
            rawAudio,
            tempAudio
          );

          audioPath =
            tempAudio;

          tempFilesToClean.push(
            tempAudio
          );
        }

        if (
          !audioPath ||
          !fs.existsSync(
            audioPath
          )
        ) {
          throw new Error(
            `Audio file not found for Scene ${sceneNumber}: ${rawAudio}`
          );
        }

        console.log(
          `🎙️ Audio resolved: ${audioPath}`
        );

        const audioDuration =
          await getAudioDuration(
            audioPath
          );

        console.log(
          `🎙️ Scene ${sceneNumber} audio: ${audioDuration.toFixed(
            2
          )} sec`
        );

        // ======================================
        // IMAGES
        // ======================================

        let rawImages = [];

        // NEW FORMAT
        if (
          Array.isArray(
            scene.images
          ) &&
          scene.images.length > 0
        ) {
          rawImages =
            scene.images
              .map(
                (
                  image,
                  index
                ) => ({
                  ...image,
                  order:
                    image.order ||
                    index + 1,
                  duration:
                    Number(
                      image.duration
                    ) || 5,
                  url:
                    image.url ||
                    image.imageUrl ||
                    image.imagePath ||
                    image.path,
                })
              )
              .filter(
                (image) =>
                  image.url
              );
        }

        // OLD FORMAT SUPPORT
        if (
          rawImages.length === 0 &&
          (
            scene.imageUrl ||
            scene.imagePath
          )
        ) {
          rawImages = [
            {
              url:
                scene.imageUrl ||
                scene.imagePath,
              source:
                scene.imageSource ||
                "legacy",
              duration:
                Number(
                  scene.duration
                ) ||
                audioDuration,
              order: 1,
            },
          ];
        }

        if (
          rawImages.length === 0
        ) {
          throw new Error(
            `Scene ${sceneNumber} has no images.`
          );
        }

        console.log(
          `🖼️ Scene ${sceneNumber}: ${rawImages.length} image(s)`
        );

        // ======================================
        // RESOLVE IMAGES
        // ======================================

        const resolvedImages =
          [];

        for (
          let imageIndex = 0;
          imageIndex <
          rawImages.length;
          imageIndex++
        ) {
          const image =
            rawImages[
              imageIndex
            ];

          let imagePath =
            resolveLocalMediaPath(
              image.url,
              "images"
            );

          // Pexels URL / remote URL
          if (
            !imagePath &&
            /^https?:\/\//i.test(
              image.url
            )
          ) {
            let extension =
              ".jpg";

            try {
              extension =
                path.extname(
                  new URL(
                    image.url
                  ).pathname
                ) || ".jpg";
            } catch (_) {}

            const tempImage =
              path.join(
                tempFolder,
                `temp_image_${sceneNumber}_${imageIndex}_${timestamp}${extension}`
              );

            await downloadFile(
              image.url,
              tempImage
            );

            imagePath =
              tempImage;

            tempFilesToClean.push(
              tempImage
            );
          }

          if (
            !imagePath ||
            !fs.existsSync(
              imagePath
            )
          ) {
            throw new Error(
              `Scene ${sceneNumber} Image ${
                imageIndex + 1
              } could not be resolved: ${image.url}`
            );
          }

          resolvedImages.push({
            ...image,
            imagePath,
          });
        }

        // ======================================
        // IMAGE DURATIONS
        // ======================================

        let durations =
          resolvedImages.map(
            (image) =>
              Math.max(
                0.5,
                Number(
                  image.duration
                ) || 5
              )
          );

        const requestedTotal =
          durations.reduce(
            (
              sum,
              value
            ) =>
              sum + value,
            0
          );

        console.log(
          `⏱️ Requested image duration: ${requestedTotal.toFixed(
            2
          )} sec`
        );

        // If images are shorter than audio, extend final image.
        if (
          requestedTotal <
          audioDuration
        ) {
          durations[
            durations.length - 1
          ] +=
            audioDuration -
            requestedTotal;
        }
        // If images are longer than audio, trim them.
        else if (
          requestedTotal >
          audioDuration
        ) {
          let remaining =
            audioDuration;

          for (
            let j = 0;
            j < durations.length;
            j++
          ) {
            if (
              remaining <= 0
            ) {
              durations[j] = 0;
              continue;
            }

            durations[j] =
              Math.min(
                durations[j],
                remaining
              );

            remaining -=
              durations[j];
          }
        }

        const usableImages =
          resolvedImages
            .map(
              (
                image,
                index
              ) => ({
                ...image,
                duration:
                  durations[
                    index
                  ],
              })
            )
            .filter(
              (image) =>
                image.duration >
                0
            );

        // ======================================
        // CREATE IMAGE SEGMENTS
        // ======================================

        const imageSegments =
          [];

        for (
          let imageIndex = 0;
          imageIndex <
          usableImages.length;
          imageIndex++
        ) {
          const image =
            usableImages[
              imageIndex
            ];

          const segmentPath =
            path.join(
              tempFolder,
              `scene_${sceneNumber}_image_${imageIndex}_${timestamp}.mp4`
            );

          await createImageSegment({
            imagePath:
              image.imagePath,
            duration:
              image.duration,
            outputPath:
              segmentPath,
            sceneNumber,
            imageIndex,
          });

          imageSegments.push(
            segmentPath
          );

          tempFilesToClean.push(
            segmentPath
          );
        }

        // ======================================
        // JOIN IMAGES
        // ======================================

        const imageVideoPath =
          path.join(
            tempFolder,
            `scene_${sceneNumber}_images_${timestamp}.mp4`
          );

        await concatVideoFiles({
          files:
            imageSegments,
          outputPath:
            imageVideoPath,
        });

        tempFilesToClean.push(
          imageVideoPath
        );

        // ======================================
        // ADD AUDIO + CAPTIONS
        // ======================================

        const sceneVideoPath =
          path.join(
            tempFolder,
            `scene_${sceneNumber}_${timestamp}.mp4`
          );

        await renderSceneVideoWithCaptions({
          scene,
          imageVideoPath,
          audioPath,
          sceneVideoPath,
        });

        tempFilesToClean.push(
          sceneVideoPath
        );

        sceneVideoFiles.push(
          sceneVideoPath
        );

        console.log(
          `✅ Scene ${sceneNumber} rendered successfully`
        );
      }

      // ========================================
      // FINAL CONCAT
      // ========================================

      console.log(
        "🎞️ Concatenating all scene videos..."
      );

      const concatFilePath =
        path.join(
          tempFolder,
          `final_concat_${Date.now()}.txt`
        );

      tempFilesToClean.push(
        concatFilePath
      );

      fs.writeFileSync(
        concatFilePath,
        sceneVideoFiles
          .map(
            (file) =>
              `file '${file
                .replace(
                  /\\/g,
                  "/"
                )
                .replace(
                  /'/g,
                  "'\\''"
                )}'`
          )
          .join("\n"),
        "utf8"
      );

      await runFFmpeg([
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        concatFilePath,
        "-c",
        "copy",
        finalVideoPath,
      ]);

      console.log(
        "🎉 FINAL MP4 CREATED!"
      );

      console.log(
        `📁 ${finalVideoPath}`
      );

      return {
        finalVideo:
          finalVideoPath,
        sceneVideoPaths:
          sceneVideoFiles,
      };

    } finally {
      // Cleanup temp files
      for (
        const file of
        tempFilesToClean
      ) {
        if (
          fs.existsSync(file)
        ) {
          try {
            fs.unlinkSync(
              file
            );
          } catch (
            cleanupError
          ) {
            console.warn(
              `⚠️ Could not clean ${file}: ${cleanupError.message}`
            );
          }
        }
      }
    }
  };

// ==========================================
// HEALTH CHECK
// ==========================================

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "AI YouTube Video Creator API is running",
  });
});

// ============================================================
// CREATE VIDEO PROJECT
// ============================================================

app.post("/api/videos", async (req, res) => {
  try {
    const { topic, language, duration, category, style } = req.body;

    if (!topic || !language || !duration || !category || !style) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided.",
      });
    }

    const videoProject = await VideoProject.create({
      topic,
      language,
      duration,
      category,
      style,
    });

    res.status(201).json({
      success: true,
      message: "Video project created successfully",
      project: videoProject,
    });
  } catch (error) {
    console.error("Create project error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create video project",
      error: error.message,
    });
  }
});

// ============================================================
// GET ALL VIDEO PROJECTS
// ============================================================

app.get("/api/videos", async (req, res) => {
  try {
    const projects = await VideoProject.find().sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      count: projects.length,
      projects,
    });
  } catch (error) {
    console.error("Get projects error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get video projects",
      error: error.message,
    });
  }
});

// ============================================================
// PEXELS SEARCH
// ============================================================

app.get("/api/videos/search-pexels", async (req, res) => {
  try {
    const { query, perPage = 12 } = req.query;

    if (!query || !query.trim()) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    if (!process.env.PEXELS_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "PEXELS_API_KEY is missing",
      });
    }

    console.log(`🔎 Pexels search: ${query}`);

    const response = await axios.get(
      "https://api.pexels.com/v1/search",
      {
        headers: {
          Authorization: process.env.PEXELS_API_KEY,
        },
        params: {
          query: query.trim(),
          orientation: "landscape",
          per_page: Math.min(Number(perPage) || 12, 30),
        },
        timeout: 30000,
      }
    );

    const photos = response.data?.photos || [];

    const formattedPhotos = photos.map((photo) => ({
      id: photo.id,
      url: photo.url,
      photographer: photo.photographer,
      photographerUrl: photo.photographer_url,
      width: photo.width,
      height: photo.height,
      alt: photo.alt || "",
      src: {
        original: photo.src?.original,
        large2x: photo.src?.large2x,
        large: photo.src?.large,
        medium: photo.src?.medium,
        small: photo.src?.small,
        landscape: photo.src?.landscape,
        portrait: photo.src?.portrait,
        tiny: photo.src?.tiny,
      },
    }));

    console.log(`✅ Pexels returned ${formattedPhotos.length} images`);

    return res.status(200).json({
      success: true,
      query,
      totalResults: response.data?.total_results || 0,
      photos: formattedPhotos,
    });
  } catch (error) {
    console.error(
      "❌ Pexels search failed:",
      error.response?.data || error.message
    );

    return res.status(500).json({
      success: false,
      message: "Pexels search failed",
      error: error.response?.data || error.message,
    });
  }
});

// ============================================================
// UPLOAD USER IMAGES
// ============================================================

app.post(
  "/api/videos/upload-image",
  uploadImages.array("images", 20),
  async (req, res) => {
    try {
      console.log("📁 User image upload request received");

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Please upload at least one image",
        });
      }

      const images = req.files.map((file, index) => ({
        id: `local-${Date.now()}-${index}`,
        source: "local",
        originalName: file.originalname,
        fileName: file.filename,
        url: `http://localhost:${PORT}/output/images/${file.filename}`,
        duration: 5,
        mimeType: file.mimetype,
        size: file.size,
      }));

      console.log(`✅ ${images.length} image(s) uploaded`);

      return res.status(201).json({
        success: true,
        message: "Images uploaded successfully",
        images,
      });
    } catch (error) {
      console.error("❌ Image upload failed:", error.message);
      return res.status(500).json({
        success: false,
        message: "Image upload failed",
        error: error.message,
      });
    }
  }
);

// ============================================================
// GET SINGLE PROJECT
// ============================================================

app.get("/api/videos/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    const project = await VideoProject.findById(id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Video project not found",
      });
    }

    res.status(200).json({
      success: true,
      project,
    });
  } catch (error) {
    console.error("Get single project error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get video project",
      error: error.message,
    });
  }
});

// ============================================================
// UPDATE PROJECT
// ============================================================

app.put("/api/videos/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    const { topic, language, duration, category, style } = req.body;

    const updatedProject = await VideoProject.findByIdAndUpdate(
      id,
      { topic, language, duration, category, style },
      { new: true, runValidators: true }
    );

    if (!updatedProject) {
      return res.status(404).json({
        success: false,
        message: "Video project not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Video project updated successfully",
      project: updatedProject,
    });
  } catch (error) {
    console.error("Update project error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update video project",
      error: error.message,
    });
  }
});

// ============================================================
// DELETE PROJECT
// ============================================================

app.delete("/api/videos/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    const deletedProject = await VideoProject.findByIdAndDelete(id);

    if (!deletedProject) {
      return res.status(404).json({
        success: false,
        message: "Video project not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Video project deleted successfully",
      project: deletedProject,
    });
  } catch (error) {
    console.error("Delete project error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete video project",
      error: error.message,
    });
  }
});

// ============================================================
// GENERATE SCRIPT
// ============================================================

app.post("/api/videos/:id/generate-script", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    const project = await VideoProject.findById(id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Video project not found",
      });
    }

    project.status = "script_generating";
    await project.save();

    const scenes = await generateStructuredScript(project);

    project.script = scenes;
    project.status = "script_generated";
    const savedProject = await project.save();

    res.status(200).json({
      success: true,
      message: "AI script generated successfully",
      project: savedProject,
    });
  } catch (error) {
    console.error("Script generation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate script",
      error: error.message,
    });
  }
});

// ============================================================
// GENERATE SCRIPT ONLY
// ============================================================

app.post("/api/videos/generate-script-only", async (req, res) => {
  try {
    const { topic, language, duration, category, style } = req.body;

    if (!topic || !language || !duration || !category || !style) {
      return res.status(400).json({
        success: false,
        message: "All production parameters are required.",
      });
    }

    console.log("📝 SCRIPT-ONLY GENERATION STARTED");

    const durationMatch = String(duration).match(/\d+/);
    const durationMinutes = durationMatch ? Number(durationMatch[0]) : 5;

    const tempProject = {
      topic,
      language,
      duration: durationMinutes,
      category,
      style,
    };

    const scenes = await generateStructuredScript(tempProject);

    if (!Array.isArray(scenes) || scenes.length === 0) {
      throw new Error("AI returned no scenes.");
    }

    const normalizedScenes = scenes.map((scene, index) => ({
      sceneNumber: index + 1,
      duration: Number(scene.duration) || 30,
      visualDescription: String(scene.visualDescription || "").trim(),
      narrationText: String(scene.narrationText || "").trim(),
    }));

    const totalDuration = normalizedScenes.reduce(
      (total, scene) => total + Number(scene.duration || 0),
      0
    );

    return res.status(200).json({
      success: true,
      message: "AI script generated successfully.",
      script: normalizedScenes,
      totalScenes: normalizedScenes.length,
      totalDuration,
      nextStep: "script_editor",
    });
  } catch (error) {
    console.error("❌ Script-only generation failed:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to generate AI script.",
      error: error.message,
    });
  }
});

// ============================================================
// MASTER AI VIDEO PIPELINE
// ============================================================

app.post("/api/videos/pipeline-process", async (req, res) => {
  try {
    const { topic, language, duration, category, style } = req.body;

    if (!topic || !language || !duration || !category || !style) {
      return res.status(400).json({
        success: false,
        message: "Missing production parameters.",
      });
    }

    if (!process.env.PEXELS_API_KEY) {
      throw new Error("PEXELS_API_KEY is missing in backend/.env");
    }

    const durationMatch = String(duration).match(/\d+/);
    const durationMinutes = durationMatch ? Number(durationMatch[0]) : 5;
    const targetDurationSeconds = durationMinutes * 60;

    const tempProject = {
      topic,
      language,
      duration: durationMinutes,
      category,
      style,
    };

    const compiledScenes = [];
    let totalAudioDuration = 0;
    let nextSceneNumber = 1;
    let generationRound = 1;
    const MAX_ROUNDS = 10;

    // Stage 1 + 2: Dynamic Script + TTS
    while (
      totalAudioDuration < targetDurationSeconds &&
      generationRound <= MAX_ROUNDS
    ) {
      const remainingSeconds = targetDurationSeconds - totalAudioDuration;

      const batchProject = {
        ...tempProject,
        duration: Math.max(1, Math.ceil(remainingSeconds / 60)),
        continuation: generationRound > 1,
      };

      const batchScenes = await generateStructuredScript(batchProject);

      if (!Array.isArray(batchScenes) || batchScenes.length === 0) {
        throw new Error("AI returned no scenes.");
      }

      for (const scene of batchScenes) {
        if (totalAudioDuration >= targetDurationSeconds) break;

        const currentSceneNumber = nextSceneNumber++;
        const audioParts = await googleTTS.getAllAudioBase64(
          scene.narrationText,
          {
            lang: language === "Telugu" ? "te" : "en",
            slow: false,
            host: "https://translate.google.com",
            timeout: 30000,
          }
        );

        if (!audioParts || !Array.isArray(audioParts) || audioParts.length === 0) {
          throw new Error(`No audio returned for Scene ${currentSceneNumber}`);
        }

        const timestamp = Date.now();
        const tempAudioFiles = [];

        for (let i = 0; i < audioParts.length; i++) {
          const tempFileName = `scene_${currentSceneNumber}_part_${i}_${timestamp}.mp3`;
          const tempFilePath = path.join(audioFolder, tempFileName);
          fs.writeFileSync(tempFilePath, Buffer.from(audioParts[i].base64, "base64"));
          tempAudioFiles.push(tempFilePath);
        }

        const concatFile = path.join(
          audioFolder,
          `audio_concat_${currentSceneNumber}_${timestamp}.txt`
        );
        const concatContent = tempAudioFiles
          .map((file) => `file '${file.replace(/\\/g, "/").replace(/'/g, "'\\''")}'`)
          .join("\n");
        fs.writeFileSync(concatFile, concatContent, "utf8");

        const audioFileName = `voice_scene_${currentSceneNumber}_${timestamp}.mp3`;
        const audioFilePath = path.join(audioFolder, audioFileName);

        await runFFmpeg([
          "-y",
          "-f",
          "concat",
          "-safe",
          "0",
          "-i",
          concatFile,
          "-c:a",
          "libmp3lame",
          "-b:a",
          "128k",
          audioFilePath,
        ]);

        tempAudioFiles.forEach((file) => {
          if (fs.existsSync(file)) fs.unlinkSync(file);
        });
        if (fs.existsSync(concatFile)) fs.unlinkSync(concatFile);

        const actualDuration = await getAudioDuration(audioFilePath);
        const remainingBeforeScene = targetDurationSeconds - totalAudioDuration;

        if (actualDuration > remainingBeforeScene) {
          const trimmedFileName = `voice_scene_${currentSceneNumber}_${timestamp}_trimmed.mp3`;
          const trimmedFilePath = path.join(audioFolder, trimmedFileName);

          await runFFmpeg([
            "-y",
            "-i",
            audioFilePath,
            "-t",
            String(remainingBeforeScene),
            "-c:a",
            "libmp3lame",
            "-b:a",
            "128k",
            trimmedFilePath,
          ]);

          fs.unlinkSync(audioFilePath);
          const finalDuration = await getAudioDuration(trimmedFilePath);

          compiledScenes.push({
            ...scene,
            sceneNumber: currentSceneNumber,
            duration: finalDuration,
            audioUrl: `http://localhost:${PORT}/output/audio/${trimmedFileName}`,
            audioPath: trimmedFilePath,
          });

          totalAudioDuration += finalDuration;
          break;
        }

        compiledScenes.push({
          ...scene,
          sceneNumber: currentSceneNumber,
          duration: actualDuration,
          audioUrl: `http://localhost:${PORT}/output/audio/${audioFileName}`,
          audioPath: audioFilePath,
        });

        totalAudioDuration += actualDuration;
      }

      generationRound++;
    }

    // Stage 3: Pexels Image Visuals
    const buildPexelsQuery = (scene) => {
      const description = String(scene.visualDescription || "")
        .replace(/[^a-zA-Z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      const text = description.toLowerCase();
      const peopleKeywords = [
        "person", "people", "man", "woman", "investor", "businessman",
        "family", "student", "trader", "analyst"
      ];
      const hasPeople = peopleKeywords.some((word) => text.includes(word));

      let query = hasPeople ? `Indian people ${description}` : `India ${description}`;
      if (topic) query += ` ${topic}`;

      return query.split(/\s+/).filter(Boolean).slice(0, 15).join(" ");
    };

    const finalScenes = [];

    for (const scene of compiledScenes) {
      const searchQuery = buildPexelsQuery(scene);

      const response = await axios.get("https://api.pexels.com/v1/search", {
        headers: { Authorization: process.env.PEXELS_API_KEY },
        params: {
          query: searchQuery,
          orientation: "landscape",
          size: "large",
          per_page: 15,
        },
        timeout: 30000,
      });

      const photos = response.data?.photos || [];
      if (photos.length === 0) {
        throw new Error(`No Pexels images found for "${searchQuery}"`);
      }

      const sortedPhotos = [...photos].sort((a, b) => {
        const aPixels = Number(a.width || 0) * Number(a.height || 0);
        const bPixels = Number(b.width || 0) * Number(b.height || 0);
        return bPixels - aPixels;
      });

      const selectedPhoto = sortedPhotos[0];
      const imageUrlFromPexels =
        selectedPhoto?.src?.landscape ||
        selectedPhoto?.src?.large2x ||
        selectedPhoto?.src?.large;

      const imageFileName = `scene_${scene.sceneNumber}_${Date.now()}.jpg`;
      const imagePath = path.join(imageUploadFolder, imageFileName);
      await downloadImage(imageUrlFromPexels, imagePath);

      const localImageUrl = `http://localhost:${PORT}/output/images/${imageFileName}`;

      finalScenes.push({
        ...scene,
        imageUrl: localImageUrl,
        imagePath,
        imageSource: "Pexels",
        imageCredit: {
          photographer: selectedPhoto.photographer,
          photographerUrl: selectedPhoto.photographer_url,
          pexelsUrl: selectedPhoto.url,
        },
      });
    }

    res.status(200).json({
      success: true,
      message: "Script, Voice and AI visuals generated successfully!",
      script: finalScenes,
    });
  } catch (error) {
    console.error("❌ Pipeline failure:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================
// FINAL COMPILATION ENDPOINT
// ============================================================

app.post("/api/videos/compile-final", async (req, res) => {
  console.log("======================================");
  console.log("🎬 FINAL VIDEO COMPILATION REQUEST");
  console.log("======================================");

  try {
    const { scenes, topic } = req.body;

    if (!Array.isArray(scenes) || scenes.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Scenes are required",
      });
    }

    const safeTopic = String(topic || "youtube_video")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 80);

    const outputName = `${safeTopic || "youtube_video"}_${Date.now()}.mp4`;

    const result = await createCompleteVideo({
      scenes,
      outputName,
    });

    const finalVideoPath = result.finalVideo;
    const finalVideoName = path.basename(finalVideoPath);
    const videoUrl = `http://localhost:${PORT}/output/videos/${finalVideoName}`;

    return res.status(200).json({
      success: true,
      message: "Final video created successfully",
      videoUrl,
      videoPath: finalVideoPath,
      topic,
      scenes: scenes.length,
      sceneVideoPaths: result.sceneVideoPaths || [],
    });
  } catch (error) {
    console.error("❌ Final video compilation failed:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Final video compilation failed",
      error: error.message,
    });
  }
});

// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});