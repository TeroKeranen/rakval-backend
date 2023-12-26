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
  workers: [
    {
      type: mongoose.Schema.Types.ObjectId,
    },
  ],
  // floorplanKey: {
  //   type: String,
  // },
  floorplanKeys: {
    type: [String]
  },
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
  calendarEntries: [calendarEntrySchema]
});


mongoose.model("Worksite", worksiteSchema);