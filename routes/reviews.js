const mongoose = require("mongoose");

const express = require("express");
const router = express.Router();
const Review = require("../models/Review");
const User = require("../models/User");
const { body, validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const fetchUser = require("../middlewares/fetchUserId");
const Rating = require("../models/Rating");


// Add new review at POST-> http://localhost:5000/api/review/addReview , private route
router.post(
  "/addReview",

  // fetchUser to append userId to the req header
  fetchUser,
  body('breweryId').isLength({ min: 1 }),
  body('rating').isInt({ min: 1, max: 5 }),
  body('description').isLength({ min: 1 }),

  async (req, res) => {
    try {
      const userId = req.userId;
      const { breweryId, rating, description } = req.body;

      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Creating and saving new review
      const newReview = new Review({ userId, breweryId, rating, description });
      await newReview.save();

      // Updating the reviews array of the user by pushing new review id and saving the user
      await User.findByIdAndUpdate(
        userId,
        { $push: { reviews: newReview._id } },
        { new: true }
      );

      // Calculate the new average rating for the brewery
      const existingRating = await Rating.findOne({ breweryId });

      if (existingRating) {
        // If the rating for the brewery already exists, update it
        const newReviewCount = existingRating.reviewCount + 1;
        const newAverageRating = ((existingRating.rating * existingRating.reviewCount) + rating) / newReviewCount;

        existingRating.rating = newAverageRating;
        existingRating.reviewCount = newReviewCount;
        await existingRating.save();
      } else {
        // If the rating for the brewery does not exist, create a new record
        const newRating = new Rating({
          breweryId,
          rating,
          reviewCount: 1
        });
        await newRating.save();
      }

      res.status(200).json({
        message: "Review added successfully",
        reviewId: newReview._id,
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({
        message: "Unexpected error occurred while adding new review",
        errors: [{ msg: error.message }],
      });
    }
  }
);

// Get existing review at GET-> http://localhost:5000/api/review/getReview , private route
router.get(
  "/getReview",

  // fetchUser to append userId to the req header
  fetchUser,

  async (req, res) => {
    try {
      const userId = req.userId;
      const reviewId = req.query.reviewId;

      // checking if reviewId is empty in request
      if (!reviewId) {
        return res.status(400).send("reviewId can't be empty");
      }

      // checking if the review requested belongs to the logged in user
      const review = await Review.findById(reviewId);
      if (!review) {
        return res.status(404).send("Review not found");
      }

      const reviewUserId = review.userId.toString();
      if (reviewUserId !== userId) {
        return res.status(401).send("Not authorized to get this review");
      }

      return res.status(200).json({
        message: "Review fetched successfully",
        review,
      });
    } catch (error) {
      res.status(500).json({
        message: "Unexpected error occurred while getting existing review",
        errors: [{ msg: error.message }],
      });
    }
  }
);

// Get existing review at GET-> http://localhost:5000/api/review/getBreweryReviews , private route
router.get(
  "/getBreweryReviews",

  async (req, res) => {
    try {
      const breweryId = req.query.breweryId;

      // checking if reviewId is empty in request
      if (!breweryId) {
        return res.status(400).send("breweryId can't be empty");
      }

      // checking if the review requested belongs to the logged in user
      const reviews = await Review.find({ breweryId });;
      if (!reviews) {
        return res.status(404).send("Review not found");
      }

      return res.status(200).json({
        message: "Review fetched successfully",
        reviews,
      });
    } catch (error) {
      res.status(500).json({
        message: "Unexpected error occurred while getting existing review",
        errors: [{ msg: error.message }],
      });
    }
  }
);

// Get existing review at GET-> http://localhost:5000/api/review/getBreweryRating , private route
router.get(
  "/getBreweryRating",
  async (req, res) => {
    try {
      const breweryId = req.query.breweryId;

      // Checking if breweryId is empty in request
      if (!breweryId) {
        return res.status(400).send("breweryId can't be empty");
      }

      // Fetching the rating for the specified breweryId
      const breweryRating = await Rating.findOne({ breweryId });

      if (!breweryRating) {
        return res.status(404).send("Rating not found for the specified brewery");
      }

      return res.status(200).json({
        message: "Rating fetched successfully",
        breweryRating,
      });
    } catch (error) {
      res.status(500).json({
        message: "Unexpected error occurred while fetching the rating",
        errors: [{ msg: error.message }],
      });
    }
  }
);

// Get all existing reviews at GET-> http://localhost:5000/api/review/getAllReviews , private route
router.get(
  "/getAllReviews",

  // fetchUser to append userId to the req header
  fetchUser,

  async (req, res) => {
    try {
      const userId = req.userId;

      // fetching all reviews
      const reviews = await Review.find({ userId });

      return res.status(200).json({
        message: "Reviews fetched successfully",
        reviews,
      });
    } catch (error) {
      res.status(500).json({
        message: "Unexpected error occurred while getting existing reviews",
        errors: [{ msg: error.message }],
      });
    }
  }
);

// Update an existing review at PUT-> http://localhost:5000/api/review/updateReview , private route
router.put(
  "/updateReview",

  // fetchUser to append userId to the req header
  fetchUser,

  body('rating').optional().isInt({ min: 1, max: 5 }),
  body('description').optional().isLength({ min: 1 }),

  async (req, res) => {
    try {
      const userId = req.userId;
      const reviewId = req.query.reviewId;

      // checking if reviewId is empty in request
      if (!reviewId) {
        return res.status(400).send("reviewId can't be empty");
      }

      // checking if the review requested belongs to the logged in user
      const fetchedReview = await Review.findById(reviewId);
      if (!fetchedReview) {
        return res.status(404).send("Review not found");
      }

      const reviewUserId = fetchedReview.userId.toString();
      if (reviewUserId !== userId) {
        return res.status(401).send("Not authorized to update this review");
      }

      const { rating, description } = req.body;
      const updatedReview = {};

      if (rating) updatedReview.rating = rating;
      if (description) updatedReview.description = description;

      const review = await Review.findByIdAndUpdate(
        reviewId,
        { $set: updatedReview },
        { new: true }
      );

      return res.status(200).json({
        message: "Review updated successfully",
        review,
      });
    } catch (error) {
      res.status(500).json({
        message: "Unexpected error occurred while updating existing review",
        errors: [{ msg: error.message }],
      });
    }
  }
);

// Delete an existing review at DELETE-> http://localhost:5000/api/review/deleteReview , private route
router.delete(
  "/deleteReview",

  // fetchUser to append userId to the req header
  fetchUser,

  async (req, res) => {
    try {
      const userId = req.userId;
      const reviewId = req.query.reviewId;

      // checking if reviewId is empty in request
      if (!reviewId) {
        return res.status(400).send("reviewId can't be empty");
      }

      // checking if the review requested belongs to the logged in user
      const fetchedReview = await Review.findById(reviewId);
      if (!fetchedReview) {
        return res.status(404).send("Review not found");
      }

      const reviewUserId = fetchedReview.userId.toString();
      if (reviewUserId !== userId) {
        return res.status(401).send("Not authorized to delete this review");
      }

      await Review.findByIdAndDelete(reviewId);

      // updating the reviews array of the user by pulling deleted review id and saving the user
      await User.findByIdAndUpdate(
        userId,
        { $pull: { reviews: reviewId } },
        { new: true }
      );

      return res.status(200).json({
        message: "Review deleted successfully",
      });
    } catch (error) {
      res.status(500).json({
        message: "Unexpected error occurred while deleting existing review",
        errors: [{ msg: error.message }],
      });
    }
  }
);

module.exports = router;
