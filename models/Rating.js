const mongoose = require("mongoose");

const { Schema } = mongoose;

const ratingSchema = new Schema({
  breweryId: { type: String, required: true, unique: true },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  reviewCount: {
    type: Number,
    required: true,
    default: 1
  }
});

const Rating = mongoose.model("Rating", ratingSchema);
module.exports = Rating;