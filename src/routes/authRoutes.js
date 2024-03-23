require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const requierAuth = require("../middlewares/requierAuth");
const User = mongoose.model("User");
const Company = mongoose.model('Company')
const Worksite = mongoose.model('Worksite')
const { sendVerificationEmail} = require('../utils/emailService')

const router = express.Router();

const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

// Funktion luominen access tokenin luomiseen
function generateAccessToken(user) {
  return jwt.sign({userId: user._id}, process.env.ACCESS_TOKEN,{ expiresIn: '1m' })
}
// Funktion luominen refresh tokenin luomiseen
function generateRefreshToken(user) {
  return jwt.sign({ userId: user._id }, process.env.REFRESH_TOKEN, { expiresIn: '7d' });
}

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
      
      return res.status(400).send({error: "Käyttäjänimi on jo käytössä"})
    }

    // Luodaan verification koodi signupin yhteydessä
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // tallennetaan verificationcode databaseen
    const user = new User({ email, password,verificationCode });
    user.save();

    // Käytetään emailService.js olevaa funtiota lähettämään käyttäjän sähköpostiin koodi
    sendVerificationEmail(user, verificationCode)

    // const token = jwt.sign({ userId: user._id }, process.env.SECRET_TOKEN); //MUUTOS
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    
    // res.send({token: token, user: {_id:user._id, email: user.email, isVerified: user.isVerified}}) //MUUTOS
    res.send({accessToken, refreshToken, user:{_id:user._id, email:user.email, isVerified:user.isVerified}})

  } catch (err) {
    return res.status(422).send(err.message);
  }
});


// Tämä on mobiilisovelluksen signin reitti
router.post("/signin", async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(422).send({ error: "Must provide email and password" });
  }

  const user = await User.findOne({ email });
  
  if (!user) {
    return res.status(404).send({ error: "Email not found" });
  }
  // if (!user.isVerified) {
    
  //   return res.status(401).send({error: "email not verified"})
  // }
  try {
    await user.comparePassword(password);
    // const token = jwt.sign({ userId: user._id }, process.env.SECRET_TOKEN); // MUUTOS
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    user.refreshToken = refreshToken
    await user.save();
    
    res.send({ accessToken, refreshToken, user: { email: user.email, _id: user._id, role: user.role, isVerified: user.isVerified } });
    // res.send({ token, user: {email:user.email,_id:user.id, role: user.role, isVerified: user.isVerified} }); //MUUTOS
  } catch (err) {
    return res.status(422).send({ error: "invalid password or email" });
  }
});

router.post('/refresh', async (req,res) => {
  const refreshToken = req.body.token;

  if (!refreshToken) {
    return res.status(401).send({error: 'Refresh token required'})
  }
  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN)
    const userId = decoded.userId;

    const user = await User.findById(userId);

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(403).send({error: 'invalid refres token'})
    }
    const newAccessToken = generateAccessToken(user);
    res.send({accessToken: newAccessToken})
  } catch (error) {
    return res.status(403).send({error: 'invalid or expired refresh token'})
  }
})


// Käytetään tätä kun asetetaan verification koodi 
router.post('/verify', async (req,res) => {
  
  const {email, verificationCode} = req.body;
  
  
  if (!email || !verificationCode) {
    console.log("virhe1")
    return res.status(422).send({error: "must provide email and verificationcode"})
  }

  try {
    const user = await User.findOne({email})

    if (!user) {
      console.log("virhe2")
      return res.status(404).send({error: "user not found"})
    }

    // Katsotaan onko käyttäjän antama koodi sama mikä luotiin signupin yhteydessä userin modaliin
    if (user.verificationCode === verificationCode) {
      user.isVerified = true;
      user.verificationCode = null;
      await user.save();

      res.send({message: "Email successfully verified"})

    } else {
      console.log("virhe3")
      res.status(400).send({error: "Invalid verification code"})
    }
  } catch (error) {
    console.log("virhe4")
    return res.status(500).send({error: "internal server error"})
  }
})

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
  console.log("sisisi")
  const user = await User.findById(req.user._id)
    .populate('company')
    .select('-password');
  
  res.send(user);
  // res.send({email: req.user.email})
})


router.get('/users/:id', requierAuth, async (req,res) => {
  
  try {
    const userId = req.params.id;
    console.log("authROutes", userId);
    const user = await User.findById(userId).select('-password')

    if (user) {
      console.log("user löydetty")
    } else {
      console.log("useria ei löydetty");
    }
    if (!user) {
      return res.status(404).send({error: "käyttäjää ei löytynyt"})
    }
    
    res.send(user);
  } catch (error) {
    res.status(500).send({ error: "Palvelinvirhe" });
  }
})



router.post('/change-password', requierAuth, async (req,res) => {
  const { oldPassword, newPassword } = req.body;
  
  

  if (!oldPassword || !newPassword) {
    return res.status(422).send({error: "must provide old and new password"})
  }

  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).send({error: "User not found"})
    }

    await user.comparePassword(oldPassword);
    
    user.password = newPassword
    await user.save();

    res.send({message: "password successfully changed"})
  } catch (error) {
    if (error === false) {
      
      return res.status(404).send({error: "Invalid old password"})
    }
    
    return res.status(422).send({error: "error changing password"})
  }
})

router.get('/aws-url', requierAuth, async (req,res) => {
  const awsUrl = process.env.AWS_URL
  
  
  try {
    
    res.send(awsUrl);
  } catch (error) {
    console.log(error)
  }

})

module.exports = router;
