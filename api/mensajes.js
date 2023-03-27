import mongoose from "mongoose";
import dotenv from 'dotenv';
import { logger } from "../logger/winston.js";
dotenv.config();

const urlMongoDB = process.env.URLMONGODB

mongoose.set("strictQuery", false);

const MsjSchema = new mongoose.Schema(
  {
    author: Object,
    fyh: String,
    text: String
  },
  {
    versionKey: false,
  }
);

const model = mongoose.model("messages", MsjSchema);

class ApiMsjMongoDB {
  constructor() {
    this.model = model
    this.route = urlMongoDB
  }

  async ListarMsjs() {
    try{
      await mongoose.connect(this.route, {
        serverSelectionTimeoutMS: 5000,
      });
      try{
        let msjs = await this.model.find({})
        return msjs
      }catch(error){
        logger.error(`Error en la API de mensajes: ${error}`);
      }
    }catch(error){
      logger.error(`Error de la DB en la API de mensajes: ${error}`);
    }finally{
      mongoose.disconnect().catch((err) => {
        throw new Error("error al desconectar la base de datos");
      });
    }
  }

  async guardarMsj(data) {
    try{
      await mongoose.connect(this.route, {
        serverSelectionTimeoutMS: 5000,
      });
      try{
        const newMsj = new this.model(data);
        await newMsj.save();
        console.log("Mensaje guardado con exito");
      }catch(error){
        logger.error(`Error en la API de mensajes: ${error}`);
      }
    }catch(error){
      logger.error(`Error de la DB en la API de mensajes: ${error}`);
    }finally{
      mongoose.disconnect().catch((err) => {
        throw new Error("error al desconectar la base de datos");
      });
    }
  }
}

export default ApiMsjMongoDB;
