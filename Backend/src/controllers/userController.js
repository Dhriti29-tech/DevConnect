const User = require('../models/UserSchema');

// GET /api/users/:id
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/users/:id  (only the logged-in user can update their own profile)
const updateProfile = async (req, res) => {
  try {
    if (req.user.id !== req.params.id) {
      return res.status(403).json({ message: 'Not allowed to update another user' });
    }

    const { name, bio } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, bio },
      { new: true }
    ).select('-password');

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getProfile, updateProfile };
