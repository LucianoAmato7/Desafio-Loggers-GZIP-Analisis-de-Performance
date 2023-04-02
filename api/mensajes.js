import mongoose from "mongoose";
import dotenv from 'dotenv';
import { MsjSchema } from "../DB/config.js"
import { logger } from "../logger/winston.js";
dotenv.config();

const urlMongoDB = process.env.URLMONGODB

const model = mongoose.model("messages", MsjSchema);

class ApiMsjMongoDB {
  constructor() {
    this.model = model
    this.route = urlMongoDB
  }

  async ListarMsjs() {
      try{
        let msjs = await this.model.find({})
        return msjs
      }catch(error){
        logger.error(`Error en la API de mensajes: ${error}`);
      }
  }

  async guardarMsj(data) {
      try{
        const newMsj = new this.model(data);
        await newMsj.save();
        console.log("Mensaje guardado con exito");
      }catch(error){
        logger.error(`Error en la API de mensajes: ${error}`);
      }
  }
}

export default ApiMsjMongoDB;
