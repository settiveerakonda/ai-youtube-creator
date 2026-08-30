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

fs.mkdirSync(SCENE_VIDEO_DIR, {
  recursive: true,
});

fs.mkdirSync(FINAL_VIDEO_DIR, {
  recursive: true,
});

fs.mkdirSync(TEMP_DIR, {
  recursive: true,
});

// ======================================================
// CREATE CAPTION CHUNKS
// ======================================================

const createCaptionChunks = (
  narrationText,
  wordsPerCaption = 7
) => {
  const words = String(
    narrationText || ""
  )
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
        .slice(
          i,
          i + wordsPerCaption
        )
        .join(" ")
    );
  }

  return chunks;
};

// ======================================================
// ESCAPE FFMPEG TEXT
// ======================================================

const escapeFFmpegText = (text) => {
  return String(text || "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/:/g, "\\:")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]");
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

  const chunks =
    createCaptionChunks(
      narrationText,
      7
    );

  if (!chunks.length) {
    return {
      audioDuration,
      filters: [],
    };
  }

  const totalCharacters =
    chunks.reduce(
      (total, chunk) =>
        total + chunk.length,
      0
    );

  let currentTime = 0;

  const filters = [];

  for (
    let i = 0;
    i < chunks.length;
    i++
  ) {
    const chunk = chunks[i];

    const ratio =
      totalCharacters > 0
        ? chunk.length /
          totalCharacters
        : 1 / chunks.length;

    let duration =
      audioDuration * ratio;

    duration = Math.max(
      duration,
      1.2
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

    // ----------------------------------------------
    // Two-line caption
    // ----------------------------------------------

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

    const text = line2
      ? `${line1}\\n${line2}`
      : line1;

    const safeText =
      escapeFFmpegText(text);

    // ----------------------------------------------
    // Caption filter
    // ----------------------------------------------

    const filter =
      `drawtext=` +
      `fontfile='C\\:/Windows/Fonts/Nirmala.ttf':` +
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

    filters.push(filter);

    console.log(
      `📝 Caption ${i + 1}: ` +
        `${startTime.toFixed(2)}s → ` +
        `${endTime.toFixed(2)}s`
    );

    currentTime = endTime;

    if (
      currentTime >=
      audioDuration
    ) {
      break;
    }
  }

  return {
    audioDuration,
    filters,
  };
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

  // ----------------------------------------------
  // Already a filesystem path
  // ----------------------------------------------

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

  // ----------------------------------------------
  // URL
  // ----------------------------------------------

  const url =
    image.url ||
    image.imageUrl;

  if (!url) {
    return null;
  }

  // ----------------------------------------------
  // Local backend URL
  // Example:
  // http://localhost:5000/output/images/file.jpg
  // ----------------------------------------------

  try {
    const parsed =
      new URL(url);

    let pathname =
      decodeURIComponent(
        parsed.pathname
      );

    // /output/images/file.jpg
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

    // /images/file.jpg
    if (
      pathname.startsWith(
        "/"
      )
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
      fs.existsSync(localPath)
    ) {
      return localPath;
    }
  } catch (error) {
    // Not a valid URL.
  }

  // ----------------------------------------------
  // Relative local path
  // ----------------------------------------------

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
  // ----------------------------------------------
  // NEW FORMAT
  // scene.images[]
  // ----------------------------------------------

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
      );
  }

  // ----------------------------------------------
  // OLD FORMAT
  // scene.imagePath / scene.imageUrl
  // ----------------------------------------------

  if (
    scene.imagePath ||
    scene.imageUrl
  ) {
    return [
      {
        id: `legacy-${scene.sceneNumber}`,

        source: "legacy",

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
    }: ${safeDuration.toFixed(
      2
    )} sec`
  );

  await runFFmpeg([
    "-y",

    "-loop",
    "1",

    "-i",
    imagePath,

    "-t",
    safeDuration.toFixed(
      3
    ),

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
      segmentPaths.length ===
      1
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
    // Audio
    // ----------------------------------------------

    checkFileExists(
      audioPath
    );

    // ----------------------------------------------
    // Get audio duration
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
    // Images
    // ----------------------------------------------

    let sceneImages =
      normalizeSceneImages(
        scene
      );

    // ----------------------------------------------
    // Legacy fallback
    // ----------------------------------------------

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
    // Resolve image paths
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
    // Adjust image durations to audio duration
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

    // ----------------------------------------------
    // IMPORTANT
    //
    // If images are shorter than audio:
    // extend the last image.
    //
    // If images are longer than audio:
    // trim the last image.
    // ----------------------------------------------

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

    // ----------------------------------------------
    // If requested duration is less than audio,
    // extend LAST image.
    // ----------------------------------------------

    const remainingAudio =
      audioDuration -
      imageDurationTotal;

    if (
      remainingAudio >
      0 &&
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

    // Remove zero-duration images.
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
    // Create temporary image videos
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

        index: i,

        sceneNumber:
          scene.sceneNumber,
      });

      segmentPaths.push(
        segmentPath
      );
    }

    // ----------------------------------------------
    // Join all image segments
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
    // Create captions
    // ----------------------------------------------

    console.log(
      `📝 Creating synchronized Telugu captions for Scene ${scene.sceneNumber}...`
    );

    const {
      filters,
    } =
      await createCaptionFilters({
        narrationText:
          scene.narrationText,

        audioPath,
      });

    // ----------------------------------------------
    // Final scene video
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

    const sceneVideoPath =
      path.join(
        SCENE_VIDEO_DIR,
        `scene_${scene.sceneNumber}_${Date.now()}.mp4`
      );

    console.log(
      `🎬 Combining images + audio + captions for Scene ${scene.sceneNumber}...`
    );

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

    // ----------------------------------------------
    // Cleanup temporary files
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
          `⚠️ Could not delete temporary segment: ${segmentPath}`
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

          // ----------------------------------------
          // Legacy support
          // ----------------------------------------

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