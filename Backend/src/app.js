const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const app = express();
const User = require('./models/UserSchema');
const Post = require('./models/postSchema');
const generateToken = require('./utils/generateToken');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Helper: get logged-in user from cookie ───────────────────
const getUser = (req) => {
  try {
    const token = req.cookies.token;
    if (!token) return null;
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
};


app.get('/', async (req, res) => {
  const user = getUser(req);

  // get latest 10 posts, newest first
  const posts = await Post.find()
    .populate('author', 'name')
    .sort({ createdAt: -1 })
    .limit(10);

  res.render('pages/dashboard', { posts, user });
});

app.get('/register', (req, res) => res.render('pages/register', { user: null }));
app.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.render('pages/register', { error: 'Email already in use', user: null });
    const hashed = await bcrypt.hash(password, 10);
    await User.create({ name, email, password: hashed });
    res.redirect('/login');
  } catch (err) {
    res.render('pages/register', { error: err.message, user: null });
  }
});

app.get('/login', (req, res) => res.render('pages/login', { user: null }));
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.render('pages/login', { error: 'Invalid credentials', user: null });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.render('pages/login', { error: 'Invalid credentials', user: null });
    const token = generateToken(user);
    res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 }); // 7 days
    res.redirect('/');
  } catch (err) {
    res.render('pages/login', { error: err.message, user: null });
  }
});

// Logout
app.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/');
});

// Single post page
app.get('/posts/:id', async (req, res) => {
  const user = getUser(req);
  const post = await Post.findById(req.params.id).populate('author', 'name');
  if (!post) return res.redirect('/');

  const comments = await require('./models/commentSchema')
    .find({ post: post._id })
    .populate('author', 'name')
    .sort({ createdAt: -1 });

  const liked = user ? post.likes.includes(user.id) : false;
  res.render('pages/post', { post, comments, user, liked });
});

// Like / Unlike
app.post('/posts/:id/like', async (req, res) => {
  const user = getUser(req);
  if (!user) return res.redirect('/login');

  const post = await Post.findById(req.params.id);
  const alreadyLiked = post.likes.includes(user.id);

  if (alreadyLiked) {
    post.likes = post.likes.filter(id => id.toString() !== user.id);
  } else {
    post.likes.push(user.id);
  }

  await post.save();
  res.redirect('/posts/' + post._id);
});

// Delete post (owner only)
app.post('/posts/:id/delete', async (req, res) => {
  const user = getUser(req);
  if (!user) return res.redirect('/login');

  const post = await Post.findById(req.params.id);
  if (post.author.toString() === user.id) {
    await post.deleteOne();
  }
  res.redirect('/');
});

// Add comment
app.post('/posts/:id/comments', async (req, res) => {
  const user = getUser(req);
  if (!user) return res.redirect('/login');

  await require('./models/commentSchema').create({
    post: req.params.id,
    author: user.id,
    content: req.body.content,
  });

  res.redirect('/posts/' + req.params.id);
});
app.get('/posts/create', (req, res) => {
  const user = getUser(req);
  if (!user) return res.redirect('/login');
  res.render('pages/createPost', { user });
});

app.post('/posts/create', async (req, res) => {
  const user = getUser(req);
  if (!user) return res.redirect('/login');
  try {
    const { title, content } = req.body;
    await Post.create({ title, content, author: user.id });
    res.redirect('/');
  } catch (err) {
    res.render('pages/createPost', { error: err.message, user });
  }
});

// ── API Routes ───────────────────────────────────────────────
app.use('/api/auth',  require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/posts', require('./routes/postRoutes'));

module.exports = app;
