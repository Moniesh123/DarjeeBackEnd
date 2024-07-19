const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const ClothItems = new mongoose.Schema({
    AdminImage: {
        data: Buffer,
        contentType: String
    },
    AdminName: {
        type : String,
        unique:true,
        required:true,
    },
    AdminEmail: {
        type : String,
        unique:true,
        required:true,
    },
    AdminPassword: {
        type : String,
        unique:true,
    },
    Cloth: [],
    Orders: [],
    Users: [],
    Tailors: []
});

module.exports = mongoose.model('ClothItem', ClothItems);
