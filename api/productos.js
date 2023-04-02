import { faker } from "@faker-js/faker";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { logger } from "../logger/winston.js";
import { ProdsSchema } from "../DB/config.js"
faker.locale = "es";
dotenv.config();

const urlMongoDB = process.env.URLMONGODB;

mongoose.set("strictQuery", false);

const model = mongoose.model("products", ProdsSchema);

class ApiProdsMongoDB {
  constructor() {
    this.model = model;
    this.route = urlMongoDB;
  }

  //Lista todos los productos.
  async GetProds() {
    try {
      await mongoose.connect(this.route, {
        serverSelectionTimeoutMS: 5000,
      });
      try {
        let data = await this.model.find({});
        return data;
      } catch (error) {
        logger.error(`Error en la API de productos: ${error}`);

      }
    } catch (error) {
        logger.error(`Error de la DB en la API de productos: ${error}`);
    } finally {
      mongoose.disconnect().catch((err) => {
        throw new Error("error al desconectar la base de datos");
      });
    }
  }

  //crea un producto. Recibe title, brand, price, thumbnail y stock.
  async CreateProd(data) {
    try {
      await mongoose.connect(this.route, {
        serverSelectionTimeoutMS: 5000,
      });
      try {
        function random(min, max) {
          return Math.floor(Math.random() * (max - min + 1) + min);
        }
        const date = new Date().toLocaleString();
        const prodToAdd = {
          ...data,
          code: random(1, 9999).toString(),
          timestamp: date,
        };
        const newProd = new this.model(prodToAdd);
        await newProd.save();
        console.log("Producto creado con exito");
        return newProd;
      } catch (error) {
        logger.error(`Error en la API de productos: ${error}`);
      }
    } catch (error) {
        logger.error(`Error de la DB en la API de productos: ${error}`);
    } finally {
      mongoose.disconnect().catch((err) => {
        throw new Error("error al desconectar la base de datos");
      });
    }
  }

  FakeProds() {
    const RandomProd = () => {
      return {
        id: faker.database.mongodbObjectId(),
        title: faker.commerce.product(),
        price: faker.commerce.price(),
        //utilizo imagen de prueba ya que el antivirus me informa que los url de imagenes de faker poseen URL:Phishing
        thumbnail: "https://dummyimage.com/300",
      };
    };
    const products = [];
    for (let i = 0; i < 5; i++) {
      products.push(RandomProd());
    }
    return products;
  }
}

export default ApiProdsMongoDB;
