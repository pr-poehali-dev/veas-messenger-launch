import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Chat {
  id: number;
  name: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
  avatar: string;
  encrypted: boolean;
}

interface Message {
  id: number;
  text: string;
  time: string;
  sent: boolean;
  encrypted: boolean;
}

const mockChats: Chat[] = [
  { id: 1, name: 'Анна Иванова', lastMessage: 'Привет! Как дела?', time: '14:23', unread: 2, online: true, avatar: '👩', encrypted: true },
  { id: 2, name: 'Команда проекта', lastMessage: 'Встреча завтра в 10:00', time: '13:45', unread: 5, online: true, avatar: '👥', encrypted: true },
  { id: 3, name: 'Максим', lastMessage: 'Отправил файлы', time: '12:10', unread: 0, online: false, avatar: '👨', encrypted: true },
  { id: 4, name: 'Мария', lastMessage: 'Спасибо за помощь!', time: '11:30', unread: 0, online: true, avatar: '👩‍💼', encrypted: true },
  { id: 5, name: 'Саша', lastMessage: 'Созвонимся вечером?', time: 'Вчера', unread: 1, online: false, avatar: '🧑', encrypted: true },
];

const mockMessages: Message[] = [
  { id: 1, text: 'Привет! Как дела?', time: '14:20', sent: false, encrypted: true },
  { id: 2, text: 'Отлично! Работаю над новым проектом', time: '14:21', sent: true, encrypted: true },
  { id: 3, text: 'Звучит интересно! Расскажешь подробнее?', time: '14:23', sent: false, encrypted: true },
];

export default function Index() {
  const [activeChat, setActiveChat] = useState<Chat | null>(mockChats[0]);
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [newMessage, setNewMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'chats' | 'calls' | 'contacts' | 'profile' | 'settings'>('chats');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredChats = mockChats.filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sendMessage = () => {
    if (newMessage.trim()) {
      const newMsg: Message = {
        id: messages.length + 1,
        text: newMessage,
        time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        sent: true,
        encrypted: true,
      };
      setMessages([...messages, newMsg]);
      setNewMessage('');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="flex-1 flex overflow-hidden">
        <div className="w-full md:w-96 border-r border-border flex flex-col">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                veas
              </h1>
              <Badge variant="outline" className="gap-1">
                <Icon name="Shield" size={12} />
                E2E
              </Badge>
            </div>
            <div className="relative">
              <Icon name="Search" size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Поиск чатов..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            {filteredChats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => setActiveChat(chat)}
                className={`p-4 cursor-pointer transition-all hover:bg-muted/50 border-b border-border animate-fade-in ${
                  activeChat?.id === chat.id ? 'bg-muted' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="text-2xl">{chat.avatar}</AvatarFallback>
                    </Avatar>
                    {chat.online && (
                      <div className="absolute bottom-0 right-0 h-3 w-3 bg-accent rounded-full border-2 border-background animate-pulse" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold truncate">{chat.name}</h3>
                      <span className="text-xs text-muted-foreground">{chat.time}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground truncate flex-1">
                        {chat.encrypted && <Icon name="Lock" size={12} className="inline mr-1" />}
                        {chat.lastMessage}
                      </p>
                      {chat.unread > 0 && (
                        <Badge className="ml-2 bg-primary">{chat.unread}</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </ScrollArea>
        </div>

        <div className="flex-1 flex flex-col">
          {activeChat ? (
            <>
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="text-xl">{activeChat.avatar}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="font-semibold">{activeChat.name}</h2>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      {activeChat.online ? (
                        <><div className="h-2 w-2 bg-accent rounded-full" /> онлайн</>
                      ) : (
                        'не в сети'
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Icon name="ShieldCheck" size={14} />
                    Зашифровано
                  </Badge>
                  <Button variant="ghost" size="icon">
                    <Icon name="Phone" size={20} />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Icon name="Video" size={20} />
                  </Button>
                </div>
              </div>

              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4 max-w-3xl mx-auto">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sent ? 'justify-end' : 'justify-start'} animate-slide-up`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                          msg.sent
                            ? 'bg-gradient-to-r from-primary to-secondary text-primary-foreground'
                            : 'bg-muted text-foreground'
                        }`}
                      >
                        <p className="text-sm">{msg.text}</p>
                        <div className="flex items-center gap-1 justify-end mt-1">
                          <span className="text-xs opacity-70">{msg.time}</span>
                          {msg.encrypted && <Icon name="Lock" size={10} className="opacity-70" />}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="p-4 border-t border-border">
                <div className="flex items-center gap-2 max-w-3xl mx-auto">
                  <Button variant="ghost" size="icon">
                    <Icon name="Paperclip" size={20} />
                  </Button>
                  <Input
                    placeholder="Сообщение защищено E2E шифрованием..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    className="flex-1"
                  />
                  <Button onClick={sendMessage} size="icon" className="bg-gradient-to-r from-primary to-secondary">
                    <Icon name="Send" size={20} />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Icon name="MessageSquare" size={64} className="mx-auto mb-4 opacity-50" />
                <p>Выберите чат для начала общения</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <nav className="border-t border-border bg-card">
        <div className="flex justify-around items-center h-16">
          <Button
            variant={activeTab === 'chats' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('chats')}
            className="flex-col h-14 gap-1"
          >
            <Icon name="MessageSquare" size={20} />
            <span className="text-xs">Чаты</span>
          </Button>
          <Button
            variant={activeTab === 'calls' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('calls')}
            className="flex-col h-14 gap-1"
          >
            <Icon name="Phone" size={20} />
            <span className="text-xs">Звонки</span>
          </Button>
          <Button
            variant={activeTab === 'contacts' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('contacts')}
            className="flex-col h-14 gap-1"
          >
            <Icon name="Users" size={20} />
            <span className="text-xs">Контакты</span>
          </Button>
          <Button
            variant={activeTab === 'profile' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('profile')}
            className="flex-col h-14 gap-1"
          >
            <Icon name="User" size={20} />
            <span className="text-xs">Профиль</span>
          </Button>
          <Button
            variant={activeTab === 'settings' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('settings')}
            className="flex-col h-14 gap-1"
          >
            <Icon name="Settings" size={20} />
            <span className="text-xs">Настройки</span>
          </Button>
        </div>
      </nav>
    </div>
  );
}
