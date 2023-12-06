// controllers/chatController.js
import { Chat } from '../models/chat.js';
import { Profile } from '../models/profile.js';
import { Project } from '../models/project.js';

const saveMessageToDatabase = async (chatId, user, message) => {
  try {
    const chat = await Chat.findById(chatId);
    if (chat) {
      chat.messages.push({ user, message, timestamp: new Date(), read: false });
      await chat.save();
    }
  } catch (error) {
    console.error('Error saving message to database:', error);
  }
};

// get all chats for a specific user
const getChats = async (req, res, next) => {
  try {
    const user = req.user;
    const chats = await Chat.find({
      $or: [{ user1: user.profile._id }, { user2: user.profile._id }],
    });

    // Example: Render chats in an EJS view
    res.render('chat/chats', { chats, user });
  } catch (error) {
    next(error);
  }
}

// Example: Render a chat view
const getChat = async (req, res, next) => {
  try {
    const chatId = req.params.chatId;
    const chat = await Chat.findById(chatId);
    const user = req.user;
    const profile = await Profile.findOne({ user: user._id });
    const project = await Project.findById(chat.project);

    // Example: Render chat view in an EJS view
    res.render('chat/chat', { chat, user, profile, project });
  } catch (error) {
    next(error);
  }
};

// Example: Send a message to a chat

const sendMessage = async (req, res, next) => {
  try {
    const chatId = req.params.chatId;
    const user = req.user;
    const message = req.body.message;

    // Example: Save message to database
    await saveMessageToDatabase(chatId, user, message);

    // Example: Emit message to chat
    req.app.get('io').to(chatId).emit('chat message', {
      user: user.username,
      message,
      timestamp: new Date(),
    });

    // Example: Render chat view in an EJS view
    res.render('chat/chat', { chat, user, profile, project });
  } catch (error) {
    next(error);
  }
};

// Example: Send a typing event to a chat
const sendTyping = async (req, res, next) => {
  try {
    const chatId = req.params.chatId;
    const user = req.user;

    // Example: Emit typing event to chat
    req.app.get('io').to(chatId).emit('typing', user.username);
  } catch (error) {
    next(error);
  }
};

// Example: Create a new chat
const createChat = async (req, res, next) => {
try {
  const user1 = req.user;
  const user2Id = req.body.user2;

  // Example: Check if a chat already exists with these users
  const existingChat = await Chat.findOne({
    $or: [
      { user1: user1._id, user2: user2Id },
      { user1: user2Id, user2: user1._id },
    ],
  });

  if (existingChat) {
    // Redirect to the existing chat
    res.redirect(`/chats/${existingChat._id}`);
  } else {
    // Create a new chat
    const newChat = await Chat.create({ user1, user2: user2Id });

    // Redirect to the new chat
    res.redirect(`/chats/${newChat._id}`);
  }
} catch (error) {
  next(error);
}
};


// Example: Get all chats for a specific project
const getProjectChats = async (req, res, next) => {
  try {
    const projectId = req.params.projectId;
    const chats = await Chat.find({ project: projectId });

    // Example: Render chats in an EJS view
    res.render('chat/chats', { chats, user });
  } catch (error) {
    next(error);
  }
};

// Example: Get all chats for a specific user and project
const getUserProjectChats = async (req, res, next) => {
  try {
    const user = req.user;
    const projectId = req.params.projectId;
    const chats = await Chat.find({
      $or: [{ user1: user._id }, { user2: user._id }],
      project: projectId,
    });

    // Example: Render chats in an EJS view
    res.render('chat/chats', { chats, user });
  } catch (error) {
    next(error);
  }
};

// Example: Get chat history for a specific chat
const getChatHistory = async (req, res, next) => {
  try {
    const chatId = req.params.chatId;
    const chat = await Chat.findById(chatId);

    // Example: Render chat history in an EJS view
    res.render('chat/history', { chat });
  } catch (error) {
    next(error);
  }
};

export {
  getChat,
  sendMessage,
  sendTyping,
  createChat,
  getChats,
  getProjectChats,
  getUserProjectChats,
  getChatHistory,
};