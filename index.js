const express = require("express");
const app = express();
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const helmet = require("helmet");
const morgan = require("morgan");
const userRoute = require("./routes/users");
const authRoute = require("./routes/auth");
const postRoute = require("./routes/posts");
const conversationRoute = require("./routes/conversations");
const messageRoute = require("./routes/messages");
const cors = require("cors");
const {Server} = require('socket.io')
const CryptoJS = require("crypto-js");


let users = []

dotenv.config();

const PORT = process.env.PORT

mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
  useFindAndModify: false,
})
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error);
  });

//middleware
const corsOption = {
  origin: [process.env.ALLOWED_HOST],
};
app.use(cors(corsOption));
app.use(express.json());
app.use(helmet());
app.use(morgan("common"));

app.use("/api/auth", authRoute);
app.use("/api/users", userRoute);
app.use("/api/posts", postRoute);
app.use("/api/messages", messageRoute);
app.use("/api/conversations", conversationRoute);

const server = app.listen(process.env.PORT || 8800, () => {
  console.log(`Server is running on port ${server.address().port}`);
});

var io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_HOST
  }
}); 

const addUser = (userId, socketId) => {
  const user = users.find((user) => user.userId === userId)
  if(user) user.socketId = socketId
  else users.push({userId, socketId})
}

const removeUser = (socketId) =>{
  users = users.filter(user => user.socketId !== socketId)
}

const getUser = (userId) => {
  return users.find((user) => user.userId === userId)
}

io.on('connection', (socket) => { 
  // when connected 
  console.log('a user connected') 
  // take userid and socket id from user
  socket.on('addUser', userId => {
    addUser(userId, socket.id)
    io.emit('getUsers', users) 
  })

  // send and get message
  socket.on('sendMessage', ({senderId, receiverId, text, encryptionKey}) => {
    const user = getUser(receiverId)
    console.log(user, 'This is the user', text, 'key', encryptionKey)
    
    if(user) {

      const decryptedMessage = CryptoJS.AES.decrypt(text, encryptionKey).toString(CryptoJS.enc.Utf8);
      
      console.log('decrypted', decryptedMessage)
      io.to(user.socketId).emit('getMessage', {
        senderId,
        text: decryptedMessage,
      })
    }
  })

  // when disconnected
  socket.on('disconnect',  () => {
    console.log('a user disconnected')
    removeUser(socket.id)
    io.emit('getUsers', users) 
  })
})
