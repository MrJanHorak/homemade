import ChatShell from '../chat-shell';

export const dynamic = 'force-dynamic';

const ChatPage = async ({ params }) => {
  const { id } = await params;

  return <ChatShell chatId={id} />;
};

export default ChatPage;
