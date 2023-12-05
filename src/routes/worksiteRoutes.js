require("dotenv").config();
const express = require('express')
const mongoose= require('mongoose');
const Worksite = mongoose.model("Worksite");
const User = mongoose.model('User');
const Event = mongoose.model('Events');
const requireAuth = require('../middlewares/requierAuth')

const router = express.Router();

router.use(requireAuth);

// haetaan työmaat
router.get('/worksites', async (req,res) => {
  console.log("Received request for worksites");
  try {
    const userId = req.user._id;
    
    const user = await User.findById(userId);
    // console.log("testi", user.company);
    
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
  
  const {address, city, workers, floorplanKey} = req.body;
  
 
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
    
    const worksite = new Worksite({address, city, workers,floorplanKey, creatorId: req.user._id, company: user.company })
    await worksite.save();
    
    res.send(worksite)
  } catch (err) {
    res.status(422).send({error: err.message})
  }
  
})

// lisätään työntekijä työmaahan
router.post("/worksites/:worksiteId/add-worker", async (req,res) => {
  try {
    const {worksiteId} = req.params;
    const {workerId} = req.body;

    const worksite = await Worksite.findById(worksiteId);
    if (!worksite) {
      return res.status(404).send({error: "Työmaata ei löytynyt"})
    }

    if (!worksite.workers.includes(workerId)) {
      worksite.workers.push(workerId)
      await worksite.save();
    }
    res.status(200).send(worksite);
    // console.log("worksiteID", worksiteId)
    // console.log("workerID", workerId)
  } catch (error) {
    res.status(500).send({error: "virhe työntekijän lisäämisessä työmaahan"})
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
    res.send({ message: "Työntekijä poistettu työmaalta" });
  } catch (error) {
     res.status(500).send({ error: "Palvelinvirhe" });
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
      console.log("Työmaa poistetaan");
      await Worksite.findByIdAndDelete(req.params.id);
      res.send({message: "Työmaa poistettu"})
    } else {
      console.log("työmaata ei voi poistaa, sinulle ei ole oikeuksia")
      res.status(401).send({error: "ei oikeutta poistaa työmaata"})
    }
  } catch (error) {
    
  }

  
  
})

// Pohjakuvan mmerkkien tallentaminen
router.post("/worksites/:worksiteId/add-marker", async (req, res) => {
  const {worksiteId} = req.params;
  const companyId = req.user.company;
  console.log("1");
  try {
    
    const worksite = await Worksite.findById(req.params.worksiteId);
    
    if (!worksite) {
      
      return res.status(404).send({ error: "työmaata ei löytynyt" });
    }
    console.log("2");
    
    worksite.markers.push(req.body);
    console.log("3");
    
    await worksite.save();
    console.log("4");
    const event = new Event({
      type: 'added-marker',
      user:req.user._id,
      worksite: worksiteId,
      timestamp: new Date(),
      companyId: companyId,
      markerNumber: req.body.markerNumber
    })
    console.log("5");

    await event.save();
    console.log("6");
  } catch (error) {
    console.log("plääh2")
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

    res.send(worksite);
  } catch (error) {
    console.log(error)
    res.status(500).send({error: error.message})
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
    
    console.log("worksite",worksite)
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


module.exports = router;