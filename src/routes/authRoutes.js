require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const requierAuth = require("../middlewares/requierAuth");
const User = mongoose.model("User");
const Company = mongoose.model('Company')
const Worksite = mongoose.model('Worksite')

const router = express.Router();

const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

router.post("/signup", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(422).send({ error: "Must provide email and password" });
  }
  if (!emailRegex.test(email)) {
    return res.status(422).send({error: "Invalid email format"})
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
    
    // const user = await User.findById(userId).populate('company');
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send({error: "User not found"})
    }
    
    user.company = company._id;
    await user.save();

    if (!company.workers.includes(user._id)) {
      company.workers.push(user._id)
      await company.save();
    }

    const updatedUser = await User.findById(userId).populate('company')

    res.send(updatedUser);
  } catch (err) {
    res.status(422).send({error: "Jotain meni vikaan yritykseen liittyessä"})
    
  }
})

// poistutaan yrityksestä
router.post('/leave-company', async (req,res) => {
  const {userId} = req.body;
  
  
  try {
    const user = await User.findById(userId)
    

    if (!user) {
      return res.status(404).send({error: "User not found"})
    }

    if (!user.company) {
      return res.status(400).send({error: "User is not part of any company"})
    }

    const companyId = user.company;
    

    // poista käyttäjä yrityksen workers listalta
    const company = await Company.findById(companyId);
    if (company) {
      const index = company.workers.indexOf(userId);
      if (index > -1) {
        company.workers.splice(index, 1);
        await company.save();
      }
    }
    // poista käyttäjä kaikilta kyseisen yrityksen työmailta
    const worksites = await Worksite.find({company: companyId});
    for (const worksite of worksites) {
      const workerIndex = worksite.workers.indexOf(userId);
      if (workerIndex > -1) {
        worksite.workers.splice(workerIndex, 1);
        await worksite.save();
      }
    }
    user.company = null;
    await user.save();
    res.send({message: "user has left the company and has been removed from all associated worksites"})
  } catch (error) {
    res.status(422).send({ error: "Error occurred while leaving the company" });
  }
})

router.get('/profile', requierAuth, async (req,res) => {

  const user = await User.findById(req.user._id)
    .populate('company')
    .select('-password');
  
  res.send(user);
  // res.send({email: req.user.email})
})


router.get('/users/:id', requierAuth, async (req,res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId).select('-password')
    if (!user) {
      return res.status(404).send({error: "käyttäjää ei löytynyt"})
    }
    
    res.send(user);
  } catch (error) {
    res.status(500).send({ error: "Palvelinvirhe" });
  }
})

module.exports = router;
