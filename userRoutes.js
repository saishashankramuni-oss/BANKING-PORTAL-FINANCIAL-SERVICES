const express = require('express');
const router = express.Router();
const User = require('../models/User');

/* LOGIN */
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username, password });

  if(user) {
    res.json(user);
  } else {
    res.json({ message: "Invalid login" });
  }
});

module.exports = router;