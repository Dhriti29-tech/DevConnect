const Comment = require('../models/commentSchema');

// POST 
const addComment = async (req, res) => {
  try {
    const comment = await Comment.create({
      post: req.params.id,
      author: req.user.id,
      content: req.body.content,
    });
    res.status(201).json(comment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET
const getComments = async (req, res) => {
  try {
    const comments = await Comment.find({ post: req.params.id })
      .populate('author', 'name')
      .sort({ createdAt: -1 });
    res.json(comments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { addComment, getComments };
