const express = require("express");
const app = express();
const http = require("http").Server(app);
const mongoose = require("mongoose");
const chalk = require("chalk");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const { port, dbUrl } = require("./config/keys").host;
const bodyParser = require("body-parser");
const routes = require("./routes");
const { setIo } = require("./utils/socket/io.utils");
const io = require("socket.io")(http, {
  cors: {
    origin: "*",
  },
});
app.use((req, res, next) => {
  setIo(io);
  req.io = io;
  next();
});

app.use(bodyParser.json({ limit: "50mb" }));
app.use(
  bodyParser.urlencoded({
    limit: "50mb",
    extended: true,
    parameterLimit: 50000,
  })
);
app.use(express.json({ limit: "50mb", extended: true }));

app.use(express.urlencoded({ limit: "50mb", extended: true }));
const corsOptions = {
  origin: "*",
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

app.use(cookieParser());
app.use(morgan("combined"));
// deleteDuplicateTrades();
app.use(routes);
// Connect to MongoDB
// mongoose.set("useCreateIndex", true);
// require("./test");
mongoose
  .connect(dbUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    // useFindAndModify: false,
  })
  .then(() =>
    console.log(`${chalk.green("✓")} ${chalk.blue("MongoDB Connected!")}`)
  )
  .then(async () => {
    http.listen(port, () => {
      console.log(
        `${chalk.green("✓")} ${chalk.blue(
          "Server Started on port"
        )} http://${chalk.bgMagenta.white("localhost")}:${chalk.bgMagenta.white(
          port
        )}`
      );
    });
    // require("./utils/socket/event.utils")(io);
  })
  .catch((err) => console.log(err));
