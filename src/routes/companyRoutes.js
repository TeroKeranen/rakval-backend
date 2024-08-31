require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const requierAuth = require("../middlewares/requierAuth");
const Company = mongoose.model("Company");
const User = mongoose.model('User');

const router = express.Router();

router.use(requierAuth);
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

router.post('/updateSubscription', async (req,res) => {

  const { subscriptionType, durationInMonths } = req.body;
  
  try {
    const userId = req.user._id;

    const company = await Company.findOne({adminId: userId});

    
    if (!company) {
      return res.status(404).json({ success: false, message: "Yritystä ei löydy" });
    }

    company.isPaid = true;
    company.subscriptionType = subscriptionType;

    const currentDate = new Date();
    const endDate = new Date(currentDate.setMonth(currentDate.getMonth() + durationInMonths))

    company.subscriptionEndDate = endDate;

    await company.save();


    res.json({ success: true, company });
  } catch (error) {
    res.status(500).send({ error: "Palvelinvirhe" });
  }
})

// Lisätään tuote yrityksen tuotelistaan
router.post("/companyAddProducts", async (req,res) => {
  const {companyId, barcode, name, description, quantity, price} = req.body;

  try {
    const company = await Company.findOne({
      _id: companyId,
      $or: [{ adminId: req.user._id }, { workers: req.user._id }]
    })

    if (!company) {
      return res.status(404).send({error: "Yritystä ei löydy"})
    }

    // Tarkistetaan, onko tuote jo olemassa yrityksen tuotteissa viivakoodin tai nimen perusteella
    const existingProduct = company.products.find(
      (product) => product.barcode === barcode || product.name === name
    );


    if (existingProduct) {
      // Päivitetään olemassa olevan tuotteen määrä
      existingProduct.quantity += quantity; // Lisätään nykyiseen määrään uusi määrä
      await company.save();
      return res.send({ message: "Tuotteen määrä päivitetty onnistuneesti.", product: existingProduct });
    }
    
    const newProduct = {
      barcode,
      name,
      description,
      quantity,
      price
    }

    company.products.push(newProduct);
    await company.save();

    res.send(company);
  } catch (error) {
    res.status(422).send({ error: error.message });
  }
})





module.exports = router;
