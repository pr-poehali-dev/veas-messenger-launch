import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface Chat {
  id: number;
  name: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
  avatar: string;
  encrypted: boolean;
  phone?: string;
}

interface Message {
  id: number;
  text: string;
  time: string;
  sent: boolean;
  encrypted: boolean;
}

interface Contact {
  name: string;
  phone: string;
  avatar: string;
}

const mockChats: Chat[] = [
  { id: 1, name: 'Анна Иванова', lastMessage: 'Привет! Как дела?', time: '14:23', unread: 2, online: true, avatar: '👩', encrypted: true, phone: '+79001234567' },
  { id: 2, name: 'Команда проекта', lastMessage: 'Встреча завтра в 10:00', time: '13:45', unread: 5, online: true, avatar: '👥', encrypted: true },
  { id: 3, name: 'Максим', lastMessage: 'Отправил файлы', time: '12:10', unread: 0, online: false, avatar: '👨', encrypted: true, phone: '+79007654321' },
  { id: 4, name: 'Мария', lastMessage: 'Спасибо за помощь!', time: '11:30', unread: 0, online: true, avatar: '👩‍💼', encrypted: true, phone: '+79009876543' },
  { id: 5, name: 'Саша', lastMessage: 'Созвонимся вечером?', time: 'Вчера', unread: 1, online: false, avatar: '🧑', encrypted: true, phone: '+79005556677' },
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
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [importedContacts, setImportedContacts] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [showContactsPermission, setShowContactsPermission] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!importedContacts) {
        setShowContactsPermission(true);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [importedContacts]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isCallActive) {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isCallActive]);

  const requestContactsAccess = async () => {
    setShowContactsPermission(false);
    
    toast({
      title: "Доступ к контактам",
      description: "Загружаем ваши контакты...",
    });

    setTimeout(() => {
      const simulatedContacts: Contact[] = [
        { name: 'Елена Петрова', phone: '+79001112233', avatar: '👩‍🦰' },
        { name: 'Дмитрий', phone: '+79002223344', avatar: '👨‍💼' },
        { name: 'Ольга', phone: '+79003334455', avatar: '👩‍🎨' },
        { name: 'Игорь', phone: '+79004445566', avatar: '🧑‍💻' },
      ];
      
      setContacts(simulatedContacts);
      setImportedContacts(true);
      
      toast({
        title: "Контакты загружены!",
        description: `Добавлено ${simulatedContacts.length} контактов`,
      });
    }, 1500);
  };

  const startCall = (chat: Chat) => {
    setIsCallActive(true);
    setCallDuration(0);
    toast({
      title: "Звонок начат",
      description: `Звоним ${chat.name}...`,
    });
  };

  const endCall = () => {
    setIsCallActive(false);
    const minutes = Math.floor(callDuration / 60);
    const seconds = callDuration % 60;
    toast({
      title: "Звонок завершен",
      description: `Длительность: ${minutes}:${seconds.toString().padStart(2, '0')}`,
    });
    setCallDuration(0);
  };

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

  const formatCallDuration = () => {
    const minutes = Math.floor(callDuration / 60);
    const seconds = callDuration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const renderContent = () => {
    if (activeTab === 'contacts') {
      return (
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border">
            <h2 className="text-xl font-bold mb-4">Контакты</h2>
            <div className="relative">
              <Icon name="Search" size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Поиск контактов..." className="pl-10" />
            </div>
          </div>
          <ScrollArea className="flex-1 p-4">
            {contacts.length === 0 ? (
              <div className="text-center py-12 animate-fade-in">
                <Icon name="Users" size={64} className="mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground mb-4">Контакты загружаются...</p>
              </div>
            ) : (
              <div className="space-y-2">
                {contacts.map((contact, idx) => (
                  <div key={idx} className="p-4 bg-card rounded-xl border border-border hover:bg-muted/50 transition-all cursor-pointer animate-slide-up" style={{ animationDelay: `${idx * 0.1}s` }}>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="text-2xl">{contact.avatar}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-semibold">{contact.name}</h3>
                        <p className="text-sm text-muted-foreground">{contact.phone}</p>
                      </div>
                      <Button size="sm" className="bg-gradient-to-r from-primary to-secondary">
                        <Icon name="MessageSquare" size={16} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      );
    }

    if (activeTab === 'calls') {
      return (
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border">
            <h2 className="text-xl font-bold">Звонки</h2>
          </div>
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-2">
              {mockChats.filter(c => c.phone).map((chat, idx) => (
                <div key={chat.id} className="p-4 bg-card rounded-xl border border-border hover:bg-muted/50 transition-all animate-fade-in" style={{ animationDelay: `${idx * 0.1}s` }}>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="text-2xl">{chat.avatar}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-semibold">{chat.name}</h3>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Icon name="PhoneIncoming" size={14} />
                        <span>Вчера, 15:30</span>
                      </div>
                    </div>
                    <Button onClick={() => startCall(chat)} size="icon" className="bg-gradient-to-r from-primary to-accent">
                      <Icon name="Phone" size={20} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      );
    }

    return (
      <>
        <div className="w-full md:w-96 border-r border-border flex flex-col">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-4 animate-fade-in">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                veas
              </h1>
              <Badge variant="outline" className="gap-1">
                <Icon name="Shield" size={12} />
                E2E
              </Badge>
            </div>
            <div className="relative animate-slide-up" style={{ animationDelay: '0.1s' }}>
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
            {filteredChats.map((chat, idx) => (
              <div
                key={chat.id}
                onClick={() => setActiveChat(chat)}
                className={`p-4 cursor-pointer transition-all hover:bg-muted/50 border-b border-border hover:scale-[1.02] ${
                  activeChat?.id === chat.id ? 'bg-muted' : ''
                }`}
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <Avatar className="h-12 w-12 transition-transform hover:scale-110">
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
                        <Badge className="ml-2 bg-primary animate-pulse">{chat.unread}</Badge>
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
              <div className="p-4 border-b border-border flex items-center justify-between animate-fade-in">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="text-xl">{activeChat.avatar}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="font-semibold">{activeChat.name}</h2>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      {activeChat.online ? (
                        <><div className="h-2 w-2 bg-accent rounded-full animate-pulse" /> онлайн</>
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
                  {activeChat.phone && (
                    <Button variant="ghost" size="icon" onClick={() => startCall(activeChat)} className="hover:scale-110 transition-transform">
                      <Icon name="Phone" size={20} />
                    </Button>
                  )}
                </div>
              </div>

              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4 max-w-3xl mx-auto">
                  {messages.map((msg, idx) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sent ? 'justify-end' : 'justify-start'} animate-slide-up`}
                      style={{ animationDelay: `${idx * 0.1}s` }}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2 transition-all hover:scale-105 ${
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

              <div className="p-4 border-t border-border animate-slide-up">
                <div className="flex items-center gap-2 max-w-3xl mx-auto">
                  <Button variant="ghost" size="icon" className="hover:scale-110 transition-transform">
                    <Icon name="Paperclip" size={20} />
                  </Button>
                  <Input
                    placeholder="Сообщение защищено E2E шифрованием..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    className="flex-1"
                  />
                  <Button onClick={sendMessage} size="icon" className="bg-gradient-to-r from-primary to-secondary hover:scale-110 transition-transform">
                    <Icon name="Send" size={20} />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground animate-fade-in">
              <div className="text-center">
                <Icon name="MessageSquare" size={64} className="mx-auto mb-4 opacity-50" />
                <p>Выберите чат для начала общения</p>
              </div>
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <Dialog open={showContactsPermission} onOpenChange={setShowContactsPermission}>
        <DialogContent className="animate-scale-in">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon name="Contacts" size={24} className="text-primary" />
              Доступ к контактам
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground mb-4">
              veas запрашивает доступ к вашим контактам для автоматического добавления друзей в мессенджер
            </p>
            <div className="flex gap-2">
              <Button onClick={requestContactsAccess} className="flex-1 bg-gradient-to-r from-primary to-secondary">
                Разрешить доступ
              </Button>
              <Button onClick={() => setShowContactsPermission(false)} variant="outline" className="flex-1">
                Отмена
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isCallActive} onOpenChange={(open) => !open && endCall()}>
        <DialogContent className="animate-scale-in">
          <div className="py-8 text-center">
            <Avatar className="h-24 w-24 mx-auto mb-4 animate-pulse">
              <AvatarFallback className="text-4xl">{activeChat?.avatar}</AvatarFallback>
            </Avatar>
            <h2 className="text-2xl font-bold mb-2">{activeChat?.name}</h2>
            <Badge className="mb-4 bg-accent">
              <Icon name="Phone" size={14} className="mr-1" />
              {formatCallDuration()}
            </Badge>
            <div className="flex items-center justify-center gap-4 mt-8">
              <Button variant="ghost" size="icon" className="h-14 w-14 hover:scale-110 transition-transform">
                <Icon name="Mic" size={24} />
              </Button>
              <Button onClick={endCall} size="icon" className="h-16 w-16 bg-destructive hover:bg-destructive/90 rounded-full hover:scale-110 transition-transform">
                <Icon name="PhoneOff" size={28} />
              </Button>
              <Button variant="ghost" size="icon" className="h-14 w-14 hover:scale-110 transition-transform">
                <Icon name="Volume2" size={24} />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex-1 flex overflow-hidden">
        {renderContent()}
      </div>

      <nav className="border-t border-border bg-card">
        <div className="flex justify-around items-center h-16">
          <Button
            variant={activeTab === 'chats' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('chats')}
            className="flex-col h-14 gap-1 hover:scale-110 transition-transform"
          >
            <Icon name="MessageSquare" size={20} />
            <span className="text-xs">Чаты</span>
          </Button>
          <Button
            variant={activeTab === 'calls' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('calls')}
            className="flex-col h-14 gap-1 hover:scale-110 transition-transform"
          >
            <Icon name="Phone" size={20} />
            <span className="text-xs">Звонки</span>
          </Button>
          <Button
            variant={activeTab === 'contacts' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('contacts')}
            className="flex-col h-14 gap-1 hover:scale-110 transition-transform relative"
          >
            <Icon name="Users" size={20} />
            <span className="text-xs">Контакты</span>
            {contacts.length > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs animate-pulse">
                {contacts.length}
              </Badge>
            )}
          </Button>
          <Button
            variant={activeTab === 'profile' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('profile')}
            className="flex-col h-14 gap-1 hover:scale-110 transition-transform"
          >
            <Icon name="User" size={20} />
            <span className="text-xs">Профиль</span>
          </Button>
          <Button
            variant={activeTab === 'settings' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('settings')}
            className="flex-col h-14 gap-1 hover:scale-110 transition-transform"
          >
            <Icon name="Settings" size={20} />
            <span className="text-xs">Настройки</span>
          </Button>
        </div>
      </nav>
    </div>
  );
}
