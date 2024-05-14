require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const requierAuth = require("../middlewares/requierAuth");
const Company = mongoose.model("Company");
const User = mongoose.model('User');

const router = express.Router();

router.use(requierAuth);

export function generateUniqueCode() {
     const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
     const length = 10;

     let result ='';

     for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        result += characters.charAt(randomIndex);
     }
     return result;
}

// luodaan uusi yritys
router.post('/createCompany', async (req,res) => {
    
    const {name, address, city} = req.body;
    
    try {
        
        // Tarkistetaan onko yritys olemassa samalla nimellä
        const existingCompany = await Company.findOne({name});

        if (existingCompany) {
          return res.status(422).send({error: "Companys name is already used"})
        }
        
        const code = generateUniqueCode(); // luodaan yhtiölle yrityskoodi;
        

        const company = new Company({name, address, city, code, adminId: req.user._id})
        await company.save();

        req.user.company = company._id; // Liitetään käyttäjän tietoihin yrityksen id
        await req.user.save();
        res.send(company);
    } catch (err) {
        res.status(422).send({error: err.message})
        
    }
})


// Haetaan yritys
router.get('/company', async (req, res) => {

    try {

        const userId = req.user._id;
        const company = await Company.findOne({
          $or:[
            {adminId: userId},
            {workers: userId}
          ]
        })
       
        if (!company) {
            return res.status(404).send({error: 'yritystä ei löydy'})
        }

        res.send(company);
        
    } catch (error) {
        res.status(500).send({error: "server error"})
    }
})




// haetaan yksittäisen käyttäjän tiedot id:n perusteella

router.get("/company/:companyId/users", requierAuth, async (req, res) => {
  try {
    const companyId = req.params.companyId;
    
    const users = await User.find({company: companyId}).select('-password');
    if (!users) {
      return res.status(404).send({ error: "Käyttäjiä ei löytynyt" });
    }
    
    
    res.send(users);
  } catch (error) {
    
    res.status(500).json({ error: "Palvelinvirhe" });
  }
});



module.exports = router;
