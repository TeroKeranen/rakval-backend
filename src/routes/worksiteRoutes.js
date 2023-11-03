require("dotenv").config();
const express = require('express')
const mongoose= require('mongoose');
const Worksite = mongoose.model("Worksite");
const User = mongoose.model('User');
const requireAuth = require('../middlewares/requierAuth')

const router = express.Router();

router.use(requireAuth);

// haetaan työmaat
router.get('/worksites', async (req,res) => {
  console.log("Received request for worksites");
  try {
    const userId = req.user._id;
    
    const user = await User.findById(userId);
    console.log("testi", user.company);
    
    if (!user.company) {
      return res.status(400).send({error: "Käyttäjällä ei ole yritystä"});
    }
    
    const worksites = await Worksite.find({company: user.company})
    
    
    
    res.send(worksites);
    
  } catch (error) {

    res.status(500).send({error: err.message})
    
  }
})


// Uuden työmaan luominen
router.post("/worksites",  async (req,res) => {
  
  const {address, city, workers} = req.body;
  
 
  if (!address || !city) {
    return res
      .status(422)
      .send({error: "you must provide a address and city"})
  }

  const user = await User.findById(req.user._id)
  
  if (!user.company) {
    return res.status(400).send({error: "Käyttäjällä ei ole yritystä"})
  }

  try {
    
    const worksite = new Worksite({address, city, workers, creatorId: req.user._id, company: user.company })
    await worksite.save();
    res.send(worksite)
  } catch (err) {
    res.status(422).send({error: err.message})
  }
  
  

})

module.exports = router;