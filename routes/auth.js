const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { body, validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const fetchUser = require("../middlewares/fetchUserId");

// Secret key for the JWT sign and verify
const secretJwtKey = "secret";

// Creating new user at POST-> http://localhost:5000/api/auth/signUp , public route

router.post(
  "/signUp",
  // express-validator middleware
  body("name").notEmpty().withMessage("Name can't be empty"),
  body("email").isEmail().withMessage("Not a valid e-mail address"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("password must be atleast 8 chars long"),

  async (req, res) => {
    try {
      const result = validationResult(req);
      // validating the values entered by user
      if (result.array().length !== 0) {
        return res
          .status(401)
          .json({ message: "Invalid user values", errors: result.array() });
      }
      // checking if user email exists
      const user = await User.findOne({ email: req.body.email });
      if (user) {
        return res.status(409).json({
          message: "User with this email already exists",
          errors: [{ msg: "user already exists" }],
        });
      }

      // generating salt and hashing the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(req.body.password, salt);

      // creating amd saving new user into i-notess/users collection
      const newUserBody = { ...req.body, password: hashedPassword };
      const newUser = await new User(newUserBody);
      await newUser.save();

      // generating signed jwt token
      const jwtToken = jwt.sign({ userId: newUser.id }, secretJwtKey);

      res.status(200).json({
        message: "User created successfully",
        jwtToken,
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({
        message: "Unexpected error occured",
        errors: [{ msg: error.message }],
      });
    }
  }
);

// Logging in user at POST-> http://localhost:5000/api/auth/login , public route

router.post(
  "/login",
  // express-validator middleware
  body("email").isEmail().withMessage("Invalid Creds"),
  body("password").isLength({ min: 8 }).withMessage("Invalid Creds"),

  async (req, res) => {
    try {
      const result = validationResult(req);
      // validating the creds entered by user
      if (result.array().length !== 0) {
        return res
          .status(401)
          .json({ message: "Invalid user values", errors: result.array() });
      }
      const { email, password } = req.body;
      // compare the creds
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({
          message: "User does not exists",
        });
      }

      const isValidUser = await bcrypt.compare(password, user.password);
      if (!isValidUser) {
        return res.status(401).json({ message: "Invalid Creds" });
      }

      // generating signed jwt token
      const jwtToken = jwt.sign({ userId: user.id }, secretJwtKey);

      res.status(200).json({
        message: "Login successful",
        jwtToken,
      });
    } catch (error) {
      console.log(error.message);
      res.status(500).json({
        message: "Unexpected error occured",
        errors: [{ msg: error.message }],
      });
    }
  }
);

// Getting user details at POST-> http://localhost:5000/api/auth/getUser , private route

router.get("/getUser", fetchUser, async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId).select("-password");
    if (!user) {
      res.status(400).send(" doesnt exist");
    }
    return res.status(200).send(user);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Unexpected error occured while getUser",
      errors: [{ msg: error.message }],
    });
  }
});

module.exports = router;