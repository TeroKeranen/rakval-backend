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
  let {companyId, barcode, name, description, quantity, price} = req.body;

  

    // Varmista, että price on aina kahden desimaalin tarkkuudella
    price = parseFloat(parseFloat(price).toFixed(2));

    if (isNaN(price)) {
      return res.status(400).send({ error: "Virheellinen hinta. Hinta ei voi olla null tai NaN." });
    }

    if (typeof quantity === 'undefined' || isNaN(quantity) || quantity < 0) {
      return res.status(400).send({ error: "Virheellinen määrä. Määrä ei voi olla undefined, negatiivinen tai NaN." });
    }

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
      existingProduct.quantity = quantity; // Lisätään nykyiseen määrään uusi määrä
      existingProduct.price = price
      existingProduct.name = name;
      existingProduct.description = description;
      await company.save();
      // Palauta koko yrityksen tiedot, mukaan lukien päivitetyt tuotteet
      const updatedCompany = await Company.findById(companyId); // Haetaan uudestaan, jotta saadaan tuoreet tiedot
      return res.send(updatedCompany); 
    }

    const newProduct = {
      barcode,
      name,
      description,
      quantity: Number(quantity),
      price
    }

    company.products.push(newProduct);
    await company.save();

    const updatedCompany = await Company.findById(companyId); // Haetaan uudestaan, jotta saadaan tuoreet tiedot
    res.send(updatedCompany);
  } catch (error) {
    res.status(422).send({ error: error.message });
  }
})

// Haetaan kaikki yrityksen tuotteet
router.get("/companyProducts", async (req,res) => {
  const {companyId} = req.query;

  

  try {

    const company = await Company.findOne({
      _id: companyId,
      $or: [{ adminId: req.user._id }, { workers: req.user._id }]
    })

    if (!company) {
      return res.status(404).send({ error: "Yritystä ei löydy tai sinulla ei ole oikeuksia nähdä tuotteita." });
    }

    // Palautetaan yrityksen tuotteet
    res.send({ products: company.products });
  } catch (error) {
    console.error("Virhe haettaessa yrityksen tuotteita:", error);
    res.status(500).send({ error: error.message || "Virhe haettaessa yrityksen tuotteita." });
  }
})





module.exports = router;
