require("dotenv").config();
const express = require('express')
const mongoose= require('mongoose');
const Worksite = mongoose.model("Worksite");
const Events = mongoose.model('Events');
const User = mongoose.model('User');
const requireAuth = require('../middlewares/requierAuth')

const router = express.Router();

router.use(requireAuth);

// router.get('/events', async (req,res) => {
//     try {
//         const userId = req.user._id;
//         const isAdmin = req.user.role === 'admin';

//         let events;

//         if (isAdmin) {
//             jos käyttäjä on admin, hae kaikki tapahtumat
//             events = await Worksite.find({}).populate('events');
//         } else {
//             Jos käyttäjä ei ole admin, hae vain käyttäjän tapahtumat
//             const worksites = await Worksite.find({workers: userId});
            
//             events = worksites.map(worksite => {
//                 return {
//                     worksiteId: worksite._id,
//                     markers: worksite.markers
//                 }
//             })
//         }
//         console.log(events);
//         res.send(events);
//     } catch (error) {
//         res.status(500).send({error: 'tapahtumien haku epäonnistui'})
        
//     }
// })

router.get('/events', async (req, res) => {
    try {
        const userId = req.user._id;
        const isAdmin = req.user.role === 'admin';
        
        const user = await User.findById(userId).populate('company');
        const companyId = user.company ? user.company._id : null;

        let events;

        if (isAdmin) {
            // Jos käyttäjä on admin, hae kaikki tapahtumat Event-mallista
            events = await Events.find({companyId: companyId}).populate({path: 'user', select: '-password'}).populate('worksite');
        } else {
            // Jos käyttäjä ei ole admin, hae vain hänen työmaansa tapahtumat
            const userWorksites = await Worksite.find({ workers: userId });
            const userWorksiteIds = userWorksites.map(worksite => worksite._id);
            events = await Events.find({ worksite: { $in: userWorksiteIds }, type: "added-marker" }).populate({path:'user', select: '-password'}).populate('worksite');
        }
        
        res.send(events);
    } catch (error) {
        res.status(500).send({ error: 'Tapahtumien haku epäonnistui' });
    }
});

module.exports = router