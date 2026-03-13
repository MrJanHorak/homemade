// sendMessage() function to emit a message from the client to the server. The server then saves the message to the database and emits the message to the chat. The client then receives the message and renders it to the chat view.
//
// The following code snippet shows the sendMessage() function:
// // Path: public/js/chats/directChat.js
// // Send message to chat
// const sendMessage = () => {
//   const message = messageInput.value;
//   socket.emit('chat message', message);
//   messageInput.value = '';
// };
// The following code snippet shows the socket.on('chat message') event listener:
// // Path: public/js/chats/directChat.js
// // Receive message from chat
// socket.on('chat message', (message) => {
//   const messageElement = document.createElement('li');
//   messageElement.innerHTML = `<span class="font-weight-bold">${message.user}</span>: ${message.message}`;
//   messagesList.appendChild(messageElement);
// });
// The following code snippet shows the chat view:
// <!-- Path: views/chat/chat.ejs -->
// <div class="container">
//   <div class="row">
