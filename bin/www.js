import { app } from '../server.js';
import debug from 'debug';
import http from 'http';
import { Server } from 'socket.io';
import { Chat } from '../models/chat.js';

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

io.on('connection', (socket) => {
  console.log('a user connected to socket.io', socket.id);

  const isAuthenticated = socket.handshake.session && socket.handshake.session.userId;

  if (isAuthenticated) {
    // Access user-specific information from the session
    const userId = socket.handshake.session.userId;

    // Associate the socket with the user ID
    socket.join(userId);

    socket.on('retrieveUnreadMessages', async () => {
      const chats = await Chat.find({
        $or: [{ user1: userId }, { user2: userId }],
        'messages.read': false,
      });

      chats.forEach((chat) => {
        const unreadMessages = chat.messages.filter((msg) => !msg.read);
        socket.emit('unreadMessages', {
          chatId: chat._id,
          messages: unreadMessages,
        });
      });
    });

    socket.on('disconnect', () => {
      console.log('user disconnected');
    });

    socket.on('chat message', (msg) => {
      console.log('message: ' + msg);
      io.emit('chat message', msg);
    });

    socket.on('typing', (msg) => {
      console.log('typing: ' + msg);
      io.emit('typing', msg);
    });

    socket.on('stop typing', (msg) => {
      console.log('stop typing: ' + msg);
      io.emit('stop typing', msg);
    });
  }
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
