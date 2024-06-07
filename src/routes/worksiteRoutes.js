require("dotenv").config();
const express = require('express')
const mongoose= require('mongoose');
const Worksite = mongoose.model("Worksite");
const Company = mongoose.model('Company')
const User = mongoose.model('User');
const Event = mongoose.model('Events');
const requireAuth = require('../middlewares/requierAuth')

const router = express.Router();

router.use(requireAuth);

// haetaan työmaat
router.get('/worksites', async (req,res) => {
  
  try {
    const userId = req.user._id;
    
    const user = await User.findById(userId);
    
    
    if (!user.company) {
      return res.status(400).send({error: "Käyttäjällä ei ole yritystä"});
    }
    
    const worksites = await Worksite.find({company: user.company})
    
    
    
    res.send(worksites);
    
  } catch (error) {

    res.status(500).send({error: err.message})
    
  }
})

router.get('/worksites/:id', async (req,res) => {
  try {
    const worksite = await Worksite.findById(req.params.id);
    if (!worksite) {
      return res.status(404).send({error: "Työmaata ei löytynyt"})
      
    }
    
    res.send(worksite);
  } catch (error) {
    res.status(500).send(error);
  }
})
// Uuden työmaan luominen
router.post("/worksites",  async (req,res) => {
  
  const {address, city, startTime, workers, floorplanKey,worktype, duehours} = req.body;
  
 
  if (!address || !city || !worktype || !startTime) {
    return res
      .status(422)
      .send({error: "you must provide a address, city and worktype"})
  }

  const user = await User.findById(req.user._id)
  
  if (!user.company) {
    // return res.status(400).send({error: "Käyttäjällä ei ole yritystä"})
    return res.status(400).json({success:false, message: "User does not belong to any company"})
  }
  const company = await Company.findById(user.company);
  if (!company) {
    return res.status(404).json({ success: false, message: "Company not found." });
  }

  try {

    if (!company.isPaid) {
      const worksitesCount = await Worksite.countDocuments({company: company._id})

      if (worksitesCount >= 3) {
        
        return res.status(403).json({ success: false, message: "Non-paying companies are limited to 3 worksites." });
      }
    }
    
    const worksite = new Worksite({address, city, startTime, workers,floorplanKey, worktype, duehours, creatorId: req.user._id, company: user.company })
    await worksite.save();
    
    res.json({ success: true, message: "Worksite created successfully.", worksite });
  } catch (err) {
    res.status(422).send({error: err.message})
  }
  
})

// lähetetään floorplankey kuvaa varten
router.post('/worksites/:worksiteId/floorplan', async (req,res) => {
  const {worksiteId} = req.params;
  // const { floorplanKey } = req.body;
  const { key, title } = req.body;
  
  
  try {
    const worksite = await Worksite.findById(worksiteId);
    if (!worksite) {
      return res.status(404).send({error: "Työmaata ei löytynyt"})
    }


    // worksite.floorplanKeys = worksite.floorplanKeys || [];
    const newFloorplan = {key, title}
    worksite.floorplanKeys.push(newFloorplan);
    // worksite.floorplanKey = floorplanKey;
    await worksite.save();

    res.send(worksite);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
})

// lisätään työntekijä työmaahan
router.post("/worksites/:worksiteId/add-worker", async (req,res) => {
  try {
    const {worksiteId} = req.params;
    const {workerId} = req.body;

    const worksite = await Worksite.findById(worksiteId);
    if (!worksite) {
      // return res.status(404).send({error: "Työmaata ei löytynyt"})
      return res.status(404).json({success: false, message: "Työmaata ei löytynyt"})
    }

    if (worksite.workers.includes(workerId)) {
      // return res.status(200).send({message: "työntekijä on jo lisätty työmaalle"})
      return res.status(200).json({success: true, message: "Työntekijä on jo lisätty työmaalle", alreadyAdded: true})
    }

    worksite.workers.push(workerId)
    await worksite.save();

    // res.status(200).send(worksite);
    res.status(200).json({success: true, data: worksite});
    
  } catch (error) {
    // res.status(500).send({error: "virhe työntekijän lisäämisessä työmaahan"})
      res.status(500).json({success: false, message: "Virhe työntekijän lisäämisessä työmaahan"});
  }
})

// Poistetaan työntekijä työmaalta
router.delete('/worksites/:worksiteId/workers/:workerId', async (req,res) => {
  try {
    const {worksiteId, workerId} = req.params;
    
    const worksite = await Worksite.findById(worksiteId);
    if (!worksite) {
      return res.status(404).send({error: "Työmaata ei löytynyt"})
    }
    if (!worksite.creatorId.equals(req.user._id) && req.user.role !== 'admin') {
       return res.status(403).send({ error: "Ei oikeutta poistaa työntekijöitä työmaalta" });
    }
    worksite.workers = worksite.workers.filter((id) => id.toString() !== workerId);
    await worksite.save();
    res.send({worksite, message: "Työntekijä poistettu työmaalta", success:true });
  } catch (error) {
     res.status(500).send({ error: "Palvelinvirhe", success:false });
  }
})

// Työmaan poistaminen
router.delete('/worksites/:id', async (req,res) => {
  
  try {
    const worksite = await Worksite.findById(req.params.id);
    
    if (!worksite) {
      return res.status(404).send({error: "Työmaata ei löytynyt"})
    }

    if (worksite.creatorId.equals(req.user._id) || req.user.role ==='admin') {
      
      await Worksite.findByIdAndDelete(req.params.id);
      await Event.deleteMany({ worksite: req.params.id });
      res.send({message: "Työmaa poistettu"})
    } else {
      
      res.status(401).send({error: "ei oikeutta poistaa työmaata"})
    }
  } catch (error) {
    
  }

  
  
})

// Pohjakuvan mmerkkien tallentaminen
router.post("/worksites/:worksiteId/add-marker", async (req, res) => {
    
    try {

      
      const {worksiteId} = req.params;
      const companyId = req.user.company;
      const worksite = await Worksite.findById(worksiteId);
    
    if (!worksite) {
      
      return res.status(404).send({ error: "työmaata ei löytynyt" });
    }
   
    
    worksite.markers.push(req.body);
    
    
    await worksite.save();
    res.send(worksite);
    const event = new Event({
      type: 'added-marker',
      user:req.user._id,
      worksite: worksiteId,
      timestamp: new Date(),
      companyId: companyId,
      markerNumber: req.body.markerNumber
    })
    

    await event.save();
    
  } catch (error) {
    
    res.status(500).send({error: error.message})
  }
});

// pohjakuvan merkkien muokkaaminen
router.put('/worksites/:worksiteId/markers/:markerId', async (req,res) => {
  try {
    const {worksiteId, markerId} = req.params;
    const update = req.body;
    const companyId = req.user.company;
    const worksite = await Worksite.findById(worksiteId);
    
    if (!worksite) {
      return res.status(404).send({error: "työmaata ei löytynyt"})
    }

    const markerIndex = worksite.markers.findIndex(marker => marker._id.toString() === markerId);
    if (markerIndex === -1) {
      return res.status(404).send({error: "Markeria ei löytynyt"})
    }

    worksite.markers[markerIndex] = {...worksite.markers[markerIndex], ...update}
    await worksite.save();

    // Lisätään tapahtuma databaseen
    const event = new Event({
      type: 'update-marker',
      user:req.user._id,
      worksite: worksiteId,
      timestamp: new Date(),
      companyId: companyId,
      markerNumber: req.body.markerNumber
    })

    await event.save();

    res.json({worksite, success:true});
  } catch (error) {
    
    res.status(500).json({success: false, error: error.message})
  }
})

// Pohjakuvan merkin poistaminen
router.delete('/worksites/:worksiteId/remove-marker/:markerId', async (req,res) => {
  
  try {
    const companyId = req.user.company;
    const worksite = await Worksite.findById(req.params.worksiteId);
    const { markerNumber } = req.query;

    if (!worksite) {
      return res.status(404).send({error: "Työmaata ei löytynyt"})
    }
    worksite.markers = worksite.markers.filter(marker => marker._id.toString() !== req.params.markerId)

    await worksite.save();

    // Lisätään tapahtuma databaseen
    const event = new Event({
      type: 'remove-marker',
      user:req.user._id,
      worksite: req.params.worksiteId,
      timestamp: new Date(),
      companyId: companyId,
      markerNumber: markerNumber
    })

    await event.save();

    res.send({message: "merkki poistettu"})

  } catch (error) {
    res.status(500).send({ error: error.message });
  }
})

router.post('/worksites/:worksiteId/worksiteready', async(req,res) => {
  const {worksiteId} = req.params;

  try {
    const worksite = await Worksite.findByIdAndUpdate(worksiteId, {$set: {isReady:true}}, {new: true})

    if (!worksite) {
      return res.status(404).send("työmaata ei löydy")
    }
    res.status(200).send(worksite);
  } catch (error) {
    res.status(500).send('Virhe päivittäessä työmaan tilaa.');
  }

})

router.post('/worksites/:worksiteId/startday', async (req, res) => {
  
  
  const {worksiteId} = req.params;
  
  const workerId = req.user._id;
  
  const companyId = req.user.company;
  

  const currentDate = new Date();
  let day = currentDate.getDate().toString();
  let month = (currentDate.getMonth() + 1).toString();
  let year = currentDate.getFullYear();

  day = day.length < 2 ? '0' + day: day;
  month = month.length < 2 ? '0' + month : month;

  let thisDay = `${day}.${month}.${year}`
  
  try {
    const worksite = await Worksite.findById(worksiteId);
    

    if (!worksite) return res.status(404).send({ error: "Worksite not found" });

    const dateOnly = currentDate.toISOString().split('T')[0];

    const hours = String(currentDate.getHours()).padStart(2, '0');
    const minutes = String(currentDate.getMinutes()).padStart(2, '0');
    const seconds = String(currentDate.getSeconds()).padStart(2, '0');

    const timeOnly = `${hours}:${minutes}:${seconds}`;
    
    
    worksite.workDays.push({
      running: true,
      startDate: thisDay,
      startTime: timeOnly,
      workerId });
    
    
    await worksite.save();
    
    // Lisätään tapahtuma databaseen
    const event = new Event({
      type: 'work-start',
      user:req.user._id,
      worksite: worksiteId,
      timestamp: new Date(),
      companyId : companyId
      
    })

    await event.save();

    res.status(200).send(worksite);
    
  } catch (error) {
    
    res.status(500).send({ error: "Internal Server Error" });

  }
})

router.post('/worksites/:worksiteId/endday', requireAuth, async (req, res) => {
  const { worksiteId } = req.params;
  const workerId = req.user._id;
  const currentDate = new Date();
  const companyId = req.user.company;

  let day = currentDate.getDate().toString();
  let month = (currentDate.getMonth() + 1).toString();
  let year = currentDate.getFullYear();

  day = day.length < 2 ? '0' + day: day;
  month = month.length < 2 ? '0' + month : month;

  let thisDay = `${day}.${month}.${year}`

  try {
    const worksite = await Worksite.findById(worksiteId);
    if (!worksite) return res.status(404).send({ error: "Worksite not found" });

    const dateOnly = currentDate.toISOString().split('T')[0];
    const hours = String(currentDate.getHours()).padStart(2, '0');
    const minutes = String(currentDate.getMinutes()).padStart(2, '0');
    const seconds = String(currentDate.getSeconds()).padStart(2, '0');

    const timeOnly = `${hours}:${minutes}:${seconds}`;
    const workDay = worksite.workDays.find(day => day.workerId.equals(workerId) && !day.endTime);
    if (workDay) {
      workDay.running = false,
      workDay.endDate = thisDay;
      workDay.endTime = timeOnly;
      await worksite.save();
    }
    
    // Lisätään tapahtuma databaseen
    const event = new Event({
      type: 'work-end',
      user:req.user._id,
      worksite: worksiteId,
      timestamp: new Date(),
      companyId : companyId
    })

    await event.save();

    res.status(200).send(worksite);
  } catch (error) {
    
    res.status(500).send({ error: "Internal Server Error" });
  }
});

// Luodaan post route kalenterimerkinnälle
router.post('/worksites/:worksiteId/calendar-entry', async (req,res) => {
  try {
    const {date, title, text } = req.body;
    const worksite = await Worksite.findById(req.params.worksiteId)

    if (!worksite) {
      return res.status(404).send({error: "Työmaata ei löytynyt"})
    }

    worksite.calendarEntries.push({date, title, text})
    await worksite.save();

        // Lisätään tapahtuma databaseen
        const event = new Event({
          type: 'added-calendarmark',
          user:req.user._id,
          worksite: req.params.worksiteId,
          timestamp: new Date(),
          companyId : req.user.company,
          calendarDate: date
        })
    
        await event.save();

    res.status(201).send(worksite);
  } catch (error) {
    res.status(500).send({error: error.message})
  }
})

// haetaan kaikki kalenteri merkinnät
router.get('/worksites/:worksiteId/calendar-entries', async (req,res) => {
  try {
    const worksite = await Worksite.findById(req.params.worksiteId);
    if (!worksite) {
      return res.status(404).send({error: "Työmaata ei löytynyt"})
    }
    res.send(worksite.calendarEntries);
  } catch (error) {
    res.status(500).send({error: error.message})
  }
})

// Päivitetään kalenteri merkintää
router.put('/worksites/:worksiteId/calendar-entry/:entryId', async (req,res) => {
  try {
    const {worksiteId, entryId } = req.params;
    const { date, title, text } = req.body;
    const worksite = await Worksite.findById(worksiteId);

    if (!worksite) {
      return res.status(404).send({error: "Työmaata ei löytynyt (update)"})
    }

    const entryIndex = worksite.calendarEntries.findIndex(entry => entry._id.toString() === entryId);
    if (entryIndex === -1 ) {
      return res.status(404).send({error: "Merkintää ei löytynyt"})
    }

    worksite.calendarEntries[entryIndex] = { ...worksite.calendarEntries[entryIndex], date,title,text}
    await worksite.save();

    // Lisätään tapahtuma databaseen
    const event = new Event({
      type: 'updated-calendarmark',
      user:req.user._id,
      worksite: req.params.worksiteId,
      timestamp: new Date(),
      companyId : req.user.company,
      calendarDate: date
    })

    await event.save();
    
    res.status(200).send(worksite);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
})

// kalenteri merkkinnän poisto
router.delete('/worksites/:worksiteId/calendar-entry/:entryId', async (req,res) => {
  
  try {
    const {worksiteId, entryId} = req.params;
    const { date } = req.query;
    
    
    const worksite = await Worksite.findById(worksiteId);
    
    if (!worksite) {
      res.status(404).send({error: "Työmaata ei löytynyt"})
    }
    const entryIndex = worksite.calendarEntries.findIndex(entry => entry._id.toString() === entryId);
    
    if (entryIndex === -1 ) {
      return res.status(404).send({error: "Merkintää ei löytynyt"})
    }

    worksite.calendarEntries.splice(entryIndex, 1)
    await worksite.save();

    // Lisää tapahtuma databaseen, jos se on tarpeen
    const event = new Event({
      type: 'deleted-calendarmark',
      user: req.user._id,
      worksite: worksiteId,
      timestamp: new Date(),
      companyId: req.user.company,
      calendarDate: date
      
      // Lisää muita tarvittavia tietoja
    });
    await event.save();

    res.status(200).send(worksite);
  } catch (error) {
    res.status(500).json({ error: "Palvelinvirhe" });
  }
})
// Lisää tuote työmaalle
router.post(`/worksites/:worksiteId/add-product`, async (req,res) => {
  const {worksiteId} = req.params;
  const {productName, quantity} = req.body;
  console.log ("worksiteId", worksiteId);
  console.log("productname", productName);
  console.log("quantity", quantity);

  try {
    const worksite = await Worksite.findById(worksiteId);

    if (!worksite) {
      return res.status(404).json({ success: false, message: "Työmaata ei löytynyt" });
    }
    const newProduct = { name: productName, quantity: quantity };
    worksite.products.push(newProduct)
    await worksite.save();

    res.status(201).json({ success: true, message: "Tuote lisätty onnistuneesti", worksite });
  } catch (error) {
    res.status(500).json({ success: false, message: "Virhe tuotteen lisäämisessä", error: error.message });
  }
})

// muokkaa työmaan tuotetta
router.put('/worksites/:worksiteId/products/:productId', async (req, res) => {
  const { worksiteId, productId } = req.params;
  const { productName, quantity } = req.body; // Oletetaan, että nämä kentät on lähetetty pyynnössä

  try {
    const worksite = await Worksite.findById(worksiteId);
    if (!worksite) {
      return res.status(404).json({ success: false, message: "Työmaata ei löytynyt" });
    }

    // Etsi ja päivitä tuote
    const productIndex = worksite.products.findIndex(product => product._id.toString() === productId);
    if (productIndex === -1) {
      return res.status(404).json({ success: false, message: "Tuotetta ei löytynyt" });
    }

    // Päivitä tuotteen tiedot
    if (productName) worksite.products[productIndex].name = productName;
    if (quantity) worksite.products[productIndex].quantity = quantity;

    await worksite.save();

    res.json({ success: true, message: "Tuote päivitetty onnistuneesti", worksite });
  } catch (error) {
    res.status(500).json({ success: false, message: "Virhe tuotteen päivittämisessä", error: error.message });
  }
});

// Poista työmaasta tuote
router.delete('/worksites/:worksiteId/products/:productId', async (req, res) => {
  const { worksiteId, productId } = req.params;
  console.log("WORKSITEID",worksiteId);
  console.log("PRODUCTID",productId);
  try {
    const worksite = await Worksite.findById(worksiteId);
    if (!worksite) {
      return res.status(404).json({ success: false, message: "Työmaata ei löytynyt" });
    }

    // Poistetaan tuote käyttäen filter-metodia tuotteen id:n perusteella
    worksite.products = worksite.products.filter(product => product._id.toString() !== productId);
    await worksite.save();

    res.json({ success: true, message: "Tuote poistettu onnistuneesti", worksite });
  } catch (error) {
    res.status(500).json({ success: false, message: "Virhe tuotteen poistamisessa", error: error.message });
  }
});


module.exports = router;