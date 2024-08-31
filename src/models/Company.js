const mongoose = require('mongoose');


// Tuote-scheman määrittely
const productSchema = new mongoose.Schema({
  barcode: {
    type: String,
    required: true,
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
    type: Number,
  }
});

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

  },
  products: [productSchema]
});


mongoose.model('Company', companySchema);
mongoose.model('Product', productSchema);