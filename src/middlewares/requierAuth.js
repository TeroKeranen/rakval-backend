
require("dotenv").config();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose')
const User = mongoose.model('User');

module.exports = (req,res, next) => {
    const {authorization} = req.headers;

    if (!authorization) {
        console.log("ei auth");
        return res.status(401).send({error: "you must be log in"});
    }

    // Tämä ottaa pelkän tokenin tästä =  authorization === 'Bearer <TOKEN>' 
    const token = authorization.replace(process.env.TOKEN_REPLACE, '');

    jwt.verify(token, process.env.SECRET_TOKEN, async (error, payload) => {
      if (error) {
        console.log("vittu error");
        return res.status(401).send({ error: "You must be logged in. " });
      }
      
      const { userId } = payload;

      const user = await User.findById(userId);
      console.log(user);
      req.user = user;
      next();
    });
}