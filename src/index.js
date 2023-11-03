require('dotenv').config();
require('./models/User')
require('./models/Worksite')
require('./models/Company')
const express = require('express');
const mongoose = require('mongoose')
const bodyParser = require('body-parser')
const authRoutes = require('./routes/authRoutes')
const worksiteRoutes = require('./routes/worksiteRoutes')
const companyRoutes = require('./routes/companyRoutes')
const requireAuth = require('./middlewares/requierAuth')

const app = express();

app.use(bodyParser.json());
app.use(authRoutes);
app.use(worksiteRoutes)
app.use(companyRoutes)



mongoose.connect(process.env.DATABASE_URL)

mongoose.connection.on('connected', () => {
    console.log("connected to mongodb")
})

mongoose.connection.on('error', (err) => {
    console.log(err)
})

app.get('/', requireAuth, (req,res) => {

    res.send(`your email ${req.user.email}`)


})


app.listen(3000, () => {
    console.log("Server started")
})