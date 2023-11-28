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
  floorplanKey: {
    type: String,
  },
  markers: [{
    x: Number,
    y: Number,
    info: String,
    creator: String,
    created : String,
    imageUri: String
  }],
  workDays: [workDaysSchema],
});


mongoose.model("Worksite", worksiteSchema);