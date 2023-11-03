const mongoose = require('mongoose');

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
});


mongoose.model("Worksite", worksiteSchema);