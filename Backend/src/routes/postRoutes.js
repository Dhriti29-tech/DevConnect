const express = require('express');
const router = express.Router();
const { createPost, getAllPosts, getPost, updatePost, deletePost, likePost } = require('../controllers/postController');
const { addComment, getComments } = require('../controllers/commentController');
const protect = require('../middlewares/authMiddleware');

router.post('/',        protect, createPost);
router.get('/',                  getAllPosts);
router.get('/:id',               getPost);
router.put('/:id',      protect, updatePost);
router.delete('/:id',   protect, deletePost);
router.put('/:id/like', protect, likePost);

// Comments nested under posts
router.post('/:id/comments',  protect, addComment);
router.get('/:id/comments',            getComments);

module.exports = router;
