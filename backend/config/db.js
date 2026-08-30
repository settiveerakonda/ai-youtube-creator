const mongoose = require("mongoose");

// ======================================================
// CONNECT MONGODB
// ======================================================

const connectDB = async () => {
  try {
    const mongoURI =
      process.env.MONGO_URI ||
      process.env.MONGODB_URI;

    if (!mongoURI) {
      throw new Error(
        "MongoDB connection string is missing in .env"
      );
    }

    const connection =
      await mongoose.connect(
        mongoURI
      );

    console.log(
      "MongoDB connected successfully"
    );

    console.log(
      `📦 Database: ${connection.connection.name}`
    );

  } catch (error) {

    console.error(
      "❌ MongoDB connection failed:"
    );

    console.error(
      error.message
    );

    process.exit(1);
  }
};

// ======================================================
// EXPORT
// ======================================================

module.exports = connectDB;