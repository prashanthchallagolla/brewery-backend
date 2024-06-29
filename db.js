const mongoose = require("mongoose");

const connectionURI = "mongodb+srv://prashanthchallagolla:tinkuhani@cluster0.9h8un2i.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const connectToDb = () => {
  mongoose
    .connect(connectionURI)
    .then(() => {
      console.log("Connected to MongoDB");
    })
    .catch((err) => {
      console.error("Error connecting to MongoDB:", err.message);
    });
};

module.exports = connectToDb;