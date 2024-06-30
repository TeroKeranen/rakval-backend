require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const requierAuth = require("../middlewares/requierAuth");
const User = mongoose.model("User");
const Company = mongoose.model('Company')
const Worksite = mongoose.model('Worksite')
const { sendVerificationEmail, sendDeleteAccountRequest} = require('../utils/emailService');
const {getSignedUrl} = require('../utils/awsService')


const router = express.Router();

function generateUniqueCode() {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const length = 10;

  let result ='';

  for (let i = 0; i < length; i++) {
     const randomIndex = Math.floor(Math.random() * characters.length);
     result += characters.charAt(randomIndex);
  }
  return result;
}

const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

// Salasanan täytyy olla vähintään 6 merkkiä pitkä ja sisältää ainakin yhden erikoismerkin
const passwordRegex = /^(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{6,}$/;

// Funktion luominen access tokenin luomiseen
function generateAccessToken(user) {
  return jwt.sign({userId: user._id}, process.env.ACCESS_TOKEN,{ expiresIn: '15m' })
}
// Funktion luominen refresh tokenin luomiseen
function generateRefreshToken(user) {
  return jwt.sign({ userId: user._id }, process.env.REFRESH_TOKEN, { expiresIn: '7d' });
}

router.post("/signup", async (req, res) => {
  const { email, password } = req.body;
  

  if (!email || !password) {
    return res.status(422).json({success:false, error: "Must provide email and password" });
  }
  if (!emailRegex.test(email)) {
    return res.status(422).json({success:false, error: "Invalid email format"})
  }

  if (!passwordRegex.test(password)) {
    return res.status(422).json({ success: false, passwordtypeError: true, error: "Salasanan tulee olla vähintään 6 merkkiä pitkä ja sisältää ainakin yhden erikoismerkin" });
  }

  try {

    const existingUser = await User.findOne({email})

    if (existingUser) {
      
      return res.status(400).send({error: "Käyttäjänimi on jo käytössä", existingUser: true})
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
    res.json({success:true,accessToken, refreshToken, user:{_id:user._id, email:user.email, isVerified:user.isVerified}})

  } catch (err) {
    return res.status(422).send(err.message);
  }
});

router.post("/signupAdmin", async (req, res) => {
  const { email, password, role, companyDetails } = req.body;

  


  if (!email || !password || !companyDetails || !role) {
    return res.status(422).json({ success: false, error: "Must provide email, password, role, and company details" });
  }

  if (!emailRegex.test(email)) {
    return res.status(422).json({ success: false, error: "Invalid email format" });
  }

  if (!passwordRegex.test(password)) {
    return res.status(422).json({ success: false, passwordtypeError: true, error: "Salasanan tulee olla vähintään 6 merkkiä pitkä ja sisältää ainakin yhden erikoismerkin" });
  }

  const { name, address, city } = companyDetails;
  if (!name || !address || !city) {
    return res.status(422).json({invalidData: true, success: false, error: "Must provide full company details including name, address, and city" });
  }

  try {
    // Tarkista onko käyttäjä jo olemassa
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({existingUser: true, success: false, error: "Username is already in use" });
    }

    // Luodaan käyttäjä
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const user = new User({ email, password, role, verificationCode }); // Oletetaan että salasana hashataan User-mallissa
    await user.save();

    // Luodaan yritys
    
    const { name, address, city } = companyDetails;
    const existingCompany = await Company.findOne({ name });
    if (existingCompany) {
      await user.remove();  // Poista luotu käyttäjä, jos yrityksen luonti epäonnistuu
      return res.status(422).json({ success: false, error: "Company's name is already used" });
    }
    
    const code = generateUniqueCode(); // Yrityskoodin luonti
    const company = new Company({ name, address, city, code, adminId: user._id });
    await company.save();

    // Liitetään yritys käyttäjän tietoihin
    user.company = company._id;
    await user.save();

    // Lähetetään vahvistusviesti ja palautetaan tokenit
    sendVerificationEmail(user, verificationCode);  // Lähetä vahvistusviesti
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.json({
      success: true,
      accessToken,
      refreshToken,
      user: {
        _id: user._id,
        email: user.email,
        isVerified: user.isVerified,
        company: company._id
      }
    });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Tämä on mobiilisovelluksen signin reitti
router.post("/signin", async (req, res) => {
  
  const { email, password } = req.body;
  
  if (!email || !password) {
    console.log("loginfail 1")
    return res.status(422).send({ error: "Must provide email and password" });
  }

  const user = await User.findOne({ email });
  
  if (!user) {
    console.log("loginfail 2")
    return res.status(404).json({success: false, error: "Email not found" });
  }
  // if (!user.isVerified) {
    
  //   return res.status(401).send({error: "email not verified"})
  // }
  try {
    await user.comparePassword(password);
    // const token = jwt.sign({ userId: user._id }, process.env.SECRET_TOKEN); // MUUTOS
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    user.refreshToken.push(refreshToken);
    await user.save();
    // user.refreshToken = refreshToken
    // await user.save();
    
    res.json({success:true, accessToken, refreshToken, user: { email: user.email, _id: user._id, role: user.role, isVerified: user.isVerified } });
    // res.send({ token, user: {email:user.email,_id:user.id, role: user.role, isVerified: user.isVerified} }); //MUUTOS
  } catch (err) {
    console.log("loginfail 3")
    return res.status(422).json({success:false, error: "invalid password or email" });
  }
});
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    

    if (!refreshToken || typeof refreshToken !== 'string') {
      return res.status(400).send({ error: "Invalid refresh token" });
    }

    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN);
    const userId = decoded.userId;

    await User.updateOne(
      { _id: userId },
      { $pull: { refreshToken: refreshToken } }
    );

    res.status(200).send({ message: "Successfully logged out" });
  } catch (error) {
    console.error("Logout error: ", error);
    res.status(500).send({ error: "Internal Server Error" });
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
    
    // if (!user || user.refreshToken !== refreshToken) {
    //   return res.status(403).send({error: 'invalid refres token'})
    // }
    if (!user || !user.refreshToken.includes(refreshToken)) {
      return res.status(403).send({error: 'invalid refresh token'})
    }
    const newAccessToken = generateAccessToken(user);
    
    res.send({accessToken: newAccessToken, refreshToken: refreshToken})
  } catch (error) {
    return res.status(403).send({error: 'invalid or expired refresh token'})
  }
})


// Käytetään tätä kun asetetaan verification koodi 
router.post('/verify', async (req,res) => {
  
  const {email, verificationCode} = req.body;
  
  
  if (!email || !verificationCode) {
    
    return res.status(422).send({error: "must provide email and verificationcode"})
  }

  try {
    const user = await User.findOne({email})

    if (!user) {
      
      return res.status(404).send({error: "user not found"})
    }

    // Katsotaan onko käyttäjän antama koodi sama mikä luotiin signupin yhteydessä userin modaliin
    if (user.verificationCode === verificationCode) {
      user.isVerified = true;
      user.verificationCode = null;
      await user.save();

      res.send({message: "Email successfully verified"})

    } else {
      
      res.status(400).send({error: "Invalid verification code"})
    }
  } catch (error) {
    
    return res.status(500).send({error: "internal server error"})
  }
})

router.post('/join-company', async (req,res) => {
  const {userId, companyCode} = req.body;

  try {
    const company = await Company.findOne({code: companyCode})
    if (!company) {
      return res.status(400).json({success: false, message: "Invalid company code"})
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

    res.json({success: true, data:updatedUser});
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



router.post('/change-password', requierAuth, async (req,res) => {
  const { oldPassword, newPassword } = req.body;
  
  

  if (!oldPassword || !newPassword) {
    return res.status(422).json({ success: false, error: "Must provide both old and new password." });
  }

  if (!passwordRegex.test(newPassword)) {
    console.log("tämä logataan")
    return res.status(422).json({ success: false, passwordtypeError: true, error: "Salasanan tulee olla vähintään 6 merkkiä pitkä ja sisältää ainakin yhden erikoismerkin" });
  }

  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).send({error: "User not found"})
    }

    const isMatch = await user.comparePassword(oldPassword);

    if (!isMatch) {
      return res.status(400).json({ success: false, error: "Invalid old password." });
    }
    
    user.password = newPassword
    await user.save();

    res.json({ success: true, message: "Password successfully changed." });
  } catch (error) {
    return res.status(500).json({ success: false, error: "Error changing password." });
  }
})

router.get('/get-signed-url', requierAuth, async (req,res) => {
  const {bucketName, objectKey} = req.query;
  console.log("bucketName, objeckey", bucketName, objectKey)
  try {
    const url = await getSignedUrl(bucketName, objectKey, 3600);
    res.json({url})
  } catch (error) {
    res.status(500).json({ error: "Server error while generating signed URL" });
  }
})

router.get('/aws-url', requierAuth, async (req,res) => {
  const awsUrl = process.env.AWS_URL
  
  
  try {
    
    res.send(awsUrl);
  } catch (error) {
    res.status(500).json({ error: "Server error while sending AWS URL" });
  }

})

router.delete('/deleteAccount', requierAuth, async (req, res) => {
  const userId = req.user._id;

  
  try {
    const deleteResult = await User.findByIdAndDelete(userId);

    if (!deleteResult) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ success: true, message: 'User account has been successfully deleted' });
  } catch (error) {
    console.error("Delete Error:", error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post("/sendAccountDelete", requierAuth, async (req,res) => {
  const {title, text} = req.body;
  const user = req.user;
  const userEmail = user.email;


  if (!title || !text) {
    return res.status(422).json({success: false, nodata: true})
  }

  try {
    sendDeleteAccountRequest(title,text);
    res.json({success: true, message: "Email sent successfully"})
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to send email" });
  }

  
})

module.exports = router;
