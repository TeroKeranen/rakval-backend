const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  address: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  code: {
    type: String,
    required: true,
    unique: true,
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  workers: [
    {
      type: mongoose.Schema.Types.ObjectId,
    },
  ],
  isPaid: {
    type: Boolean,
    default: false,
    required: true
  },
  subscriptionEndDate: {
    type: Date,
  },
  subscriptionType: {
    type: String,

  }
});


mongoose.model('Company', companySchema)