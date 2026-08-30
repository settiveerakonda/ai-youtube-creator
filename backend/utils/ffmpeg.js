const fs = require("fs");
const { execFile } = require("child_process");
const ffmpegPath = require("ffmpeg-static");

// ======================================================
// CHECK FFMPEG
// ======================================================

if (!ffmpegPath) {
  throw new Error(
    "FFmpeg executable not found. Please install ffmpeg-static."
  );
}

// ======================================================
// RUN FFMPEG
// ======================================================

const runFFmpeg = (args) => {
  return new Promise((resolve, reject) => {

    console.log("🎬 Running FFmpeg...");

    execFile(
      ffmpegPath,
      args,
      {
        windowsHide: true,
        maxBuffer: 1024 * 1024 * 20,
      },
      (error, stdout, stderr) => {

        if (error) {
          console.error(
            "❌ FFmpeg error:"
          );

          console.error(
            stderr
          );

          reject(
            new Error(
              stderr ||
              error.message
            )
          );

          return;
        }

        resolve({
          stdout,
          stderr,
        });
      }
    );
  });
};

// ======================================================
// GET AUDIO DURATION
// ======================================================

const getAudioDuration = (
  audioPath
) => {

  return new Promise(
    (resolve, reject) => {

      execFile(
        ffmpegPath,
        [
          "-i",
          audioPath,
        ],
        {
          windowsHide: true,
        },
        (
          error,
          stdout,
          stderr
        ) => {

          const output =
            `${stdout}\n${stderr}`;

          const match =
            output.match(
              /Duration:\s*(\d+):(\d+):([\d.]+)/
            );

          if (!match) {

            reject(
              new Error(
                `Could not detect audio duration: ${audioPath}`
              )
            );

            return;
          }

          const hours =
            Number(match[1]);

          const minutes =
            Number(match[2]);

          const seconds =
            Number(match[3]);

          const totalSeconds =
            hours * 3600 +
            minutes * 60 +
            seconds;

          resolve(
            totalSeconds
          );
        }
      );
    }
  );
};

// ======================================================
// CHECK FILE
// ======================================================

const checkFileExists = (
  filePath
) => {

  if (
    !filePath ||
    !fs.existsSync(filePath)
  ) {
    throw new Error(
      `File not found: ${filePath}`
    );
  }

  return true;
};

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  runFFmpeg,
  getAudioDuration,
  checkFileExists,
};