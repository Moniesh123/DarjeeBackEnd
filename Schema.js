const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const uniquevalidator = require('mongoose-unique-validator')

const UserSchema = new mongoose.Schema({
    UserName: {
        type : String,
        unique:true,
        uniqueCaseInsensitive:true,
        required:true,
    },
    FirstName: {
        type : String,
        required:true
    },
    LastName: {
        type : String,
        required:true
    },
    Phone: {
        type : Number,
        unique:true,
        required:true,
    },
    Time : {
        type : Date
    },
    Email: {
        uniqueCaseInsensitive:true,
        type : String,
        unique:true,
        required:true,
    },
    Password: {
        uniqueCaseInsensitive:true,
        type : String,
        required:true
        },
    UserImage: {
        data: Buffer,
        contentType: String
    },
    Address: [],
    AddToCart: [],
    TotalPriceOfCart : {},
    Appointment: [ ],
    SwingMeasurementDeatils: {
        Formal: {
            Shirt: [ ],
            Pant: [ ],
            ShirtPant: [ ]
        },
        KurtaPayjama: {
            Kurta: [ ],
            Payjama: [ ],
            KurtaPayjama: [ ],
        },
        Blazer: [ ],
        Sherwani: [ ]
    },
    OrderConfirmation: [{}],
    Notifications:[{}]
});

UserSchema.plugin(uniquevalidator, {message: '{PATH} Is Already Exist.'});

module.exports = mongoose.model('UsersData', UserSchema);