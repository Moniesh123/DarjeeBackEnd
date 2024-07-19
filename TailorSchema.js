const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const TailorSchema = new mongoose.Schema({
    TailorImage: {
        Data: Buffer,
        contentType: String
    },
    TailorName: {
        type: String,
        unique: true,
        uniqueCaseInsensitive: true,
        required: true,
    },
    TailorEmail: {
        uniqueCaseInsensitive: true,
        type: String,
        unique: true,
        required: true,
    },
    TailorPassword: {
        uniqueCaseInsensitive: true,
        type: String,
        required: true
    },
    TailorAbout: {
        type: String,
        required: false 
    },
    TailorPhone: {
        type: Number,
        unique: true,
        required: true,
    },
    TailorSpecialist: {
        type: String,
        required: true
    },
    FromTime: {
        type: String,
        required: true
    },
    ToTime: {
        type: String,
        required: true
    },
    TailorAddress: {
        type: String,
        required: true
    },
    confirmedAppointments : [],
    TailorPost: [],
    TailorAppointment: [],
});

module.exports = mongoose.model('Tailor', TailorSchema);