const express = require('express');
const http = require('http');
const multer = require('multer');
const cors = require('cors');
const collection = require('./Schema')
require('./DBconnection');
const { v4: uuidv4 } = require('uuid');
const AdminCollection = require('./AdminSchema');
const TailorSchema = require('./TailorSchema');
const Razorpay = require('razorpay')
const twilio = require('twilio');
const bodyParser = require('body-parser');
const moment = require('moment')
const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server);

PORT = 4500;

const storage = multer.memoryStorage();
const upload = multer({ storage });

require('dotenv').config();
// Twilio credentials
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(cors());
app.use(express.json());

const customCors = (req, res, next) => {
    const allowedOrigins = ['http://localhost:4200', 'http://192.168.0.109:4200'];

    // Check if the request origin is allowed
    if (allowedOrigins.includes(req.headers.origin)) {
        res.header('Access-Control-Allow-Origin', req.headers.origin);
    }

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        return res.status(200).json({});
    }

    next();
};

// Use custom CORS middleware
app.use(customCors);


// app.use(cors({ origin: 'http://localhost:4200' }));

var unirest = require('unirest');

// 100 rs baro otp loo
// var req = unirest("GET", "https://www.fast2sms.com/dev/bulkV2");

// req.query({
//   "authorization": process.env.FAST_AUTHENTICATION, // Make sure to replace "YOUR_API_KEY" with your actual API key
//   "message":'hiiii',
//   "numbers": "7385494029"
// });

// req.headers({
//   "cache-control": "no-cache"
// });

// req.end(function (res) {
//     if (res.error) {
//         console.error("Error:", res.body); // Log the error message returned by the server
//         return;
//       }

//       console.log(res.body);
// });


// Image Posting Image
app.post('/user/:userId/image', upload.single('userImage'), async (req, res) => {
    try {
        const userId = req.params.userId;

        const user = await collection.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No image file uploaded' });
        }

        const image = {
            data: req.file.buffer,
            contentType: req.file.mimetype,
        };

        user.UserImage = image;
        await user.save();

        res.status(200).send(user);
    } catch (error) {
        console.error('Error uploading image:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Image Getting
app.get('/api/user/:userId/image', async (req, res) => {
    const userId = req.params.userId;

    try {
        // Find the user by ID
        const user = await collection.findById(userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Assuming the image is stored in base64 format
        const imageData = user.UserImage.data;

        if (!imageData) {
            return res.status(404).json({ error: 'Image not found for this user' });
        }

        // Send the image data as response
        res.setHeader('Content-Type', 'image/png'); // Update content type if image type is different
        res.send(Buffer.from(imageData, 'base64'));
    } catch (error) {
        console.error('Error fetching user image:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000); // Generates a random 4-digit code
}

// Send msg with twilio
app.post('/send-verification', (req, res) => {
    const { phoneNumber } = req.body;
    // const verificationCode = generateVerificationCode(); // Implement this function
    client.messages.create({
        body: `Your Order Successful`,
        from: twilioPhoneNumber,
        to: '+91' + req.body.to
    })
        .then(message => {
            console.log(message.sid);
            res.send({ success: true, message: 'Verification code sent successfully' });
        })
        .catch(err => {
            console.error(err);
            res.status(500).send({ success: false, message: 'Failed to send verification code' });
        });
});

// send msg with fast2sms

// Users--------------------------------------
// Post Data Into DB Signup
app.post('/Signup', async (req, res) => {
    try {
        let data = new collection(req.body);
        let Result = await data.save();
        res.status(200).send({ successs: true, msg: "Registration SuccessFulll" });
    } catch (error) {
        res.status(200).send({ successs: false, msg: error });
    }
});

// Get Data From DB Login
app.post('/Login', async (req, res) => {
    try {
        let username = req.body.UserName;
        let user = await collection.findOne({ UserName: username });

        if (user) {
            let password = user.Password;
            let mypassword = req.body.Password;
            if (!password) {
                res.status(409).send({ result: "User Password Not Found" });
            } else {
                if (mypassword === password) {
                    res.status(200).send(user);
                } else {
                    res.status(209).send({ result: "Invalid password" });
                }
            }
        } else {
            res.status(404).send({ result: "User not found" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send({ result: "Internal Server Error" });
    }
});


// listing the UserDeatils
app.get('/UserDetails/:_id', async (req, res) => {
    let data = await collection.findById({ _id: req.params._id });
    res.send(data);
});

// Address fetching
app.get('/GettingAddressFromUser/:_id/:Address', async (req, res) => {
    let data = await collection.findById({ _id: req.params._id });
    if (!data) {
        return res.status(404).json({ message: 'User not found' });
    }
    const address = data.Address.find(Address => Address.AddressId === req.params.Address);
    if (!address) {
        return res.status(404).json({ message: 'Address not found for this user' });
    }
    res.json(address);
    console.log(address);
});

// app.put('/Updating/User/:UserId', async (req, res) => {



//     const userId = req.params.UserId;

//     try {
//         // Find the user by ID
//         let user = await collection.findById(userId);

//         if (!user) {
//             return res.status(404).send("User not found");
//         }

//         // Update fields if they exist in the request body
//         if (req.body.FirstName) user.FirstName = req.body.FirstName;
//         if (req.body.LastName) user.LastName = req.body.LastName;
//         if (req.body.Phone) user.Phone = req.body.Phone;
//         if (req.body.Email) user.Email = req.body.Email;

//         // Update UserImage if provided in the request
//         // if (req.file) {
//         //     user.UserImage = {
//         //         data: req.file.buffer,
//         //         contentType: req.file.mimetype
//         //     };
//         // }

//         // Save the updated user
//     await user.save();

//         res.status(200).send({ user: user, message: "User Updated" });
//     } catch (error) {
//         console.error(error);
//         res.status(500).send("Internal Server Error");
//     }
// });


// adding Address

app.put('/Updating/User/:UserId', async (req, res) => {
    const userId = req.params.UserId;
    const newData = req.body;

    try {
        // Find the tailor by ID and update only the specified fields
        const updatedUser = await collection.findByIdAndUpdate(userId, {
            FirstName: newData.FirstName,
            LastName: newData.LastName,
            Phone: newData.Phone,
            Email: newData.Email
        }, { new: true });

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ message: 'User data updated successfully', updatedUser });
    } catch (error) {
        console.error('Error updating User data:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});



app.put('/Address/:_id', async (req, res) => {
    let data = await collection.updateOne(
        { _id: req.params._id },
        {
            $push: {
                Address: {
                    AddressId: uuidv4(),
                    Phone2: req.body.Phone2,
                    Address1: req.body.Address1,
                    Address2: req.body.Address2,
                    Pincode: req.body.Pincode,
                    City: req.body.City,
                    State: req.body.State
                }
            }

        },
        { new: true }
    );
    if (!data) {
        return res.status(404).json({ error: "Document not found" });
    }

    console.log(data);
    res.send(data);
});

// adding Update 
app.put("/AddressUpdate/:_id/:AddressId", async (req, res) => {
    try {
        const user = await collection.findById({ _id: req.params._id });
        const AddressId = req.params.AddressId;
        const Address1 = req.body.Address1;
        const Address2 = req.body.Address2;
        const Phone2 = req.body.Phone2;
        const Pincode = req.body.Pincode;
        const City = req.body.City;
        const State = req.body.State;

        if (user) {
            const userAddress = user.Address;
            const indexToUpdate = userAddress.findIndex(
                (Address) => Address.AddressId === AddressId
            );

            if (indexToUpdate !== -1) {
                userAddress[indexToUpdate] = { Address1, Address2, Phone2, Pincode, State, City };
                await user.save(); // Save the user after updating the item
                res.status(200).json({ message: "Address Updated" });
            }
            else {
                res.status(404).json({ message: "Address Not Found" });
            }
        }
        else {
            res.status(404).json({ message: "User Not Found" });
        }
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
});

// User Deleting Address 
app.put('/DeletingAddress/:_id', async (req, res) => {
    let data = await collection.updateOne(
        { _id: req.params._id },
        {
            $pull: { Address: req.body },
        }
    );
    res.send(data)
    // console.log(data)
});

// Appointment Code
let lastGeneratedCode = 999;
function generateAppointmentCode() {
    lastGeneratedCode++; // Increment the last generated code
    if (lastGeneratedCode > 9999) {
        // If the last generated code exceeds 9999, reset it to 1000
        lastGeneratedCode = 1000;
    }
    return lastGeneratedCode;
}

// Appointment Update
app.put('/Appointment/:_id', async (req, res) => {
    const userId = req.params._id;
    const isoDate = req.body.date;
    const isoTime = req.body.time;

    try {
        const user = await collection.findById(userId);

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Find tailor by ID
        const tailor = await TailorSchema.findById(req.body.SelectedTailor);

        if (!tailor) {
            return res.status(404).json({ error: "Tailor not found" });
        }

        const appointmentData = {
            UsersId: userId,
            FirstName: user.FirstName,
            LastName: user.LastName,
            AppointmentId: uuidv4(),
            AppointmentMiniId: generateVerificationCode(),
            Date: isoDate,
            Time: isoTime,
            ServiceType: req.body.ServiceType,
            SelectedTailor: req.body.SelectedTailor,
            TailorName: tailor.TailorName,
            CommentRequest: req.body.CommentRequest,
            AppointmentStatus: 'pending',
        };

        // Push appointment data into user's UserAppointments array
        user.Appointment.push(appointmentData);

        // Save the updated user data
        await user.save();

        // Push appointment data into tailor's TailorAppointments array
        tailor.TailorAppointment.push(appointmentData);

        // Save the updated tailor data
        await tailor.save();

        // Send notification to user
        const message = `Your appointment with ${tailor.TailorName} at ${isoDate} ${isoTime} has been scheduled.`;

        io.to(userId).emit('newMessage', { orderId: appointmentData.AppointmentId, message });

        // Save the message in the database
        const currentDate = Date.now();
        const formattedDate = moment(currentDate).format('DD/MM/YYYY');

        const newNotification = {
            From: 'Tailor',
            message: message,
            orderId: appointmentData.AppointmentId,
            timestamp: formattedDate
        };

        user.Notifications.push(newNotification);
        await user.save();

        return res.json({ message: "Appointment added to tailor's schedule and notification sent", appointmentData });
    } catch (error) {
        console.error("Error updating appointment:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

// get Tailor By TailorId
app.get('/Tailor/Getting/:id', async (req, res) => {
    const TailorId = req.params.id; // Accessing the ID from the request parameters
    try {
        let data = await TailorSchema.findById(TailorId);
        if (!data) {
            return res.status(404).json({ error: "Tailor not found" });
        }
        res.send(data);
    } catch (error) {
        res.status(500).json({ error: "Server Error" });
    }
});

// get Tailor By TailorId
app.get('/TailorGetting/Appointment/:id/:AppointmentId', async (req, res) => {
    const TailorId = req.params.id; // Accessing the ID from the request parameters
    const AppointmentId = req.params.AppointmentId; // Accessing the appointment ID from the request parameters

    try {
        // Find the tailor by ID
        const tailor = await TailorSchema.findById(TailorId);

        if (!tailor) {
            return res.status(404).json({ error: "Tailor not found" });
        }

        // Find the appointment by AppointmentId in the tailor's appointments
        const appointment = tailor.TailorAppointment.find(appointment => appointment.AppointmentId === AppointmentId);

        if (!appointment) {
            return res.status(404).json({ error: "Appointment not found for this tailor" });
        }

        // Return the appointment data
        res.json(appointment);
    } catch (error) {
        res.status(500).json({ error: "Server Error" });
    }
});

// AppointmentAVailability
app.post('/Check/Availability/:TailorId', async (req, res) => {
    try {
        const { TailorId } = req.params;
        const { time, date } = req.body;

        // Input validation
        if (!TailorId || !time || !date) {
            return res.status(400).json({ error: 'Missing parameters' });
        }

        // Check if Tailor exists
        const tailor = await TailorSchema.findById(TailorId);
        if (!tailor) {
            return res.status(404).json({ error: 'Tailor not found' });
        }

        // Convert the 'date' string from the request body to a Date object
        const [year, month, day] = date.split('-').map(Number);
        const requestedDate = new Date(year, month - 1, day); // month is 0-based index

        // Get the current date and time
        const currentDate = new Date();

        // Check if the requested date is today
        if (requestedDate.toDateString() === currentDate.toDateString()) {
            // Add 30 minutes to the current time
            const nextThirtyMinutes = new Date(currentDate.getTime() + (30 * 60000)); // 30 minutes in milliseconds

            // Extract hours and minutes from the time strings
            const [userHours, userMinutes] = time.split(':').map(Number);
            const [nextHours, nextMinutes] = [nextThirtyMinutes.getHours(), nextThirtyMinutes.getMinutes()];

            // Check if the requested time is within the next 30 minutes
            if (userHours > nextHours || (userHours >= nextHours && userMinutes > nextMinutes)) {
                return res.json({ Timeavailable: true, Dateavailable: true });
            } else {
                return res.json({ Timeavailable: false, Dateavailable: true });
            }
        }

        // Check if the requested date is in the past or not today's date
        if (requestedDate < currentDate) {
            return res.json({ Dateavailable: false });
        }

        // Check availability of the tailor for the given time
        const fromTime = new Date(`1970-01-01T${tailor.FromTime}`);
        const toTime = new Date(`1970-01-01T${tailor.ToTime}`);
        const userTime = new Date(`1970-01-01T${time}`);

        // Check if user time is within tailor's working hours
        const isWithinWorkingHours = userTime >= fromTime && userTime <= toTime;

        return res.json({ Timeavailable: isWithinWorkingHours, Dateavailable: true });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

// User Canceling Appointment 
app.put('/CancelingAppointment/:AdminId/:UserId/:SelectedTailor/:AppointmentId', async (req, res) => {
    try {
        const userId = req.params.UserId;
        const selectedTailorId = req.params.SelectedTailor;
        const appointmentId = req.params.AppointmentId;

        // Cancel the appointment for the user
        const user = await collection.findById(userId);

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const appointmentIndex = user.Appointment.findIndex(appointment => appointment.AppointmentId === appointmentId);

        if (appointmentIndex === -1) {
            return res.status(404).json({ error: "Appointment not found for this user" });
        }

        // Retrieve appointment details before removing it
        const canceledAppointment = user.Appointment[appointmentIndex];

        // Remove the appointment from the user's array
        const canceledAppointmentData = user.Appointment.splice(appointmentIndex, 1)[0];

        // Save the updated user data
        await user.save();

        // Cancel the appointment for the tailor
        const tailor = await TailorSchema.findById(selectedTailorId);

        if (!tailor) {
            return res.status(404).json({ error: "Tailor not found" });
        }

        const tailorAppointmentIndex = tailor.TailorAppointment.findIndex(appointment => appointment.AppointmentId === appointmentId);

        if (tailorAppointmentIndex === -1) {
            return res.status(404).json({ error: "Appointment not found for this tailor" });
        }

        // Remove the appointment from the tailor's array
        tailor.TailorAppointment.splice(tailorAppointmentIndex, 1);

        // Save the updated tailor data
        await tailor.save();

        // Send notification to user
        const adminId = req.params.AdminId; // Assuming you have admin ID to send notifications
        const message = `Your appointment with ${canceledAppointment.TailorName} at ${canceledAppointment.Date} ${canceledAppointment.Time} has been canceled.`;

        io.to(userId).emit('newMessage', { orderId: appointmentId, message });

        // Save the message in the database
        const admin = await AdminCollection.findById(adminId);

        if (!admin) {
            return res.status(404).json({ message: "Admin not found" });
        }

        const currentDate = Date.now();
        const formattedDate = moment(currentDate).format('DD/MM/YYYY');

        const newNotification = {
            From: admin.AdminName,
            message: message,
            orderId: appointmentId,
            timestamp: formattedDate
        };

        user.Notifications.push(newNotification);
        await user.save();

        return res.json({ message: "Appointment canceled successfully and notification sent" });
    } catch (error) {
        console.error("Error canceling appointment:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

// Updating Status
app.put('/UpdateAppointmentStatus/:UserId/:TailorId/:AppointmentId/:status', async (req, res) => {
    try {
        const userId = req.params.UserId;
        const tailorId = req.params.TailorId;
        const appointmentId = req.params.AppointmentId;
        const newStatus = req.params.status;

        // Update the appointment status directly in the user's Appointment array using the positional operator
        await collection.updateOne(
            { _id: userId, "Appointment.AppointmentId": appointmentId },
            { $set: { "Appointment.$.AppointmentStatus": newStatus } }
        );

        // Find the tailor by ID
        const tailor = await TailorSchema.findById(tailorId);
        if (!tailor) {
            return res.status(404).json({ error: "Tailor not found" });
        }

        // Find the appointment in the tailor's appointments array
        const tailorAppointmentIndex = tailor.TailorAppointment.findIndex(appointment => appointment.AppointmentId === appointmentId);
        if (tailorAppointmentIndex === -1) {
            return res.status(404).json({ error: "Appointment not found for this tailor" });
        }

        // Push appointment data with new status into confirmedAppointments array
        const confirmedAppointment = tailor.TailorAppointment[tailorAppointmentIndex];
        confirmedAppointment.AppointmentStatus = newStatus; // Update status to the new status

        // Remove the appointment from the tailor's appointments array
        tailor.TailorAppointment.splice(tailorAppointmentIndex, 1);

        // Save the updated tailor data
        await tailor.save();

        // Add the confirmed appointment to the tailor's confirmedAppointments array
        tailor.confirmedAppointments.push(confirmedAppointment);
        await tailor.save();

        // Send notification to user
        const message = `Appointment ${confirmedAppointment.AppointmentMiniId} status updated to ${newStatus} by tailor ${confirmedAppointment.TailorName}.`;

        io.to(userId).emit('newMessage', { orderId: confirmedAppointment.AppointmentMiniId, message });

        // Save the message in the user's notifications array
        const formattedDate = new Date();
        const dateform = moment(formattedDate).format('DD/MM/YYYY')

        const newNotification = {
            From: 'Tailor',
            message: message,
            orderId: confirmedAppointment.AppointmentMiniId,
            timestamp: dateform
        };

        const user = await collection.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        user.Notifications.push(newNotification);
        await user.save();

        // Return the complete appointment data with the new status
        return res.json({
            message: "Appointment status updated successfully, notification sent, and confirmed appointment added.",
            confirmedAppointment
        });
    } catch (error) {
        console.error("Error updating appointment status:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});


// Formal ke under ka Shirt
app.put('/Shirt/:_id', async (req, res) => {
    const measurement = {
        ShirtMeasurementId: uuidv4(),
        FormalPantCheckBox: req.body.FormalPantCheckBox,
        FormalShirtCheckBox: req.body.FormalShirtCheckBox,
        Armhole: req.body.Armhole
    };
    let data = await collection.updateOne(
        { _id: req.params._id },
        {
            $push: { 'SwingMeasurementDeatils.Formal.Shirt': measurement }
        },
        { new: true }
    );
    if (!data) {
        return res.status(404).json({ error: "Datta Not Found" });
    }

    console.log(data);
    res.send(data);
});

// Formal Ke Under Pant
app.put('/Pant/:_id', async (req, res) => {
    const measurement = {
        PantMeasurementId: uuidv4(),
        FormalPantCheckBox: req.body.FormalPantCheckBox,
        FormalShirtCheckBox: req.body.FormalShirtCheckBox,
        Thighs: req.body.Thighs,
    }
    let data = await collection.updateOne(
        { _id: req.params._id },
        {
            $push: { 'SwingMeasurementDeatils.Formal.Pant': measurement }
        },
        { new: true }
    );
    console.log(data);
    res.send(data);
});

// Formal Ke Under ShirtPant
app.put('/ShirtPant/:_id', async (req, res) => {
    const measurement = {
        PantMeasurementId: uuidv4(),
        FormalPantCheckBox: req.body.FormalPantCheckBox,
        FormalShirtCheckBox: req.body.FormalShirtCheckBox,
        Thighs: req.body.Thighs,
        Armhole: req.body.Armhole
    }
    let data = await collection.updateOne(
        { _id: req.params._id },
        {
            $push: { 'SwingMeasurementDeatils.Formal.ShirtPant': measurement }
        },
        { new: true }
    );
    console.log(data);
    res.send(data);
});

// Kurtapayjama ke under Kurta
app.put('/Kurta/:_id', async (req, res) => {
    const measurement = {
        KurtaMeasurementId: uuidv4(),
        KurtaCheckBox: req.body.KurtaCheckBox,
        payjamaCheckBox: req.body.payjamaCheckBox,
        KurtaChest: req.body.KurtaChest,
    }
    let data = await collection.updateOne(
        { _id: req.params._id },
        {
            $push: { 'SwingMeasurementDeatils.KurtaPayjama.Kurta': measurement }
        },
        { new: true }
    );
    console.log(data);
    res.send(data);
});

// KurtaPayjama ke under Payjama
app.put('/Payjama/:_id', async (req, res) => {
    const measurement = {
        PayajamaMeasurementId: uuidv4(),
        KurtaCheckBox: req.body.KurtaCheckBox,
        payamaCheckBox: req.body.payamaCheckBox,
        PantLength: req.body.PantLength,
    }
    let data = await collection.updateOne(
        { _id: req.params._id },
        {
            $push: { 'SwingMeasurementDeatils.KurtaPayjama.Payjama': measurement }
        },
        { new: true }
    );
    res.send(data);
    console.log(data);
});

// KURTAPAYJAMA KE UNDER DONO
app.put('/KurtaPayjama/:_id', async (req, res) => {
    const measurement = {
        KurtaCheckBox: req.body.KurtaCheckBox,
        payamaCheckBox: req.body.payamaCheckBox,
        PantLength: req.body.PantLength,
        KurtaChest: req.body.KurtaChest,
    }
    let data = await collection.updateOne(
        { _id: req.params._id },
        {
            $push: { 'SwingMeasurementDeatils.KurtaPayjama.KurtaPayjama': measurement }
        },
        { new: true }
    );
    console.log(data);
    res.send(data);
});

// Balzer
app.put('/Blazer/:_id', async (req, res) => {
    const measurement = {
        BlazerMeasurementId: uuidv4(),
        BlazerChest: req.body.BlazerChest,
        BlazerWeist: req.body.Blazerweist,
    }
    let data = await collection.updateOne(
        { _id: req.params._id },
        {
            $push: { 'SwingMeasurementDeatils.Blazer': measurement }
        },
        { new: true }
    );
    console.log(data);
    res.send(data);
});

// Sherwani
app.put('/Sherwani/:_id', async (req, res) => {
    const measurement = {
        SherwaniMeasurementId: uuidv4(),
        SherwaniChest: req.body.SherwaniChest,
        SherwaniWeist: req.body.Sherwaniweist,
    }
    let data = await collection.updateOne(
        { _id: req.params._id },
        {
            $push: { 'SwingMeasurementDeatils.Sherwani': measurement }
        },
        { new: true }
    );
    console.log(data);
    res.send(data);
});

// Add To Cart
app.post('/Addtocart/:UserId/:ClothId', async (req, res) => {
    const clothId = req.params.ClothId;
    const cloth = await AdminCollection.findOne({ "Cloth.ClothId": clothId });
    const addedCloth = cloth.Cloth.find(cloth => cloth.ClothId === clothId);

    if (!cloth || !addedCloth) {
        return res.status(404).json({ message: 'Cloth not found' });
    }

    try {
        let user = await collection.findById(req.params.UserId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Ensure `AddToCart` is initialized as an array on the user object
        if (!user.AddToCart) {
            user.AddToCart = [];
        }

        // Check for duplication
        const isDuplicate = user.AddToCart.some(item => item.ClothId === clothId);
        if (isDuplicate) {
            return res.status(400).json({ message: 'Item already exists in the cart' });
        } else {
            user.AddToCart.push(addedCloth);
            await user.save();

            res.status(200).json({ message: 'Item added to cart successfully' });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Assume `collection` refers to your user collection

// app.post('/CheckDuplicate/:UserId/:ClothId', async (req, res) => {
//     const userId = req.params`.UserId;
//     const clothId = req.params.ClothId;

//     try {
//         let user = await collection.findById(userId);

//         if (!user) {
//             return res.status(404).json({ message: 'User not found' });
//         }

//         // Ensure `AddToCart` is initialized as an array on the user object
//         if (!user.AddToCart) {
//             user.AddToCart = [];
//         }

//         // Check for duplication
//         const isDuplicate = user.AddToCart.some(item => item.ClothId === clothId);
//         if (isDuplicate) {
//             return res.status(400).json({ message: 'Item already exists in the cart' });
//         }

//         res.status(200).json({ message: 'Item does not exist in the cart' });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message:  'Internal server error' });
//     }
// });


// GettingCart Items
app.get('/AddtoCartGetting/:_id', async (req, res) => {
    let data = await collection.findById({ _id: req.params._id });
    if (!data) {
        return res.status(404).json({ message: 'User not found' });
    }
    res.send(data.AddToCart);
});


// Update Cloth Quantity
// Route to update ClothQunatityUser
// PUT route to update ClothQuantityUser
app.put('/updateClothQuantityUser/:userId/:ClothId', async (req, res) => {
    const userId = req.params.userId;
    const clothId = req.params.ClothId;
    const updatedQuantity = req.body.ClothQuantityUser;
    try {
        // Find the user by _id
        const user = await collection.findOne({ _id: userId });
        if (!user) {
            return res.status(404).send('User not found');
        }

        // Find the cloth item within the user's cart
        const clothIndex = user.AddToCart.findIndex(cloth => cloth.ClothId === clothId);
        if (clothIndex === -1) {
            return res.status(404).send('Cloth item not found');
        }

        // Update ClothQuantityUser
        let quantity = user.AddToCart[clothIndex].ClothQuantityUser = updatedQuantity;
        let Price = user.AddToCart[clothIndex].ClothPrice;
        user.AddToCart[clothIndex].ClothTotalWithQuaPrice = quantity * Price;


        // Update the document in the collection
        const result = await collection.updateOne({ _id: userId }, { $set: { 'AddToCart': user.AddToCart } });

        // Check if the update operation was successful
        if (result.modifiedCount === 1) {
            return res.send('ClothQuantityUser updated successfully');
        } else {
            throw new Error('Failed to update ClothQuantityUser');
        }
    } catch (error) {
        console.error('Error updating ClothQuantityUser:', error);
        return res.status(500).send('Internal server error');
    }
});


// Updating all price
app.post('/CartPrice/:UserId', async (req, res) => {
    const userId = req.params.UserId;

    try {
        // Assuming you have some logic to retrieve userData based on userId
        let userData = await collection.findById(userId);

        if (!userData) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Calculate SalePrice, Tax, and GrandTotal for each item in AddToCart
        let totalPrice = 0;
        let totalTax = 0;
        userData.AddToCart.forEach(item => {
            // Parse price and quantity to numbers
            const price = parseFloat(item.ClothPrice);
            const quantity = parseInt(item.ClothQuantityUser);

            // Calculate SalePrice (assuming no discount for now)
            const salePrice = price;

            // Calculate SingleItemTotal
            const SingleItemTotal = price * quantity;

            // Calculate Tax (assuming 10% tax rate for now)
            const taxRate = 0.12;
            const tax = price * quantity * taxRate; // Multiply by quantity

            // Calculate GrandTotal
            const grandTotal = salePrice * quantity + tax; // Multiply by quantity

            // Add individual item's total price and tax to totals
            totalPrice += salePrice * quantity;
            totalTax += tax;
        });

        // Calculate Total GrandTotal for the entire cart
        const totalGrandTotal = totalPrice + totalTax;

        // Create TotalPriceOfCart object
        const TotalPriceOfCart = {
            subtotalPrice: totalPrice,
            tax: totalTax,
            grandTotal: totalGrandTotal
        };

        // Update or create TotalPriceOfCart in the userData
        userData.TotalPriceOfCart = TotalPriceOfCart;

        // Save the updated userData back to the MongoDB collection
        await userData.save(); // Assuming userData is a Mongoose model instance

        // Send back the updated userData object
        res.json({
            TotalPriceOfCart: TotalPriceOfCart
        });
    } catch (error) {
        console.error("Error updating userData:", error);
        return res.status(500).json({ error: 'Error updating user data' });
    }
});



// UpdatingSignlePrice
app.put('/updateParticularClothPriceUser/:userId/:ClothId', async (req, res) => {
    const userId = req.params.userId;
    const clothId = req.params.ClothId;
    const clothPrice = req.body.ClothPrice;
    const updatedQuantity = req.body.ClothQuantityUser;
    try {
        // Find the user by _id
        const user = await collection.findOne({ _id: userId });
        if (!user) {
            return res.status(404).send('User not found');
        }

        // Find the cloth item within the user's cart
        const clothIndex = user.AddToCart.findIndex(cloth => cloth.ClothId === clothId);
        if (clothIndex === -1) {
            return res.status(404).send('Cloth item not found');
        }

        user.AddToCart[clothIndex].ClothPrice = clothPrice;
        user.AddToCart[clothIndex].ClothQuantityUser = updatedQuantity;

        // Calculate the final total
        const finalTotal = clothPrice * updatedQuantity;

        // Update ClothQuantityUser
        user.AddToCart[clothIndex].ClothTotalWithQuaPrice = finalTotal;

        // Update the document in the collection
        const result = await collection.updateOne({ _id: userId }, { $set: { 'AddToCart': user.AddToCart } });

        // Check if the update operation was successful
        if (result.modifiedCount === 1) {
            return res.send('updated Particular Price updated successfully');
        } else {
            throw new Error('Failed to update updated Particular Price');
        }
    } catch (error) {
        console.error('Error updating updated Particular Price:', error);
        return res.status(500).send('Internal server error');
    }
});

// Remove item
app.put('/RemovingClothItem/:_id', async (req, res) => {
    const ClothId = req.body.ClothId;
    let data = await collection.updateOne(
        { _id: req.params._id },
        {
            $pull: { AddToCart: { ClothId } } // shorthand for { ClothId: ClothId }
        }
    );
    res.send(data);
});


// Getting time
app.get('/GetingTime', async (req, res) => {
    const now = moment();
    const next32hours = moment(now).add(48, 'hours');
    let date = next32hours.format('Do MMMM YYYY');
    let day = next32hours.format('dddd');
    res.send({
        date: date,
        day: day
    });
});

// After Checkout Add The Address
app.put('/AddTheAddress/:UserId', async (req, res) => {
    try {
        const UserId = req.params.UserId;
        const addressId = req.body.AddressId;
        const orderId = req.body.OrderId;

        // Find the user data
        let user = await collection.findById(UserId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Find the order with the matching Order ID
        const order = user.OrderConfirmation.find(order => order.OrderId === orderId);

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Find the address based on the provided address ID
        const address = user.Address.find(addr => addr.AddressId === addressId);

        if (!address) {
            return res.status(404).json({ error: 'Address not found' });
        }

        // Update the order with the address
        order.Address = address;

        // Save the updated user data
        await user.save();

        // console.log('Saved user data:', savedUserData);
        // Send a response with the updated order object
        return res.status(200).json({ message: 'Address added to order successfully', order });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});



// Admin------------Area-----------------------------------------
// ADMIN SignUp
app.post('/AdminSignup', async (req, res) => {
    let data = new AdminCollection(req.body);
    let result = await data.save();
    res.send(result);
});

// Admin Login
app.post('/AdminLogin', async (req, res) => {
    let data = await AdminCollection.findOne(req.body);
    if (req.body.AdminPassword && req.body.AdminEmail) {
        if (data) {
            res.send(data);
        } else {
            res.send({ result: "User Not Found " });
        }
    }
    // else {
    //     res.send({
    //         result: "USER NOT FOUND"
    //     });
    // }
});


// Post (Add) Cloth Products
app.post('/ClothInsert/:_id', upload.single('image'), async (req, res) => {

    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    // Check for other required fields in the request body
    if (!req.body.ClothName || !req.body.ClothAbout || !req.body.ClothQuantities || !req.body.ClothPrice) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const image = {
        data: req.file.buffer,
        contentType: req.file.mimetype,
    };

    try {
        let data = await AdminCollection.updateOne(
            { _id: req.params._id },
            {
                $push: {
                    Cloth: {
                        ClothId: uuidv4(),
                        ClothImge: image,
                        ClothName: req.body.ClothName,
                        ClothAbout: req.body.ClothAbout,
                        ClothQuantityUser: 1,
                        ClothTotalWithQuaPrice: req.body.ClothTotalWithQuaPrice,
                        ClothQuantities: req.body.ClothQuantities,
                        ClothPrice: req.body.ClothPrice,
                    }
                }
            },
            { new: true }
        );

        res.json({ message: 'File uploaded successfully', data });
    } catch (error) {
        // console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// Cloth Update In Admin
// Update Cloth Products
app.put('/ClothUpdate/:clothId', upload.single('image'), async (req, res) => {

    // Check if file is uploaded
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    // Check for other required fields in the request body
    if (!req.body.ClothName || !req.body.ClothAbout || !req.body.ClothQuantities || !req.body.ClothPrice) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const image = {
        data: req.file.buffer,
        contentType: req.file.mimetype,
    };

    try {
        let data = await AdminCollection.updateOne(
            { "Cloth.ClothId": req.params.clothId }, // Match cloth product by ClothId
            {
                $set: {
                    "Cloth.$.ClothImge": image, // Update image
                    "Cloth.$.ClothName": req.body.ClothName, // Update ClothName
                    "Cloth.$.ClothAbout": req.body.ClothAbout, // Update C qlothAbout
                    "Cloth.$.ClothQuantities": req.body.ClothQuantities, // Update ClothQuantities
                    "Cloth.$.ClothPrice": req.body.ClothPrice // Update ClothPrice
                }
            }
        );

        if (data.modifiedCount === 0) {
            return res.status(404).json({ error: 'Cloth product not found' });
        }

        res.json({ message: 'Cloth product updated successfully' });
    } catch (error) {
        // console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// GettingData Of Cloth
app.get('/GettingClothFromAdmin/:_id/:ClothId', async (req, res) => {
    let data = await AdminCollection.findById({ _id: req.params._id });
    if (!data) {
        return res.status(404).json({ message: 'User not found' });
    }
    const Clothdata = data.Cloth.find(Cloth => Cloth.ClothId === req.params.ClothId);
    if (!Clothdata) {
        return res.status(404).json({ message: 'Address not found for this user' });
    }
    res.json(Clothdata);
    console.log(Clothdata);
});

// Getting Cloths Data using Cloth id
app.get('/GettingDetailCloth/:clothId', async (req, res) => {
    try {
        const clothId = req.params.clothId;
        const cloth = await AdminCollection.findOne({ "Cloth.ClothId": clothId });

        if (!cloth) {
            return res.status(404).json({ message: 'Cloth not found' });
        }

        // Find the cloth object with the specified ClothId
        const foundCloth = cloth.Cloth.find(cloth => cloth.ClothId === clothId);

        if (!foundCloth) {
            return res.status(404).json({ message: 'Cloth not found' });
        }

        // Return the found cloth object
        res.json(foundCloth);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


// listing the Cloth Items
app.get('/GettingCloth/:_id', async (req, res) => {
    let data = await AdminCollection.findById({ _id: req.params._id }, "Cloth");
    res.send(data.Cloth);
});

// orders Getting
app.get('/Admin/Orders/:_id', async (req, res) => {
    let data = await AdminCollection.findById({ _id: req.params._id }, "Orders");
    res.send(data.Orders);
});

// Admin Deleting Cloth 
app.put('/DeletingCloth/:_id', async (req, res) => {
    let data = await AdminCollection.updateOne(
        { _id: req.params._id },
        {
            $pull: { Cloth: req.body },
        }
    );
    res.send(data)
    // console.log(data)
});

// Admin Getting All Images
app.get('/GettingClothImages/:userId/images', async (req, res) => {
    const userId = req.params.userId;

    try {
        // Find the user by ID
        let data = [];
        const user = await AdminCollection.findById(userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const ClothArray = user.Cloth.filter(image => image.ClothImge);
        for (let i = 0; i < ClothArray.length; i++) {
            data.push(ClothArray[i].ClothImge);
        }

        // Set the content type before sending the response
        res.setHeader('Content-Type', 'image/png'); // Update content type if image type is different
        res.send(data);
    } catch (error) {
        console.error('Error fetching user images:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// Creating Image Way
app.get('/api/cloth-images', async (req, res) => {
    try {
        // Query the database to retrieve documents containing the Cloth array
        const clothDocuments = await AdminCollection.find({}, { 'Cloth.ClothImage': 1 });

        // Extract clothImage fields from the array
        const clothImages = clothDocuments.flatMap(doc => doc.Cloth.map(item => item.ClothImage));

        // Return the images in the response
        res.json(clothImages);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Admins Responsible For Register Tailor
// Signup API for Tailor
app.post('/TailorSignUp', upload.single('TailorImage'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        // Check for other required fields in the request body
        const {
            TailorName,
            TailorEmail,
            TailorPassword,
            TailorPhone,
            TailorSpecialist,
            FromTime,
            ToTime,
            TailorAddress,
            TailorAbout,
        } = req.body;

        if (!TailorName || !TailorEmail || !TailorPassword || !TailorPhone || !TailorSpecialist || !FromTime || !ToTime || !TailorAddress) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const fromTimeISO = moment(FromTime, 'hh:mm A').format('HH:mm');
        const toTimeISO = moment(ToTime, 'hh:mm P').format('HH:mm');

        // Convert FromTime and ToTime to ISOString using Moment.js
        // const fromTimeISO = moment(fromTime24h, 'HH:mm').toISOString();
        // const toTimeISO = moment(toTime24h, 'HH:mm').toISOString();

        // Check if Tailor already exists
        const existingTailor = await TailorSchema.findOne({ $or: [{ TailorName }, { TailorEmail }, { TailorPhone }] });
        if (existingTailor) {
            return res.status(400).json({ error: 'Tailor already exists' });
        }

        const image = {
            Data: req.file.buffer,
            contentType: req.file.mimetype,
        };

        const tailor = new TailorSchema({
            TailorImage: image,
            TailorName,
            TailorEmail,
            TailorPassword,
            TailorAbout,
            TailorPhone,
            TailorAddress,
            TailorSpecialist,
            FromTime: fromTimeISO,
            ToTime: toTimeISO,
            TailorPost: [],
            TailorAppointment: []
        });

        await tailor.save();

        res.status(201).json({ message: 'Tailor signed up successfully', tailor });
    } catch (error) {
        if (error.code === 11000) {
            console.error("Duplicate key error:", error.keyValue);
            res.status(400).json({ error: `Duplicate key error: ${JSON.stringify(error.keyValue)}` });
        } else if (error.name === 'ValidationError') {
            console.error("Validation error:", error.message);
            res.status(400).json({ error: `Validation error: ${error.message}` });
        } else {
            console.error("Internal server error:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    }
});



// Tailor -----------------------------Area----------------------------

// Getting Tailor By Id
app.get('/GettingTailorId/:TailorId', async (req, res) => {
    const tailorId = req.params.TailorId;
    const tailor = await TailorSchema.findById(tailorId)
    if (tailor) {
        res.json(tailor);
    } else {
        res.status(404).json({ error: 'Tailor not found' });
    }
});

// change password tailors
app.post('/changeTailorpassword/:_id', async (req, res) => {
    const old = req.body.old;
    const newpass = req.body.newpass;
    try {
        // Find the user by ID
        const Tailor = await TailorSchema.findOne({ _id: req.params._id });
        // Check if user exists
        if (!Tailor) {
            return res.status(404).json({ message: 'Tailor not found' });
        }
        // Check if old password matches
        if (Tailor.TailorPassword !== old) {
            return res.status(401).json({ message: 'Old password is incorrect' });
        }
        // Update user password
        await TailorSchema.updateOne(
            { _id: req.params._id },
            { $set: { TailorPassword: newpass } }
        );
        return res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
});


// Tailor Login
app.post('/TailorLogin', async (req, res) => {
    let data = await TailorSchema.findOne(req.body);
    if (req.body.TailorPassword && req.body.TailorEmail && req.body.TailorName) {
        if (data) {
            res.send(data);
        } else {

            res.send({ result: "User Not Found " });
        }
    } else {
        res.send({
            result: "USER NOT FOUND"
        });
    }
});

// Updating Tailor
// Route to update tailor data
app.put('/tailorUpdate/:id', async (req, res) => {
    const { id } = req.params;
    const newData = req.body;
    const FromTime = newData.FromTime;
    const ToTime = newData.ToTime;

    const fromTimeISO = moment(FromTime, 'hh:mm A').format('HH:mm');
    const toTimeISO = moment(ToTime, 'hh:mm P').format('HH:mm');

    try {
        // Find the tailor by ID and update only the specified fields
        const updatedTailor = await TailorSchema.findByIdAndUpdate(id, {
            TailorName: newData.TailorName,
            TailorAddress: newData.TailorAddress,
            TailorPhone: newData.TailorPhone,
            TailorEmail: newData.TailorEmail,
            TailorSpecialist: newData.TailorSpecialist,
            TailorAbout: newData.TailorAbout,
            fromTimeISO,
            toTimeISO
        }, { new: true });

        if (!updatedTailor) {
            return res.status(404).json({ message: 'Tailor not found' });
        }

        res.status(200).json({ message: 'Tailor data updated successfully', updatedTailor });
    } catch (error) {
        console.error('Error updating tailor data:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});



// Tailor Post Inserting
app.put('/TailorDesignPost/:_id', async (req, res) => {

    let data = await TailorSchema.updateOne(
        { _id: req.params._id },
        
        {
            $push: {
                TailorPost: {
                    DesignId: uuidv4(),
                    DesignImg: {
                        type: String,
                        default: Buffer
                    },
                    DesignName: req.body.ClothName,
                    DesignDescription: req.body.ClothDescription,
                }
            }
        },
        { new: true }
    );
    res.send(data);
    console.log(data);
});

// Design Update In Tailor
app.put("/TailorDesignUpdate/:id/:ClothId", async (req, res) => {
    try {
        const Tailor = await TailorSchema.findById({ _id: req.params.id });
        const DesignId = req.params.itemId;
        const DesignName = req.body.ClothName;
        const DesignDescription = req.body.ClothDescription;
        const DesignImage = { type: String, default: Buffer };

        if (Tailor) {
            const TailorDesign = Tailor.TailorPost;
            const indexToUpdate = TailorDesign.findIndex(
                (item) => item.id === DesignId
            );

            if (indexToUpdate !== -1) {
                TailorDesign[indexToUpdate] = { DesignName, DesignDescription, DesignImage };
                await Tailor.save(); // Save the user after updating the item
                res.status(200).json({ message: "Item Updated" });
            }
            else {
                res.status(404).json({ message: "Item Not Found" });
            }
        }
        else {
            res.status(404).json({ message: "User Not Found" });
        }
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
});

// listing the Tailor 
app.get('/GettingTaiors', async (req, res) => {
    // let data = await AdminCollection.findById({ _id: req.params._id });
    let data2 = await TailorSchema.find();
    res.send(data2);
});

// Delete the Tailor
app.delete('/Delete/Tailor/:id', async (req, res) => {
    const TailorId = req.params.id;

    try {
        // Find the user by ID and delete it
        const deletedUser = await TailorSchema.findByIdAndDelete(TailorId);

        if (!deletedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({ message: "User deleted successfully", deletedUser });
    } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// listing the Users 
app.get('/GettingUsers', async (req, res) => {
    let data2 = await collection.find();
    res.send(data2);
});

// Delete User
app.delete('/Delete/User/:id', async (req, res) => {
    const userId = req.params.id;

    try {
        // Find the user by ID and delete it
        const deletedUser = await collection.findByIdAndDelete(userId);

        if (!deletedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({ message: "User deleted successfully", deletedUser });
    } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// listing the Tailor Design Items
app.get('/GettingDesign/:_id', async (req, res) => {
    let data = await TailorSchema.findById({ _id: req.params._id }, "TailorPost");
    res.send(data.TailorPost);
});

// Admin Deleting Cloth 
app.put('/DeleteDesign/:id', async (req, res) => {
    let data = await TailorSchema.updateOne(
        { _id: req.params.id },
        {
            $pull: { TailorPost: req.body },
        }
    );
    res.send(data)
    // console.log(data)
});



// Payment Integration

const RazorpayInstance = new Razorpay({
    key_id: process.env.RazorPay_Id_Key,
    key_secret: process.env.RazorPaySecret_Key
});

// User CheckOut Cart Items
app.post('/CheckOutCartItems/CreateOrder/:UserId/:AdminId/:grandTotal', async (req, res) => {
    const userId = req.params.UserId;
    const AdminId = req.params.AdminId;
    const amount = req.params.grandTotal;
    const orderid = req.body.orderid;
    const PayementId = req.body.PayementId;
    const addressId = req.body.AddressId; // Corrected variable name to match camelCase convention
    const options = {
        amount: amount,
        currency: "INR",
        receipt: "order_rcptid_11"  //You might want to generate this dynamically
    }

    try {
        // Find the user by ID
        let user = await collection.findById(userId);
        let Admin = await AdminCollection.findById(AdminId);

        if (!user) {
            return res.status(404).send('User not found');
        }

        if (!Admin) {
            return res.status(404).send('Admin not found');
        }

        // Find the selected address by its ID
        const selectedAddress = user.Address.find(address => address.AddressId === addressId);
        if (!selectedAddress) {
            return res.status(404).send('Address not found');
        }

        const totalPriceOfCart = user.TotalPriceOfCart;

        let date = Date.now();
        let formDate = moment(date).format('DD/MM/YYYY  HH:MM');
        let formatedDate = moment(date).format('DD/MM/YYYY');
        let formatedTime = moment(date).format('HH:mm');
        // Construct the order confirmation object
        const orderConfirmationItem = {
            OrderId: orderid,
            // OrderId_forUser: generateVerificationCode(),
            CartItems: user.AddToCart,
            Address: selectedAddress, // Adding the selected address to the order confirmation object
            TotalPrice: totalPriceOfCart,
            PaymentOrderId: PayementId, // Save the order ID inside the order confirmation
            OrderDate: formatedDate,
            OrderTime: formatedTime
        };

        user.OrderConfirmation.push(orderConfirmationItem);

        const UserDetails = {
            UserId: userId,
            UserName: user.UserName,
            FirstName: user.FirstName,
            LastName: user.LastName,
            Phone: user.Phone,
            Email: user.Email,
        }

        const orderConfirmationItemToAdmin = {
            userDetails: UserDetails,
            OrderId: orderid,
            CartItems: user.AddToCart,
            Address: selectedAddress, // Adding the selected address to the order confirmation object
            TotalPrice: totalPriceOfCart,
            PaymentOrderId: PayementId, // Save the order ID inside the order confirmation
            OrderDate: formatedDate,
            OrderTime: formatedTime,
        };

        // Push the order confirmation object into the OrderConfirmation array

        Admin.Orders.push(orderConfirmationItemToAdmin);
        // Clear AddToCart array if needed
        user.AddToCart = [];
        user.TotalPriceOfCart = 0;
        // Save the updated user document
        await user.save();
        await Admin.save();


        // Emit Socket.IO event to notify the user
        io.to(userId).emit('YourOrderPlaced', { orderId: orderid });

        // let date = new Date()
        // Save notification in user's collection
        const notification = {
            From: Admin.AdminName,
            message: `Your order with ID <b> ${orderid} </b> has been Placed We Will Deliver WithIn 48 hours.`,
            timestamp: formDate
        };
        user.Notifications.push(notification);

        await user.save();
        // Send response with order details
        res.json({ orderConfirmation: orderConfirmationItem, AdminOrders: orderConfirmationItemToAdmin });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal server error');
    }
});

// Cancel Order
app.put('/CancellIng/:UserId/:AdminId/', async (req, res) => {
    const UserId = req.params.UserId;
    const AdminId = req.params.AdminId;
    const OrderId = req.body.OrderId;

    // Find user and admin
    let user = await collection.findById(UserId);
    let admin = await AdminCollection.findById(AdminId);

    // Find order index in user's order confirmation
    let userOrderIndex = user.OrderConfirmation.findIndex(item => item.OrderId === OrderId);

    // Find order index in admin's orders
    let adminOrderIndex = admin.Orders.findIndex(item => item.OrderId === OrderId);

    if (userOrderIndex !== -1 && adminOrderIndex !== -1) {
        // Remove order from user's order confirmation
        user.OrderConfirmation.splice(userOrderIndex, 1);

        // Remove order from admin's orders
        admin.Orders.splice(adminOrderIndex, 1);

        // Save updated user and admin documents
        await user.save();
        await admin.save();

        let date = Date.now();
        let formDate = moment(date).format('DD/MM/YYYY');

        // Emit Socket.IO event to notify the user
        io.to(UserId).emit('orderCancelled', { orderId: OrderId });

        // Save notification in user's collection
        const notification = {
            From: admin.AdminName,
            message: `Your order with ID <b> ${OrderId} </b> has been cancelled.`,
            timestamp: formDate
        };
        user.Notifications.push(notification);
        await user.save();


        res.send("Order cancelled successfully.");
    } else {
        res.status(404).send("Order not found.");
    }
});

// Delivery Notification
app.post('/send/Delivery/message/:userId/:userOrderId/:AdminId', async (req, res) => {
    const userId = req.params.userId;
    const userOrderId = req.params.userOrderId;
    const AdminId = req.params.AdminId;
    const message = "Out For Delivery"

    try {
        // Emit Socket.IO event to notify the user
        io.to(userId).emit('newMessage', { orderId: userOrderId, message });

        // Save the message in the database
        const user = await collection.findById(userId);
        let admin = await AdminCollection.findById(AdminId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const name = admin.AdminName;
        const currentDate = Date.now();
        const formattedDate = moment(currentDate).format('DD/MM/YYYY');

        const newNotification = {
            From: admin.AdminName,
            message: message,
            orderId: userOrderId,
            timestamp: formattedDate
        };

        user.Notifications.push(newNotification);
        await user.save();

        res.status(200).json({ message: "Message sent and saved successfully" });
    } catch (error) {
        console.error("Error sending message:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// 
function generateOrderId() {
    return Math.floor(100000000 + Math.random() * 900000000);
}

app.post('/CreateOrder', async (req, res) => {
    try {

        const orderId = generateOrderId();
        res.json({ orderId });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/Success', async (req, res) => {

    try {
        const { orderId, paymentId } = req.body;
        // Here you might want to perform further actions based on successful payment
        res.json({ orderId, paymentId, message: "Payment Successful" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/Cancel', async (req, res) => {
    try {
        // Here you might want to handle canceled payments more effectively
        res.send("Payment Cancelled");
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: error.message });
    }
});

// Getting Message
app.get('/Notification/:_id', async (req, res) => {
    let user = await collection.findById({ _id: req.params._id });
    res.send(user.Notifications);
});

// Assuming you have the necessary imports and MongoDB connection already set up

app.get('/ConfirmedGettingAppointment', async (req, res) => {
    try {
        // Retrieve all users' data from the collection
        const userData = await collection.find({});

        // Calculate the total number of appointments across all users
        const totalAppointments = userData.reduce((total, user) => total + user.Appointment.length, 0);

        res.json({ totalAppointments }); // Send the total number of appointments
    } catch (error) {
        console.error('Error retrieving data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


// changinf password
app.post('/change-password/:_id', async (req, res) => {
    const old = req.body.oldpassword;
    const newpass = req.body.newpassword;
    try {
        // Find the user by ID
        const user = await collection.findOne({ _id: req.params._id });
        // Check if user exists
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Check if old password matches
        if (user.Password !== old) {
            return res.status(401).json({ message: 'Old password is incorrect' });
        }
        // Update user password
        await collection.updateOne(
            { _id: req.params._id },
            { $set: { Password: newpass } }
        );
        return res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
});


// Listening PORT
app.listen(PORT, () => {
    console.log('Server Is Connected ' + PORT);
});