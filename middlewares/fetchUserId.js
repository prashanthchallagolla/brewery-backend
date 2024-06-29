const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Secret key for the JWT sign and verify
const secretJwtKey = "secret";

const fetchUser = (req, res, next) => {
  const jwtToken = req.header("JWT-Token");
  if (!jwtToken) {
    return res.status(401).json({ message: "Invalid JWT token" });
  }

  //verify the jwt
  try {
    //appending the user id to the request header
    const userId = jwt.verify(jwtToken, secretJwtKey).userId;
    req.userId = userId;
    next();
  } catch (error) {
    return res.status(401).json({ message: error.message });
  }
};

module.exports = fetchUser;