import { app, sessionMiddleware } from '../server.js'; // Import sessionMiddleware
import debug from 'debug';
import http from 'http';
import { Server } from 'socket.io';
import sharedsession from 'express-socket.io-session'; // Import sharedsession
import { Chat } from '../models/chat.js';
import { Profile } from '../models/profile.js'; // Import Profile model
import { saveMessageToDatabase } from '../controllers/chats.js'; // Import save function

const normalizePort = (val) => {
  const port = parseInt(val, 10);

  if (isNaN(port)) {
    return val;
  }

  if (port >= 0) {
    return port;
  }

  return false;
};

const port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

const server = http.createServer(app);
const io = new Server(server);

// Use shared session middleware for Socket.IO
io.use(
  sharedsession(sessionMiddleware, {
    autoSave: true,
  })
);

io.on('connection', (socket) => {
  // Access user data from session
  const passportUser = socket.handshake.session?.passport?.user;
  const profileId = passportUser?.profile?._id; // Correct path to profile ID

  console.log(
    `a user connected: ${passportUser?.profile?.name || 'Guest'}, socket ID: ${
      socket.id
    }, profile ID: ${profileId}`
  );

  // Join a chat room
  socket.on('join chat', (chatId) => {
    console.log(`Socket ${socket.id} joining chat ${chatId}`);
    socket.join(chatId);
  });

  socket.on('disconnect', () => {
    console.log(
      `user ${passportUser?.profile?.name || socket.id} disconnected`
    );
    // Optionally handle leaving rooms if needed
  });

  // Listen for chat messages
  socket.on('chat message', async (data) => {
    // Ensure user is logged in and profileId is available
    if (!profileId) {
      console.log(
        'Cannot send message: User not logged in or profile ID missing from session.'
      );
      // Optionally emit an error back to the sender
      // socket.emit('chat error', 'You must be logged in to send messages.');
      return;
    }

    console.log(
      `message in chat ${data.chatId} from profile ${profileId}: ${data.msg}`
    );

    try {
      // Find the sender's profile to get their name
      const senderProfile = await Profile.findById(profileId);
      if (!senderProfile) {
        console.error(`Could not find profile for ID: ${profileId}`);
        return; // Or handle error appropriately
      }

      // Save message to DB (using the imported function)
      await saveMessageToDatabase(data.chatId, profileId, data.msg);

      // Broadcast the message to the specific chat room
      const messageData = {
        msg: data.msg,
        chatId: data.chatId,
        userName: senderProfile.name, // Include sender's name
        userId: profileId, // Include sender's profile ID
        timestamp: new Date(),
      };
      io.to(data.chatId).emit('chat message', messageData);
    } catch (err) {
      console.error('Error processing chat message:', err);
      // Optionally emit an error back to the sender or room
    }
  });

  socket.on('typing', (msg) => {
    console.log('typing: ' + msg);
    io.emit('typing', msg);
  });

  socket.on('stop typing', (msg) => {
    console.log('stop typing: ' + msg);
    io.emit('stop typing', msg);
  });
});

const onError = (error) => {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof port === 'string' ? `Pipe ${port}` : `Port ${port}`;

  switch (error.code) {
    case 'EACCES':
      console.error(`${bind} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(`${bind} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
};

const onListening = () => {
  const addr = server.address();
  const bind = typeof addr === 'string' ? `pipe ${addr}` : `port ${addr.port}`;
  debug(`Listening on ${bind}`);
  console.log(`Listening on ${bind}`);
};

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);
