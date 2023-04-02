import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const urlMongoDB = process.env.URLMONGODB;

export async function MongoDB_Connect (){
  try {
    await mongoose.connect(urlMongoDB, {
      serverSelectionTimeoutMS: 10000,
    });
  } catch (err) {
    console.log(
      `Error al conectar la base de datos: ${err}`
    );
  }finally{
    console.log('Base de datos MongoDB conectada con exito');
  }
}

export async function MongoDB_Disconnect (){
  try{
    await mongoose.disconnect();
  } catch(err) {
    console.log(`error al desconectar la base de datos: ${err}`)
  }finally{
    console.log('Base de datos MongoDB desconectada con exito');
  }
}

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
