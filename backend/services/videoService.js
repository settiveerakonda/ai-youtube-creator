const fs = require("fs");
const path = require("path");

const {
  runFFmpeg,
  getAudioDuration,
  checkFileExists,
} = require("../utils/ffmpeg");

// ======================================================
// DIRECTORIES
// ======================================================

const SCENE_VIDEO_DIR = path.join(
  __dirname,
  "..",
  "public",
  "scene-videos"
);

const FINAL_VIDEO_DIR = path.join(
  __dirname,
  "..",
  "public",
  "videos"
);

const TEMP_DIR = path.join(
  __dirname,
  "..",
  "public",
  "temp"
);

fs.mkdirSync(SCENE_VIDEO_DIR, { recursive: true });
fs.mkdirSync(FINAL_VIDEO_DIR, { recursive: true });
fs.mkdirSync(TEMP_DIR, { recursive: true });

// ======================================================
// SETTINGS
// ======================================================

// Captions are OFF by default.
//
// Why?
// Your previous FFmpeg error was caused by the drawtext
// filter chain. The actual video/audio pipeline works.
//
// Later, if you have proper Unicode fonts installed,
// you can enable captions with:
//
// ENABLE_CAPTIONS=true
//
// Default = false
const ENABLE_CAPTIONS =
  String(process.env.ENABLE_CAPTIONS || "false").toLowerCase() ===
  "true";

// ======================================================
// CREATE CAPTION CHUNKS
// ======================================================

const createCaptionChunks = (
  narrationText,
  wordsPerCaption = 7
) => {
  const words = String(narrationText || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const chunks = [];

  for (
    let i = 0;
    i < words.length;
    i += wordsPerCaption
  ) {
    chunks.push(
      words
        .slice(i, i + wordsPerCaption)
        .join(" ")
    );
  }

  return chunks;
};

// ======================================================
// SRT TIME FORMAT
// ======================================================

const formatSrtTime = (seconds) => {
  const safeSeconds = Math.max(
    0,
    Number(seconds) || 0
  );

  const hours = Math.floor(
    safeSeconds / 3600
  );

  const minutes = Math.floor(
    (safeSeconds % 3600) / 60
  );

  const secs = Math.floor(
    safeSeconds % 60
  );

  const milliseconds = Math.floor(
    (safeSeconds - Math.floor(safeSeconds)) *
      1000
  );

  return (
    String(hours).padStart(2, "0") +
    ":" +
    String(minutes).padStart(2, "0") +
    ":" +
    String(secs).padStart(2, "0") +
    "," +
    String(milliseconds).padStart(3, "0")
  );
};

// ======================================================
// CREATE SRT CAPTIONS
// ======================================================

const createSrtFile = async ({
  narrationText,
  audioDuration,
}) => {
  const chunks = createCaptionChunks(
    narrationText,
    7
  );

  if (!chunks.length) {
    return null;
  }

  const totalCharacters =
    chunks.reduce(
      (total, chunk) =>
        total + chunk.length,
      0
    );

  let currentTime = 0;

  const entries = [];

  for (
    let i = 0;
    i < chunks.length;
    i++
  ) {
    const chunk = chunks[i];

    const ratio =
      totalCharacters > 0
        ? chunk.length / totalCharacters
        : 1 / chunks.length;

    let duration =
      audioDuration * ratio;

    duration = Math.max(
      duration,
      1
    );

    const startTime =
      currentTime;

    let endTime =
      currentTime + duration;

    if (
      endTime >
      audioDuration
    ) {
      endTime =
        audioDuration;
    }

    if (
      endTime <= startTime
    ) {
      break;
    }

    // Split into two lines.
    const words =
      chunk.split(/\s+/);

    const middle =
      Math.ceil(
        words.length / 2
      );

    const line1 =
      words
        .slice(0, middle)
        .join(" ");

    const line2 =
      words
        .slice(middle)
        .join(" ");

    const caption =
      line2
        ? `${line1}\n${line2}`
        : line1;

    entries.push(
      [
        String(i + 1),
        `${formatSrtTime(startTime)} --> ${formatSrtTime(endTime)}`,
        caption,
        "",
      ].join("\n")
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

  const srtContent =
    entries.join("\n");

  const srtPath =
    path.join(
      TEMP_DIR,
      `captions_${Date.now()}.srt`
    );

  // UTF-8 is important for:
  // Telugu
  // Hindi
  // English
  fs.writeFileSync(
    srtPath,
    "\uFEFF" + srtContent,
    "utf8"
  );

  console.log(
    `📝 SRT captions created: ${srtPath}`
  );

  return srtPath;
};

// ======================================================
// CREATE CAPTION FILTER
// ======================================================

const createCaptionFilter = (
  srtPath
) => {
  if (!srtPath) {
    return null;
  }

  // Convert Windows path to FFmpeg-friendly path.
  let escapedPath =
    srtPath
      .replace(/\\/g, "/")
      .replace(/:/g, "\\:");

  /*
   * subtitles filter is much safer than creating a huge
   * drawtext chain.
   *
   * It also avoids commas, quotes and newlines inside
   * drawtext expressions.
   */

  return (
    `subtitles='${escapedPath}'` +
    `:force_style='` +
    `FontSize=18,` +
    `Alignment=2,` +
    `MarginV=35,` +
    `PrimaryColour=&H00FFFFFF,` +
    `OutlineColour=&H00000000,` +
    `Outline=2,` +
    `BorderStyle=1` +
    `'`
  );
};

// ======================================================
// CREATE CAPTION FILTERS
// ======================================================

const createCaptionFilters = async ({
  narrationText,
  audioPath,
}) => {
  const audioDuration =
    await getAudioDuration(
      audioPath
    );

  if (!ENABLE_CAPTIONS) {
    console.log(
      "📝 Captions disabled - skipping subtitle filter."
    );

    return {
      audioDuration,
      filters: [],
      srtPath: null,
    };
  }

  try {
    const srtPath =
      await createSrtFile({
        narrationText,
        audioDuration,
      });

    if (!srtPath) {
      return {
        audioDuration,
        filters: [],
        srtPath: null,
      };
    }

    const captionFilter =
      createCaptionFilter(
        srtPath
      );

    return {
      audioDuration,
      filters: captionFilter
        ? [captionFilter]
        : [],
      srtPath,
    };
  } catch (error) {
    console.warn(
      "⚠️ Caption generation failed."
    );

    console.warn(
      error.message
    );

    // IMPORTANT:
    // Caption failure must NOT stop video creation.
    return {
      audioDuration,
      filters: [],
      srtPath: null,
    };
  }
};

// ======================================================
// RESOLVE IMAGE PATH
// ======================================================

const resolveImagePath = (
  image
) => {
  if (!image) {
    return null;
  }

  // Filesystem path
  if (
    image.imagePath &&
    fs.existsSync(
      image.imagePath
    )
  ) {
    return image.imagePath;
  }

  if (
    image.path &&
    fs.existsSync(
      image.path
    )
  ) {
    return image.path;
  }

  const url =
    image.url ||
    image.imageUrl;

  if (!url) {
    return null;
  }

  // URL
  try {
    const parsed =
      new URL(url);

    let pathname =
      decodeURIComponent(
        parsed.pathname
      );

    if (
      pathname.startsWith(
        "/output/"
      )
    ) {
      pathname =
        pathname.substring(
          "/output/".length
        );
    }

    if (
      pathname.startsWith("/")
    ) {
      pathname =
        pathname.substring(1);
    }

    const localPath =
      path.join(
        __dirname,
        "..",
        "public",
        pathname
      );

    if (
      fs.existsSync(
        localPath
      )
    ) {
      return localPath;
    }
  } catch (error) {
    // Not a valid URL.
  }

  // Relative path
  const cleanPath =
    String(url)
      .replace(
        /^https?:\/\/[^/]+/,
        ""
      )
      .replace(
        /^\/output/,
        ""
      )
      .replace(
        /^\//,
        ""
      );

  const possiblePaths = [
    path.join(
      __dirname,
      "..",
      "public",
      cleanPath
    ),

    path.join(
      __dirname,
      "..",
      cleanPath
    ),

    path.resolve(
      cleanPath
    ),
  ];

  for (
    const possiblePath of possiblePaths
  ) {
    if (
      fs.existsSync(
        possiblePath
      )
    ) {
      return possiblePath;
    }
  }

  return null;
};

// ======================================================
// NORMALIZE SCENE IMAGES
// ======================================================

const normalizeSceneImages = (
  scene
) => {
  // New format
  if (
    Array.isArray(
      scene.images
    ) &&
    scene.images.length > 0
  ) {
    return scene.images
      .map(
        (
          image,
          index
        ) => ({
          ...image,

          duration:
            Number(
              image.duration
            ) || 5,

          order:
            image.order ||
            index + 1,
        })
      )
      .filter(
        (image) =>
          image.url ||
          image.imageUrl ||
          image.imagePath ||
          image.path
      )
      .sort(
        (a, b) =>
          (Number(a.order) || 0) -
          (Number(b.order) || 0)
      );
  }

  // Legacy format
  if (
    scene.imagePath ||
    scene.imageUrl
  ) {
    return [
      {
        id:
          `legacy-${scene.sceneNumber}`,

        source:
          "legacy",

        imagePath:
          scene.imagePath,

        url:
          scene.imageUrl,

        duration:
          Number(
            scene.duration
          ) || 5,
      },
    ];
  }

  return [];
};

// ======================================================
// CREATE IMAGE SEGMENT
// ======================================================

const createImageSegment = async ({
  imagePath,
  duration,
  outputPath,
  index,
  sceneNumber,
}) => {
  checkFileExists(
    imagePath
  );

  const safeDuration =
    Math.max(
      0.5,
      Number(duration) || 5
    );

  console.log(
    `🖼️ Scene ${sceneNumber} Image ${
      index + 1
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
      "pad=1280:720:(ow-iw)/2:(oh-ih)/2",
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

  return outputPath;
};

// ======================================================
// JOIN IMAGE SEGMENTS
// ======================================================

const joinImageSegments =
  async ({
    segmentPaths,
    outputPath,
  }) => {
    if (
      !segmentPaths ||
      !segmentPaths.length
    ) {
      throw new Error(
        "No image segments available"
      );
    }

    if (
      segmentPaths.length === 1
    ) {
      fs.copyFileSync(
        segmentPaths[0],
        outputPath
      );

      return outputPath;
    }

    const concatFile =
      path.join(
        TEMP_DIR,
        `images_${Date.now()}.txt`
      );

    const concatContent =
      segmentPaths
        .map(
          (filePath) =>
            `file '${filePath
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
      concatContent,
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
      try {
        if (
          fs.existsSync(
            concatFile
          )
        ) {
          fs.unlinkSync(
            concatFile
          );
        }
      } catch (error) {
        console.warn(
          "⚠️ Could not delete image concat file."
        );
      }
    }

    return outputPath;
  };

// ======================================================
// CREATE SCENE VIDEO
// ======================================================

const createSceneVideo =
  async ({
    scene,
    imagePath,
    audioPath,
  }) => {
    console.log(
      `🎬 Rendering Scene ${scene.sceneNumber}...`
    );

    // ----------------------------------------------
    // AUDIO
    // ----------------------------------------------

    checkFileExists(
      audioPath
    );

    // ----------------------------------------------
    // AUDIO DURATION
    // ----------------------------------------------

    console.log(
      `🎙️ Reading Scene ${scene.sceneNumber} audio duration...`
    );

    const audioDuration =
      await getAudioDuration(
        audioPath
      );

    console.log(
      `🎙️ Scene ${scene.sceneNumber} audio: ${audioDuration.toFixed(
        2
      )} sec`
    );

    // ----------------------------------------------
    // IMAGES
    // ----------------------------------------------

    let sceneImages =
      normalizeSceneImages(
        scene
      );

    // Legacy fallback
    if (
      !sceneImages.length &&
      imagePath
    ) {
      sceneImages = [
        {
          imagePath,
          duration:
            audioDuration,
        },
      ];
    }

    if (
      !sceneImages.length
    ) {
      throw new Error(
        `Scene ${scene.sceneNumber} has no images.`
      );
    }

    console.log(
      `🖼️ Scene ${scene.sceneNumber}: ${sceneImages.length} image(s)`
    );

    // ----------------------------------------------
    // RESOLVE IMAGE PATHS
    // ----------------------------------------------

    const resolvedImages =
      [];

    for (
      let i = 0;
      i <
      sceneImages.length;
      i++
    ) {
      const image =
        sceneImages[i];

      const resolvedPath =
        resolveImagePath(
          image
        );

      if (
        !resolvedPath
      ) {
        throw new Error(
          `Scene ${scene.sceneNumber} Image ${
            i + 1
          } could not be found.\nURL: ${
            image.url ||
            image.imageUrl ||
            "missing"
          }`
        );
      }

      resolvedImages.push({
        ...image,

        imagePath:
          resolvedPath,

        duration:
          Number(
            image.duration
          ) || 5,
      });
    }

    // ----------------------------------------------
    // ADJUST IMAGE DURATIONS
    // ----------------------------------------------

    const requestedDuration =
      resolvedImages.reduce(
        (
          total,
          image
        ) =>
          total +
          image.duration,
        0
      );

    console.log(
      `⏱️ Requested image duration: ${requestedDuration.toFixed(
        2
      )} sec`
    );

    console.log(
      `🎙️ Audio duration: ${audioDuration.toFixed(
        2
      )} sec`
    );

    let imageDurationTotal =
      0;

    const adjustedImages =
      resolvedImages.map(
        (image) => {
          const remaining =
            audioDuration -
            imageDurationTotal;

          if (
            remaining <= 0
          ) {
            return {
              ...image,
              duration: 0,
            };
          }

          const finalDuration =
            Math.min(
              image.duration,
              remaining
            );

          imageDurationTotal +=
            finalDuration;

          return {
            ...image,
            duration:
              finalDuration,
          };
        }
      );

    // Extend last image
    const remainingAudio =
      audioDuration -
      imageDurationTotal;

    if (
      remainingAudio > 0 &&
      adjustedImages.length
    ) {
      const lastIndex =
        adjustedImages.length -
        1;

      adjustedImages[
        lastIndex
      ].duration +=
        remainingAudio;

      console.log(
        `⏱️ Extending last image by ${remainingAudio.toFixed(
          2
        )} sec`
      );
    }

    // Remove zero duration images
    const finalImages =
      adjustedImages.filter(
        (image) =>
          image.duration >
          0
      );

    if (
      !finalImages.length
    ) {
      throw new Error(
        `Scene ${scene.sceneNumber} has no usable images.`
      );
    }

    // ----------------------------------------------
    // CREATE IMAGE SEGMENTS
    // ----------------------------------------------

    const segmentPaths =
      [];

    for (
      let i = 0;
      i <
      finalImages.length;
      i++
    ) {
      const image =
        finalImages[i];

      const segmentPath =
        path.join(
          TEMP_DIR,
          `scene_${scene.sceneNumber}_image_${i}_${Date.now()}.mp4`
        );

      await createImageSegment({
        imagePath:
          image.imagePath,

        duration:
          image.duration,

        outputPath:
          segmentPath,

        index:
          i,

        sceneNumber:
          scene.sceneNumber,
      });

      segmentPaths.push(
        segmentPath
      );
    }

    // ----------------------------------------------
    // JOIN IMAGE SEGMENTS
    // ----------------------------------------------

    const imageVideoPath =
      path.join(
        TEMP_DIR,
        `scene_${scene.sceneNumber}_images_${Date.now()}.mp4`
      );

    await joinImageSegments({
      segmentPaths,

      outputPath:
        imageVideoPath,
    });

    // ----------------------------------------------
    // CAPTIONS
    // ----------------------------------------------

    console.log(
      `📝 Caption mode: ${
        ENABLE_CAPTIONS
          ? "ENABLED"
          : "DISABLED"
      }`
    );

    const {
      filters,
      srtPath,
    } =
      await createCaptionFilters({
        narrationText:
          scene.narrationText,

        audioPath,
      });

    // ----------------------------------------------
    // VIDEO FILTER
    // ----------------------------------------------

    const videoFilters =
      [
        "scale=1280:720:force_original_aspect_ratio=decrease",

        "pad=1280:720:(ow-iw)/2:(oh-ih)/2",

        "format=yuv420p",

        ...filters,
      ];

    const videoFilter =
      videoFilters.join(",");

    // ----------------------------------------------
    // FINAL SCENE VIDEO
    // ----------------------------------------------

    const sceneVideoPath =
      path.join(
        SCENE_VIDEO_DIR,
        `scene_${scene.sceneNumber}_${Date.now()}.mp4`
      );

    console.log(
      `🎬 Combining images + audio${
        filters.length
          ? " + captions"
          : ""
      } for Scene ${scene.sceneNumber}...`
    );

    try {
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

        "-c:v",
        "libx264",

        "-preset",
        "veryfast",

        "-c:a",
        "aac",

        "-b:a",
        "128k",

        "-pix_fmt",
        "yuv420p",

        "-t",
        audioDuration.toFixed(
          3
        ),

        "-shortest",

        sceneVideoPath,
      ]);
    } catch (error) {
      /*
       * If captions are enabled and subtitle rendering
       * fails, retry WITHOUT captions.
       *
       * This prevents the complete video pipeline from
       * failing because of a font/subtitle problem.
       */

      if (
        filters.length > 0
      ) {
        console.warn(
          "⚠️ Caption rendering failed."
        );

        console.warn(
          "🔄 Retrying scene WITHOUT captions..."
        );

        const fallbackFilter = [
          "scale=1280:720:force_original_aspect_ratio=decrease",
          "pad=1280:720:(ow-iw)/2:(oh-ih)/2",
          "format=yuv420p",
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
          fallbackFilter,

          "-c:v",
          "libx264",

          "-preset",
          "veryfast",

          "-c:a",
          "aac",

          "-b:a",
          "128k",

          "-pix_fmt",
          "yuv420p",

          "-t",
          audioDuration.toFixed(
            3
          ),

          "-shortest",

          sceneVideoPath,
        ]);
      } else {
        throw error;
      }
    }

    // ----------------------------------------------
    // CLEANUP
    // ----------------------------------------------

    for (
      const segmentPath of segmentPaths
    ) {
      try {
        if (
          fs.existsSync(
            segmentPath
          )
        ) {
          fs.unlinkSync(
            segmentPath
          );
        }
      } catch (error) {
        console.warn(
          `⚠️ Could not delete segment: ${segmentPath}`
        );
      }
    }

    try {
      if (
        fs.existsSync(
          imageVideoPath
        )
      ) {
        fs.unlinkSync(
          imageVideoPath
        );
      }
    } catch (error) {
      console.warn(
        "⚠️ Could not delete temporary image video."
      );
    }

    // Remove SRT
    if (
      srtPath
    ) {
      try {
        if (
          fs.existsSync(
            srtPath
          )
        ) {
          fs.unlinkSync(
            srtPath
          );
        }
      } catch (error) {
        console.warn(
          "⚠️ Could not delete SRT file."
        );
      }
    }

    console.log(
      `✅ Scene ${scene.sceneNumber}: video created`
    );

    return {
      sceneVideoPath,

      duration:
        audioDuration,
    };
  };

// ======================================================
// JOIN SCENE VIDEOS
// ======================================================

const joinSceneVideos =
  async ({
    sceneVideoPaths,
    outputName,
  }) => {
    if (
      !sceneVideoPaths ||
      !sceneVideoPaths.length
    ) {
      throw new Error(
        "No scene videos available"
      );
    }

    console.log(
      "🎞️ Joining all scene videos..."
    );

    const concatFile =
      path.join(
        FINAL_VIDEO_DIR,
        `concat_${Date.now()}.txt`
      );

    const concatContent =
      sceneVideoPaths
        .map(
          (filePath) =>
            `file '${filePath
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
      concatContent,
      "utf8"
    );

    const finalVideoPath =
      path.join(
        FINAL_VIDEO_DIR,
        outputName ||
          `final_video_${Date.now()}.mp4`
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

        "-c",
        "copy",

        finalVideoPath,
      ]);
    } finally {
      try {
        if (
          fs.existsSync(
            concatFile
          )
        ) {
          fs.unlinkSync(
            concatFile
          );
        }
      } catch (error) {
        console.warn(
          "⚠️ Could not delete final concat file."
        );
      }
    }

    console.log(
      "🎉 FINAL MP4 CREATED!"
    );

    console.log(
      `📁 ${finalVideoPath}`
    );

    return finalVideoPath;
  };

// ======================================================
// CREATE COMPLETE VIDEO
// ======================================================

const createCompleteVideo =
  async ({
    scenes,
    outputName,
    language,
  }) => {
    if (
      !scenes ||
      !Array.isArray(
        scenes
      )
    ) {
      throw new Error(
        "Scenes array is required"
      );
    }

    if (
      scenes.length === 0
    ) {
      throw new Error(
        "At least one scene is required"
      );
    }

    console.log(
      "======================================"
    );

    console.log(
      "🎬 FINAL VIDEO PIPELINE"
    );

    console.log(
      `🎞️ Total scenes: ${scenes.length}`
    );

    if (language) {
      console.log(
        `🌐 Video language: ${language}`
      );
    }

    console.log(
      `📝 Captions: ${
        ENABLE_CAPTIONS
          ? "Enabled"
          : "Disabled"
      }`
    );

    console.log(
      "======================================"
    );

    const sceneVideoPaths =
      [];

    for (
      const scene of scenes
    ) {
      const result =
        await createSceneVideo({
          scene,

          imagePath:
            scene.imagePath,

          audioPath:
            scene.audioPath,
        });

      sceneVideoPaths.push(
        result.sceneVideoPath
      );
    }

    const finalVideo =
      await joinSceneVideos({
        sceneVideoPaths,

        outputName,
      });

    console.log(
      "======================================"
    );

    console.log(
      "🎉 COMPLETE VIDEO PIPELINE FINISHED"
    );

    console.log(
      `📁 FINAL VIDEO: ${finalVideo}`
    );

    console.log(
      "======================================"
    );

    return {
      finalVideo,

      sceneVideoPaths,
    };
  };

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  createCaptionChunks,

  createCaptionFilters,

  createSceneVideo,

  joinSceneVideos,

  createCompleteVideo,
};