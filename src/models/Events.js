const mongoose = require('mongoose');

const eventsSchema = new mongoose.Schema({
    type: String,
    user: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    worksite: {type: mongoose.Schema.Types.ObjectId, ref: 'Worksite'},
    timestamp: Date,
    companyId: {type: mongoose.Schema.Types.ObjectId, ref: 'Company'},
    markerNumber: {type: String},
    calendarDate: {type: String}
})

mongoose.model('Events', eventsSchema);