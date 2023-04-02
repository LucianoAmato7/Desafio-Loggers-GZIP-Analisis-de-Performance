import express from "express";
import ApiProdsMongoDB from "./api/productos.js";
import ApiMsjMongoDB from "./api/mensajes.js";
import handlebars from "express-handlebars";
import { Server } from "socket.io";
import { createServer } from "http";
import cookieParser from "cookie-parser";
import session from "express-session";
import MongoStore from "connect-mongo";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import minimist from "minimist";
import path from "path";
import { fork } from "child_process";
import os from "os";
import cluster from "cluster";
import dotenv from "dotenv";
import compression from "compression";
import { logger } from "./logger/winston.js";
import { UserSchema } from "./DB/config.js"

const gzipMiddleware = compression();

dotenv.config();

const numCPUs = os.cpus().length;

const args = minimist(process.argv.slice(2), []);

const urlMongoDB = process.env.URLMONGODB;

const app = express();
const server = createServer(app);
const io = new Server(server);

const apiProdsMongoDB = new ApiProdsMongoDB();
const apiMsjMongoDB = new ApiMsjMongoDB();

//--CONFIGURACION DE MONDODB PARA USUARIOS
mongoose.set("strictQuery", false);

const model = mongoose.model("users", UserSchema);

app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.engine(
  "hbs",
  handlebars({
    extname: "*.hbs",
    defaultLayout: "index.hbs",
  })
);

app.set("view engine", "hbs");
app.set("views", "./views");
app.use(express.static("views/layouts"));

//GUARDA LA SESSION EN MONGODB
app.use(
  session({
    store: MongoStore.create({
      mongoUrl: urlMongoDB,
    }),
    secret: "secret-key",
    resave: true,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 60 * 10000 }, // 10 minutos
    rolling: true,
  })
);

//PASSPORT
app.use(passport.initialize());
app.use(passport.session());

//ESTRATEGIA DE LOGIN
passport.use(
  "login",
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    async (email, password, done) => {
      const isValidPassword = (user, password) => {
        return bcrypt.compareSync(password, user.password);
      };

      try {
        await mongoose.connect(urlMongoDB, {
          serverSelectionTimeoutMS: 10000,
        });
        try {
          const user = await model.findOne({ email: email });
          if (!user) {
            return done(null, false);
          }
          if (!isValidPassword(user, password)) {
            return done(null, false);
          }
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      } catch (err) {
        console.log(
          `Error al conectar la base de datos en la strategy 'Login': ${err}`
        );
      } finally {
        mongoose.disconnect().catch((err) => {
          throw new Error("error al desconectar la base de datos");
        });
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    await mongoose.connect(urlMongoDB, {
      serverSelectionTimeoutMS: 10000,
    });
    try {
      const user = await model.findById(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  } catch (err) {
    console.log(
      `Error al conectar la base de datos en el "deserializeUser": ${err}`
    );
  } finally {
    mongoose.disconnect().catch((err) => {
      throw new Error("error al desconectar la base de datos");
    });
  }
});

function checkAuthentication(req, res, next) {
  if (req.isAuthenticated()) {
    next();
  } else {
    res.redirect("/login");
  }
}

//LOGIN
app.get("/login", (req, res) => {
  logger.info(
    `Se ha recibido una petición ${req.method} en la ruta ${req.originalUrl}`
  );
  res.render("login");
});

app.post(
  "/login",
  passport.authenticate("login", {
    failureRedirect: "/faillogin",
  }),
  (req, res) => {
    logger.info(
      `Se ha recibido una petición ${req.method} en la ruta ${req.originalUrl}`
    );
    const { email } = req.body;
    req.session.email = email;
    res.redirect("/");
  }
);

//REGISTER
app.get("/register", (req, res) => {
  logger.info(
    `Se ha recibido una petición ${req.method} en la ruta ${req.originalUrl}`
  );
  res.render("register");
});

app.post("/register", (req, res) => {
  logger.info(
    `Se ha recibido una petición ${req.method} en la ruta ${req.originalUrl}`
  );

  const { name, email, password } = req.body;

  const user = { username: name, email: email, password: password };

  async function RegisterUser(password) {
    try {
      await mongoose.connect(urlMongoDB, {
        serverSelectionTimeoutMS: 10000,
      });
      try {
        let users = await model.find({});
        if (users.some((u) => u.email == user.email)) {
          console.log("El usuario ya existe");
          res.redirect("/failregister");
        } else {
          user.password = password;
          const newUser = new model(user);
          await newUser.save();
          console.log("Usuario registrado con exito");
          res.redirect("/login");
        }
      } catch (error) {
        console.log(
          `Error en la query de la base de datos, en funcion RegisterUser: ${error}`
        );
      }
    } catch (err) {
      console.log(
        `Error al conectar la base de datos en el "deserializeUser": ${err}`
      );
    } finally {
      mongoose.disconnect().catch((err) => {
        throw new Error("error al desconectar la base de datos");
      });
    }
  }

  //ENCRIPTO LA CONTRASEÑA
  const saltRounds = 10;
  bcrypt.hash(password, saltRounds, (err, hash) => {
    RegisterUser(hash);
  });
});

//INICIO
app.get("/", checkAuthentication, (req, res) => {
  logger.info(
    `Se ha recibido una petición ${req.method} en la ruta ${req.originalUrl}`
  );

  req.session.cookie.expires = new Date(Date.now() + 600000);

  const email = req.session.email;

  res.render("inicio", { email });

  io.on("connection", (socket) => {
    console.log("Nuevo cliente conectado");

    //MSJS

    apiMsjMongoDB.ListarMsjs().then((msjs) => {
      socket.emit("mensajes", msjs);
    });

    setTimeout(() => {
      socket.on("nuevo-mensaje", (data) => {
        apiMsjMongoDB
          .guardarMsj(data)
          .then(() => {
            console.log("Mensaje cargado en la base de datos");
            return apiMsjMongoDB.ListarMsjs();
          })
          .then((msj) => {
            io.sockets.emit("mensajes", msj);
            console.log("Vista de mensajes actualizada");
          });
      });
    }, 2000);

    //PRODS

    apiProdsMongoDB.GetProds().then((prods) => {
      socket.emit("productos", prods);
    });

    socket.on("nuevo-producto", (data) => {
      apiProdsMongoDB
        .CreateProd(data)
        .then(() => {
          console.log("Producto cargado en la base de datos");
          return apiProdsMongoDB.GetProds();
        })
        .then((prods) => {
          io.sockets.emit("productos", prods);
          console.log("Vista de productos actualizada");
        });
    });
  });
});

//FALLA AL LOGEAR
app.get("/faillogin", (req, res) => {
  logger.info(
    `Se ha recibido una petición ${req.method} en la ruta ${req.originalUrl}`
  );

  res.render("faillogin");
});

//FALLA AL REGISTRAR
app.get("/failregister", (req, res) => {
  logger.info(
    `Se ha recibido una petición ${req.method} en la ruta ${req.originalUrl}`
  );

  res.render("failregister");
});

//LOG OUT
app.post("/logout", checkAuthentication, (req, res) => {
  logger.info(
    `Se ha recibido una petición ${req.method} en la ruta ${req.originalUrl}`
  );

  const email = req.session.email;
  req.session.destroy((error) => {
    if (error) {
      console.log(error);
      return;
    } else {
      res.render("logout", { email });
    }
  });
});

//MOCK - FAKE PRODS
app.get("/api/productos-test", (req, res) => {
  logger.info(
    `Se ha recibido una petición ${req.method} en la ruta ${req.originalUrl}`
  );

  const productosFake = apiProdsSQL.FakeProds();
  res.render("productos-test", { productosFake });
});

//INFO UTILIZANDO EL OBJETO PROCESS
app.get("/info", gzipMiddleware, (req, res) => {
  logger.info(
    `Se ha recibido una petición ${req.method} en la ruta ${req.originalUrl}`
  );

  const info = {
    args: args._[0] || args["port"] || args["p"] || JSON.stringify(args),
    platform: process.platform,
    version: process.version,
    memory: process.memoryUsage().rss,
    path: process.cwd(),
    pid: process.pid,
    folder: path.dirname(new URL(import.meta.url).pathname),
    numCPUs: numCPUs,
  };

  res.render("info", { info });
});

//CHILD PROCESS
app.get("/api/randoms", (req, res) => {
  logger.info(
    `Se ha recibido una petición ${req.method} en la ruta ${req.originalUrl}`
  );

  const cant = Number(req.query.cant) || 10e7;

  // const child = fork("./api/randoms.js");

  // child.send(cant);

  // child.on("message", (result) => {
  //   res.json(result);
  // });
});

//En el caso de requerir una ruta no implementada en el servidor:
app.use("*", (req, res) => {
  logger.warn(
    `Se ha recibido una petición ${req.method} en la ruta ${req.originalUrl} que no existe`
  );
  let fullUrl = req.protocol + "://" + req.get("host") + req.originalUrl;
  res.status(404).send({
    error: -2,
    description: `ruta ${fullUrl} método ${req.method} no implementada`,
  });
});

//SERVIDOR
// ----------------------------------------------|

const modo = args["m"];

const PORT = args._[0] || args["port"] || args["p"] || 8080;

if (modo == "cluster" && cluster.isPrimary) {
  console.log(
    `Worker maestro ejecuntadose con pid ${process.pid}. Server listening on ${PORT}`
  );

  for (let i = 0; i < numCPUs - 1; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker) => {
    console.log(`Worker died: ${worker.process.pid}`);
    cluster.fork();
  });
} else {
  server.listen(PORT, () => {
    console.log(
      `Servidor escuchando en el puerto ${PORT}. PID: ${process.pid}`
    );
  });

  server.on("error", (error) => {
    console.log(`Error en servidor: ${error}`);
  });
}
