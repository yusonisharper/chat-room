const express = require('express');
const cookieParser = require('cookie-parser');
const hbs = require('express-handlebars');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const homeHandler = require('./controllers/home.js');
var roomList = [];
const getRoomList = () => roomList;
const roomHandler = require('./controllers/room.js')(getRoomList);

const app = express();
const port = 8080;

const uri = "mongodb+srv://wang757566564:XxlJI4Q0Mx969BQL@cluster0.y10dzvz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
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
app.engine('hbs', hbs({
    extname: 'hbs',
    defaultLayout: 'layout',
    layoutsDir: path.join(__dirname, 'views/layouts/'),
    helpers: {
        eq: (a, b) => a === b
    }
}));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// JWT Secret Key
const secretKey = 'your_secret_key';

// Create controller handlers to handle requests at each endpoint
app.get('/', homeHandler.getHome);

app.get('/RoomList', async (req, res) => {
    try {
        const database = client.db('my_db');
        const collection = database.collection('rooms');
        const query = {};
        const options = {
            sort: { created_date: 1 },
            projection: { _id: 0, roomID: 1, roomName: 1, created_date: 1 },
        };
        const cursor = collection.find(query, options);
        if ((await collection.countDocuments()) === 0) {
            console.log("No documents found!");
        } else {
            let list = [];
            await cursor.forEach(item => { list.push(item) });
            roomList = list;
        }
        res.json(roomList);
    } catch (error) {
        console.error('Error fetching room list:', error);
        res.status(500).json({ error: 'Error fetching room list' });
    }
});

async function handleMessageRequest(req, res) {
    try {
        let messages = [];
        const database = client.db('my_db');
        const collection = database.collection('messages');
        const query = { 'roomID': req.params.roomID };
        const options = {
            sort: { created_date: 1 },
            projection: { _id: 1, roomID: 1, name: 1, body: 1, created_date: 1 },
        };
        const cursor = collection.find(query, options);
        if ((await collection.countDocuments()) === 0) {
            console.log("No documents found!");
        } else {
            await cursor.forEach(item => { messages.push(item) });
        }
        res.json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Error fetching messages' });
    }
}
app.get('/:roomID/messages', handleMessageRequest);

app.get('/:roomID', roomHandler.getRoom);

///////////////////////////////////post endpoint/////////////////////////////////////////////////////////////////
const roomGenerator = require('./util/roomIdGenerator.js');
app.post('/newRoom', async (req, res) => {
    try {
        const database = client.db('my_db');
        const collection = database.collection('rooms');
        const newRoom = {
            roomName: req.body.roomName,
            roomID: roomGenerator.roomIdGenerator(),
            created_date: new Date()
        };
        const result = await collection.insertOne(newRoom);
        console.log(`New room created with the following id: ${result.insertedId}`);
        res.json('new room created');
    } catch (error) {
        console.error('Error creating new room:', error);
        res.status(500).json({ error: 'Error creating new room' });
    }
});

app.post('/:roomID-delete', async (req, res) => {
    try {
        const database = client.db('my_db');
        const collection = database.collection('rooms');
        const query = { 'roomID': req.params.roomID };
        const result = await collection.deleteOne(query);
        if (result.deletedCount === 1) {
            res.json('room deleted');
        } else {
            res.status(404).json('room not found');
        }
    } catch (error) {
        console.error('Error deleting room:', error);
        res.status(500).json({ error: 'Error deleting room' });
    }
});

app.post('/:roomID/messages-delete', async (req, res) => {
    try {
        const database = client.db('my_db');
        const collection = database.collection('messages');
        const query = { '_id': new ObjectId(req.body.msgID) };
        const result = await collection.deleteOne(query);
        if (result.deletedCount === 1) {
            res.json('message deleted');
        } else {
            res.status(404).json('msg not found');
        }
    } catch (error) {
        console.error('Error deleting message:', error);
        res.status(500).json({ error: 'Error deleting message' });
    }
});

app.post('/:roomID/messages-update', async (req, res) => {
    try {
        const database = client.db('my_db');
        const collection = database.collection('messages');
        const query = { _id: new ObjectId(req.body.msgID) };
        const update = { $set: { body: req.body.text } };
        const result = await collection.updateOne(query, update);
        if (result.modifiedCount === 1) {
            res.json('message updated');
        } else {
            res.status(404).json('msg not found');
        }
    } catch (error) {
        console.error('Error updating message:', error);
        res.status(500).json({ error: 'Error updating message' });
    }
});

app.post('/:roomID/messages', async (req, res) => {
    try {
        const { message, nickName, date } = req.body;
        const database = client.db('my_db');
        const collection = database.collection('messages');
        const newMsg = {
            roomID: req.params.roomID,
            name: nickName,
            body: message,
            created_date: date
        };
        const result = await collection.insertOne(newMsg);
        res.json('message sent');
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Error sending message' });
    }
});

////////////////////// User Authentication //////////////////////
client.connect().then(() => {
    const database = client.db('my_db');
    const userCollection = database.collection('users');

    // Sign up route
    app.post('/signup', async (req, res) => {
        const { username, password } = req.body;
        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            const user = { username, password: hashedPassword };
            await userCollection.insertOne(user);
            res.status(201).json({ message: 'User created successfully' });
        } catch (error) {
            console.error('Error signing up:', error);
            res.status(500).json({ error: 'Error creating user' });
        }
    });

    // Log in route
    app.post('/login', async (req, res) => {
        const { username, password } = req.body;
        try {
            const user = await userCollection.findOne({ username });
            if (!user) {
                return res.status(400).json({ error: 'Invalid username or password' });
            }
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).json({ error: 'Invalid username or password' });
            }
            const token = jwt.sign({ userId: user._id }, secretKey, { expiresIn: '1h' });
            res.json({ message: 'Logged in successfully', token, username: user.username });
        } catch (error) {
            console.error('Error logging in:', error);
            res.status(500).json({ error: 'Error logging in' });
        }
    });

    app.get('/:username', (req, res) => {
        const { username } = req.params;
        res.render('home', { title: 'home', username }); // Pass the username to the template
    });

    // User homepage route
    app.get('/user/:username', (req, res) => {
        const { username } = req.params;
        res.render('user_home', { title: 'Home', username }); // Render a new template user_home.hbs
    });

    app.post('/logout', (req, res) => {
        // Clear any server-side session or cookies here if necessary
        res.json({ message: 'Logged out successfully' });
    });

    app.get('/user/:username/profile', async (req, res) => {
        const { username } = req.params;

        try {
            const database = client.db('my_db');
            const collection = database.collection('users');
            const user = await collection.findOne({ username });

            if (user) {
                res.render('profile', { 
                    title: 'Profile', 
                    username, 
                    gender: user.gender || '', 
                    age: user.age || '', 
                    introduction: user.introduction || '' 
                });
            } else {
                res.status(404).send('User not found');
            }
        } catch (error) {
            console.error('Error fetching user profile:', error);
            res.status(500).json({ error: 'Error fetching user profile' });
        }
    });

    app.post('/user/:username/profile/update', async (req, res) => {
        const { username } = req.params;
        const { gender, age, introduction } = req.body;

        try {
            const database = client.db('my_db');
            const collection = database.collection('users');
            await collection.updateOne(
                { username },
                { $set: { gender, age, introduction } }
            );
            res.redirect(`/user/${username}`);
        } catch (error) {
            console.error('Error updating profile:', error);
            res.status(500).json({ error: 'Error updating profile' });
        }
    });

    

    app.listen(port, () => console.log(`Server listening on http://localhost:${port}`));
}).catch(err => {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
});
