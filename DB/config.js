import mongoose from "mongoose";

export const UserSchema = new mongoose.Schema(
  {
    username: String,
    email: {
      type: String,
      unique: true,
    },
    password: {
      type: String,
      unique: true,
    },
  },
  {
    versionKey: false,
  }
);

export const MsjSchema = new mongoose.Schema(
  {
    author: Object,
    fyh: String,
    text: String,
  },
  {
    versionKey: false,
  }
);

export const ProdsSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      unique: true,
    },
    price: String,
    thumbnail: String,
    timestamp: String,
    code: {
      type: String,
      unique: true,
    },
    stock: String,
    brand: String,
  },
  {
    versionKey: false,
  }
);
