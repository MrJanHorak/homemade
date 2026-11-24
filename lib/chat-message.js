const MAX_CHAT_MESSAGE_LENGTH = 4000;

const validateChatMessage = (value) => {
  if (typeof value !== 'string' || !value.trim()) {
    return { error: 'Enter a message.' };
  }
  const message = value.trim();
  if (message.length > MAX_CHAT_MESSAGE_LENGTH) {
    return { error: `Messages must be ${MAX_CHAT_MESSAGE_LENGTH} characters or fewer.` };
  }
  return { message };
};

export { MAX_CHAT_MESSAGE_LENGTH, validateChatMessage };
