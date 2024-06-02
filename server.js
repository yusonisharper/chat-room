// import dependencies
const express = require('express');
const cookieParser = require('cookie-parser');
const hbs = require('express-handlebars');
const path = require('path');

// import handlers
const homeHandler = require('./controllers/home.js');
var roomList = []
const getRoomList = () => roomList;
const roomHandler = require('./controllers/room.js')(getRoomList);

const app = express();
const port = 8080;

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { AsyncLocalStorage } = require('async_hooks');
const uri = "mongodb+srv://wang757566564:XxlJI4Q0Mx969BQL@cluster0.y10dzvz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// If you choose not to use handlebars as template engine, you can safely delete the following part and use your own way to render content
// view engine setup
app.engine('hbs', hbs({ extname: 'hbs', defaultLayout: 'layout', layoutsDir: __dirname + '/views/layouts/' }));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// set up stylesheets route

// TODO: Add server side code

// Create controller handlers to handle requests at each endpoint
const { get } = require('https');
app.get('/', homeHandler.getHome);

app.get('/RoomList', async (req, res) => {
    const database = client.db('my_db');
    const collection = database.collection('rooms');
    const query = {}; // Adjust the query as needed
    const options = {
        // Sort by created date in ascending order
        sort: { created_date: 1 },
        // Include only the fields we need
        projection: { _id: 0, roomID: 1, roomName: 1, created_date: 1 },
    };
    const cursor = collection.find(query, options);
    // store
    if ((await collection.countDocuments()) === 0) {
        console.log("No documents found!");
    } else {
        let list = [];
        await cursor.forEach(item => { list.push(item) });
        roomList = list;
        //console.log(list);
    }
    res.json(roomList);
});

async function handleMessageRequest(req, res) {
    let messages = [];
    const database = client.db('my_db');
    const collection = database.collection('messages');
    const query = {'roomID': req.params.roomID}; // Adjust the query as needed
    const options = {
        // Sort by created date in ascending order
        sort: { created_date: 1 },
        // Include only the fields we need
        projection: { _id: 1, roomID: 1, name: 1, body: 1, created_date: 1 },
    };
    const cursor = collection.find(query, options);
    // Print each document
    if ((await collection.countDocuments()) === 0) {
        console.log("No documents found!");
    } else {
        // fetch all of the messages for this room
        await cursor.forEach(item => { messages.push(item) });
    }
    // encode the messages object as JSON and send it back
    res.json(messages);
}
app.get('/:roomID/messages', handleMessageRequest);

app.get('/:roomID', roomHandler.getRoom);


///////////////////////////////////post endpoint/////////////////////////////////////////////////////////////////
const roomGenerator = require('./util/roomIdGenerator.js');
app.post('/newRoom', async (req, res) => {
    const database = client.db('my_db');
    const collection = database.collection('rooms');
    const newRoom = {
        roomName: req.body.roomName, 
        roomID: roomGenerator.roomIdGenerator(),
        created_date: new Date()
    }
    const result = await collection.insertOne(newRoom);
    console.log(`New room created with the following id: ${result.insertedId}`);
    res.json('new room created');
});

app.post('/:roomID-delete', async (req, res) => {
    const database = client.db('my_db');
    const collection = database.collection('rooms');
    const query = {'roomID': req.params.roomID}; // Adjust the query as needed
    const result = await collection.deleteOne(query);
    if (result.deletedCount === 1) {
        res.json('room deleted');
    } else {
        res.status(404).json('room not found');
    }
})

app.post('/:roomID/messages-delete', async (req, res) => {
    const database = client.db('my_db');
    const collection = database.collection('messages');
    const query = {'_id': new ObjectId(req.body.msgID)}; // Adjust the query as needed
    const result = await collection.deleteOne(query);
    if (result.deletedCount === 1) {
        res.json('message deleted');
    } else {
        res.status(404).json('msg not found');
    }
});

// app.post('/:roomID/messages-search', async (req, res) => {
//     const database = client.db('my_db');
//     const collection = database.collection('messages');
//     const query = { 
//         roomID: req.params.roomID, 
//         $text: { $search: req.body.search }
//     }; // Ensure you have a text index on the collection
//     const options = {
//         // Sort by created date in ascending order
//         sort: { created_date: 1 },
//         // Include only the fields we need
//         projection: { _id: 1, roomID: 1, name: 1, body: 1, created_date: 1 },
//     };
//     const messages = await collection.find(query).toArray();
//     console.log(messages);
//     res.json(messages);
// });

app.post('/:roomID/messages-update', async (req, res) => {
    const database = client.db('my_db');
    const collection = database.collection('messages');
    const query = {_id: new ObjectId(req.body.msgID)}; // Adjust the query as needed
    const update = {$set:{body: req.body.text}};
    const result = await collection.updateOne(query, update);
    if (result.modifiedCount === 1) {
        res.json('message updated');
    } else {
        res.status(404).json('msg not found');
    }
});

app.post('/:roomID/messages', async (req, res) => {
    const { message, nickName, date } = req.body;
    //console.log(req.body);
    const database = client.db('my_db');
    const collection = database.collection('messages');
    const newMsg = { 
        roomID: req.params.roomID,
        name: nickName,
        body: message,
        created_date: date
    }
    const result = await collection.insertOne(newMsg);
    res.json('message sent');
});

// NOTE: This is the sample server.js code we provided, feel free to change the structures

app.listen(port, () => console.log(`Server listening on http://localhost:${port}`));