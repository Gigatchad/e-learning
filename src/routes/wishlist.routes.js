/**
 * Wishlist Routes
 */

const express = require('express');
const router = express.Router();

const wishlistController = require('../controllers/wishlist.controller');
const { protect } = require('../middleware/auth.middleware');

// All wishlist routes are protected
router.use(protect);

router.get('/', wishlistController.getWishlist);
router.post('/', wishlistController.addToWishlist);
router.delete('/:course_id', wishlistController.removeFromWishlist);

module.exports = router;
