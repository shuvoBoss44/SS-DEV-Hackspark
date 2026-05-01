const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// POST /users/register
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check for duplicate email (409 Conflict)
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();

    // Generate JWT
    const token = jwt.sign(
      { userId: newUser._id, email: newUser.email, name: newUser.name },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({ message: 'User registered successfully', token });
  } catch (error) {
    res.status(500).json({ error: 'Server error during registration' });
  }
};

// POST /users/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ message: 'Login successful', token });
  } catch (error) {
    res.status(500).json({ error: 'Server error during login' });
  }
};

// GET /users/me
exports.getMe = async (req, res) => {
  try {
    // req.user is set by the auth middleware (decoded from JWT)
    res.json(req.user);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching profile' });
  }
};