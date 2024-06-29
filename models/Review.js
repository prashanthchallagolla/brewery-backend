const mongoose = require("mongoose");

const { Schema } = mongoose;

const reviewSchema = new Schema({
  userId: { type: mongoose.Schema.Types.ObjectId },
  breweryId:{type: String, required: true},
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  description: { type: String, require: true },
  timestamp: { type: Date, default: Date.now },
});

const Review = mongoose.model("Review", reviewSchema);
module.exports = Review;