const mongoose = require('mongoose');


const workDaysSchema = new mongoose.Schema({
  running: Boolean,
  startDate: String,
  startTime: String,
  endDate: String,
  endTime: String,
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
})

const calendarEntrySchema = new mongoose.Schema({
  date: String,
  title: String,
  text: String
})

const floorplanSchema = new mongoose.Schema({
  key: String,
  title: String
})

// Tuote-scheman määrittely
const productSchema = new mongoose.Schema({
  barcode: {
    type: String,
    
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
  },
  quantity: {
    type: Number,
    default: 0
  },
  price: {
    type: mongoose.Schema.Types.Decimal128, // Käytä Decimal128-tyyppiä
    get: (v) => parseFloat(v.toString()).toFixed(2), // Muunna kahden desimaalin tarkkuudella lukumuotoon
    set: (v) => parseFloat(v).toFixed(2) // Aseta aina kahden desimaalin tarkkuudella
  }
});


const worksiteSchema = new mongoose.Schema({

  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  startTime: {
    type: String,
    required: true,
    
  },
  worktype: {
    type: String,
    required: true
  },
  duehours: {
    type: Number,

  },
  workers: [
    {
      type: mongoose.Schema.Types.ObjectId,
    },
  ],
  // floorplanKey: {
  //   type: String,
  // },
  floorplanKeys: [floorplanSchema],
  markers: [{
    x: Number,
    y: Number,
    info: String,
    creator: String,
    created : String,
    imageUri: String,
    markerNumber : Number,
    floorplanIndex: Number
  }],
  workDays: [workDaysSchema],
  calendarEntries: [calendarEntrySchema],
  isReady: {
    type: Boolean,
    default: false,
    require: true
  },
  products: [productSchema]
});


mongoose.model("Worksite", worksiteSchema);