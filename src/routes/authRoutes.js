require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const requierAuth = require("../middlewares/requierAuth");
const User = mongoose.model("User");
const Company = mongoose.model('Company')

const router = express.Router();

router.post("/signup", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(422).send({ error: "Must provide email and password" });
  }

  try {

    const existingUser = await User.findOne({email})

    if (existingUser) {
      
      return res.status(400).send({error: "Try again"})
    }

    const user = new User({ email, password });
    user.save();

    const token = jwt.sign({ userId: user._id }, process.env.SECRET_TOKEN);
    
    res.send({token: token, user: {_id:user._id, email: user.email}})

  } catch (err) {
    return res.status(422).send(err.message);
  }
});

router.post("/signin", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(422).send({ error: "Must provide email and password" });
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).send({ error: "Email not found" });
  }
  try {
    await user.comparePassword(password);
    const token = jwt.sign({ userId: user._id }, process.env.SECRET_TOKEN);
    res.send({ token, user: {_id:user.id, role: user.role} });
  } catch (err) {
    return res.status(422).send({ error: "invalid password or email" });
  }
});

router.post('/join-company', async (req,res) => {
  const {userId, companyCode} = req.body;
  


  try {
    const company = await Company.findOne({code: companyCode})
    if (!company) {
      return res.status(400).send({error: "Invalid company code"})
    }
    
    const user = await User.findById(userId).populate('company');
    
    
    user.company = company._id;
    await user.save();
    res.send(user);
  } catch (err) {
    res.status(422).send({error: err.message})
    
  }
})

router.get('/profile', requierAuth, async (req,res) => {
  const user = await User.findById(req.user._id).populate('company');
  
  res.send(user);
  // res.send({email: req.user.email})
})



module.exports = router;
