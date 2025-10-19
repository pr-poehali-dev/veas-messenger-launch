import { useState, useEffect, useRef } from 'react';
import Icon from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { api, getSessionToken, setSessionToken, clearSessionToken, getCurrentUser, setCurrentUser, clearCurrentUser } from '@/lib/api';
import { WebRTCCall } from '@/lib/webrtc';

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

interface UserProfile {
  name: string;
  phone: string;
  bio: string;
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
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [newMessage, setNewMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'chats' | 'calls' | 'contacts' | 'profile' | 'settings'>('chats');
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [importedContacts, setImportedContacts] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [showContactsPermission, setShowContactsPermission] = useState(false);
  const [showPhoneInput, setShowPhoneInput] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showVerification, setShowVerification] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userChats, setUserChats] = useState<Chat[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: '',
    phone: '',
    bio: '',
    avatar: '👤'
  });
  const [editingProfile, setEditingProfile] = useState(false);
  const [settings, setSettings] = useState({
    notifications: true,
    soundEnabled: true,
    readReceipts: true,
    onlineStatus: true,
    darkMode: true,
    autoDownload: false,
  });
  const [isMuted, setIsMuted] = useState(false);
  const [currentCall, setCurrentCall] = useState<WebRTCCall | null>(null);
  const [callingUserId, setCallingUserId] = useState<number | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const sessionToken = getSessionToken();
      const savedUser = getCurrentUser();
      
      if (sessionToken && savedUser) {
        setIsAuthenticated(true);
        setShowPhoneInput(false);
        setUserProfile({
          name: savedUser.username,
          phone: savedUser.phone_number,
          bio: savedUser.status || '',
          avatar: savedUser.avatar_url || '👤'
        });
        loadUserChats();
      }
    };
    checkAuth();
  }, []);

  const loadUserChats = async () => {
    const sessionToken = getSessionToken();
    if (!sessionToken) return;

    const result = await api.messages.getChats(sessionToken);
    if (result.success && result.chats) {
      const formattedChats: Chat[] = result.chats.map((chat: any) => ({
        id: chat.id,
        name: chat.name || 'Чат',
        lastMessage: chat.last_message || '',
        time: chat.last_message_time ? new Date(chat.last_message_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '',
        unread: chat.unread_count || 0,
        online: false,
        avatar: chat.avatar_url || '👤',
        encrypted: true
      }));
      setUserChats(formattedChats);
    }
  };

  useEffect(() => {
    if (isAuthenticated && !importedContacts) {
      const timer = setTimeout(() => {
        setShowContactsPermission(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [importedContacts, isAuthenticated]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isCallActive) {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isCallActive]);

  const sendVerificationCode = async () => {
    if (phoneNumber.length < 10) {
      toast({
        title: "Ошибка",
        description: "Введите корректный номер телефона",
        variant: "destructive"
      });
      return;
    }
    
    const result = await api.auth.sendCode(phoneNumber);
    if (result.success) {
      setShowVerification(true);
      toast({
        title: "Код отправлен",
        description: result.message,
      });
    }
  };

  const verifyCode = async () => {
    const result = await api.auth.verifyCode(phoneNumber, verificationCode);
    if (result.success) {
      setSessionToken(result.session_token);
      setCurrentUser(result.user);
      setIsAuthenticated(true);
      setShowPhoneInput(false);
      setUserProfile({
        ...userProfile,
        phone: result.user.phone_number,
        name: result.user.username,
        bio: result.user.status,
        avatar: result.user.avatar_url || '👤'
      });
      loadUserChats();
      toast({
        title: "Добро пожаловать!",
        description: "Вы успешно вошли в veas",
      });
    } else {
      toast({
        title: "Неверный код",
        description: result.error || "Попробуйте еще раз",
        variant: "destructive"
      });
    }
  };

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

  const startCall = async (chat: Chat) => {
    const sessionToken = getSessionToken();
    if (!sessionToken) return;

    setActiveChat(chat);
    setIsCallActive(true);
    setCallDuration(0);
    setCallingUserId(chat.id);

    const call = new WebRTCCall(sessionToken, chat.id);
    setCurrentCall(call);

    try {
      await call.startCall(
        (remoteStream) => {
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = remoteStream;
            remoteAudioRef.current.play();
          }
        },
        () => {
          setIsCallActive(false);
          setCurrentCall(null);
        }
      );

      toast({
        title: "Звонок начат",
        description: `Звоним ${chat.name}...`,
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось начать звонок. Проверьте доступ к микрофону.",
        variant: "destructive"
      });
      setIsCallActive(false);
    }
  };

  const endCall = () => {
    if (currentCall) {
      currentCall.endCall();
    }
    setIsCallActive(false);
    setCurrentCall(null);
    setIsMuted(false);
    const minutes = Math.floor(callDuration / 60);
    const seconds = callDuration % 60;
    toast({
      title: "Звонок завершен",
      description: `Длительность: ${minutes}:${seconds.toString().padStart(2, '0')}`,
    });
    setCallDuration(0);
  };

  const toggleMute = () => {
    if (currentCall) {
      const muted = currentCall.toggleMute();
      setIsMuted(muted);
    }
  };

  const displayChats = userChats.length > 0 ? userChats : mockChats;
  const filteredChats = displayChats.filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sendMessage = async () => {
    if (newMessage.trim() && activeChat) {
      const sessionToken = getSessionToken();
      if (!sessionToken) return;

      const result = await api.messages.sendMessage(sessionToken, activeChat.id, newMessage);
      if (result.success) {
        const newMsg: Message = {
          id: result.message.id,
          text: result.message.content,
          time: new Date(result.message.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
          sent: true,
          encrypted: true,
        };
        setMessages([...messages, newMsg]);
        setNewMessage('');
      }
    }
  };

  const formatCallDuration = () => {
    const minutes = Math.floor(callDuration / 60);
    const seconds = callDuration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const saveProfile = () => {
    setEditingProfile(false);
    toast({
      title: "Профиль обновлен",
      description: "Ваши данные успешно сохранены",
    });
  };

  const handleLogout = () => {
    clearSessionToken();
    clearCurrentUser();
    setIsAuthenticated(false);
    setShowPhoneInput(true);
    setUserChats([]);
    toast({
      title: "Вы вышли",
      description: "До скорой встречи!",
    });
  };

  if (showPhoneInput) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/10 p-4">
        <div className="w-full max-w-md animate-scale-in">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent mb-2">
              veas
            </h1>
            <p className="text-muted-foreground">Защищенный мессенджер</p>
            <Badge className="mt-2">
              <Icon name="Shield" size={12} className="mr-1" />
              E2E шифрование
            </Badge>
          </div>
          
          <div className="bg-card p-6 rounded-2xl border border-border shadow-lg">
            {!showVerification ? (
              <>
                <h2 className="text-xl font-semibold mb-4">Вход в аккаунт</h2>
                <Label htmlFor="phone" className="text-sm mb-2 block">Номер телефона</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+7 (___) ___-__-__"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="mb-4"
                />
                <Button onClick={sendVerificationCode} className="w-full bg-gradient-to-r from-primary to-secondary">
                  Получить код
                </Button>
              </>
            ) : (
              <>
                <h2 className="text-xl font-semibold mb-2">Подтверждение</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Код отправлен на {phoneNumber}
                </p>
                <Label htmlFor="code" className="text-sm mb-2 block">Код подтверждения</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="****"
                  maxLength={4}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="mb-4 text-center text-2xl tracking-widest"
                />
                <Button onClick={verifyCode} className="w-full bg-gradient-to-r from-primary to-secondary mb-2">
                  Подтвердить
                </Button>
                <Button onClick={() => setShowVerification(false)} variant="ghost" className="w-full">
                  Изменить номер
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  const renderProfile = () => (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-xl font-bold">Профиль</h2>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6 max-w-2xl mx-auto">
          <div className="text-center animate-fade-in">
            <Avatar className="h-24 w-24 mx-auto mb-4">
              <AvatarFallback className="text-4xl">{userProfile.avatar}</AvatarFallback>
            </Avatar>
            {editingProfile ? (
              <Input
                value={userProfile.avatar}
                onChange={(e) => setUserProfile({...userProfile, avatar: e.target.value})}
                className="w-20 mx-auto text-center mb-2"
                placeholder="😀"
              />
            ) : null}
            <Button variant="outline" size="sm" onClick={() => setEditingProfile(!editingProfile)}>
              <Icon name={editingProfile ? "Check" : "Pencil"} size={16} className="mr-1" />
              {editingProfile ? "Сохранить" : "Редактировать"}
            </Button>
          </div>

          <div className="space-y-4 animate-slide-up">
            <div>
              <Label htmlFor="profile-name">Имя</Label>
              <Input
                id="profile-name"
                value={userProfile.name}
                onChange={(e) => setUserProfile({...userProfile, name: e.target.value})}
                disabled={!editingProfile}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="profile-phone">Номер телефона</Label>
              <Input
                id="profile-phone"
                value={userProfile.phone}
                disabled
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="profile-bio">О себе</Label>
              <Input
                id="profile-bio"
                value={userProfile.bio}
                onChange={(e) => setUserProfile({...userProfile, bio: e.target.value})}
                disabled={!editingProfile}
                placeholder="Расскажите о себе..."
                className="mt-1"
              />
            </div>

            {editingProfile && (
              <Button onClick={saveProfile} className="w-full bg-gradient-to-r from-primary to-secondary">
                Сохранить изменения
              </Button>
            )}
          </div>

          <Separator />

          <div className="space-y-3">
            <h3 className="font-semibold">Статистика</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted rounded-xl">
                <div className="text-2xl font-bold text-primary">{mockChats.length}</div>
                <div className="text-xs text-muted-foreground">Чатов</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-xl">
                <div className="text-2xl font-bold text-secondary">{contacts.length}</div>
                <div className="text-xs text-muted-foreground">Контактов</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-xl">
                <div className="text-2xl font-bold text-accent">12</div>
                <div className="text-xs text-muted-foreground">Звонков</div>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );

  const renderSettings = () => (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-xl font-bold">Настройки</h2>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6 max-w-2xl mx-auto">
          <div className="space-y-4 animate-fade-in">
            <h3 className="font-semibold flex items-center gap-2">
              <Icon name="Bell" size={18} />
              Уведомления
            </h3>
            <div className="space-y-4 pl-7">
              <div className="flex items-center justify-between">
                <Label htmlFor="notifications">Включить уведомления</Label>
                <Switch
                  id="notifications"
                  checked={settings.notifications}
                  onCheckedChange={(checked) => setSettings({...settings, notifications: checked})}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="sound">Звуковые уведомления</Label>
                <Switch
                  id="sound"
                  checked={settings.soundEnabled}
                  onCheckedChange={(checked) => setSettings({...settings, soundEnabled: checked})}
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <h3 className="font-semibold flex items-center gap-2">
              <Icon name="Lock" size={18} />
              Приватность
            </h3>
            <div className="space-y-4 pl-7">
              <div className="flex items-center justify-between">
                <Label htmlFor="read-receipts">Отчеты о прочтении</Label>
                <Switch
                  id="read-receipts"
                  checked={settings.readReceipts}
                  onCheckedChange={(checked) => setSettings({...settings, readReceipts: checked})}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="online-status">Показывать статус онлайн</Label>
                <Switch
                  id="online-status"
                  checked={settings.onlineStatus}
                  onCheckedChange={(checked) => setSettings({...settings, onlineStatus: checked})}
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <h3 className="font-semibold flex items-center gap-2">
              <Icon name="Palette" size={18} />
              Внешний вид
            </h3>
            <div className="space-y-4 pl-7">
              <div className="flex items-center justify-between">
                <Label htmlFor="dark-mode">Темная тема</Label>
                <Switch
                  id="dark-mode"
                  checked={settings.darkMode}
                  onCheckedChange={(checked) => setSettings({...settings, darkMode: checked})}
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <h3 className="font-semibold flex items-center gap-2">
              <Icon name="Download" size={18} />
              Данные и хранилище
            </h3>
            <div className="space-y-4 pl-7">
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-download">Автозагрузка медиа</Label>
                <Switch
                  id="auto-download"
                  checked={settings.autoDownload}
                  onCheckedChange={(checked) => setSettings({...settings, autoDownload: checked})}
                />
              </div>
              <Button variant="outline" className="w-full">
                <Icon name="Trash2" size={16} className="mr-2" />
                Очистить кэш (2.3 ГБ)
              </Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-3 animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <Button variant="outline" className="w-full justify-start">
              <Icon name="HelpCircle" size={18} className="mr-2" />
              Помощь
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Icon name="Info" size={18} className="mr-2" />
              О приложении
            </Button>
            <Button variant="destructive" className="w-full justify-start" onClick={handleLogout}>
              <Icon name="LogOut" size={18} className="mr-2" />
              Выйти из аккаунта
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );

  const renderContent = () => {
    if (activeTab === 'profile') return renderProfile();
    if (activeTab === 'settings') return renderSettings();
    
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
                  <div key={idx} className="p-4 bg-card rounded-xl border border-border hover:bg-muted/50 transition-all cursor-pointer animate-slide-up hover:scale-[1.02]" style={{ animationDelay: `${idx * 0.05}s` }}>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="text-2xl">{contact.avatar}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{contact.name}</h3>
                        <p className="text-sm text-muted-foreground truncate">{contact.phone}</p>
                      </div>
                      <Button size="sm" className="bg-gradient-to-r from-primary to-secondary shrink-0">
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
                <div key={chat.id} className="p-4 bg-card rounded-xl border border-border hover:bg-muted/50 transition-all animate-fade-in hover:scale-[1.02]" style={{ animationDelay: `${idx * 0.05}s` }}>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="text-2xl">{chat.avatar}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{chat.name}</h3>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Icon name="PhoneIncoming" size={14} />
                        <span>Вчера, 15:30</span>
                      </div>
                    </div>
                    <Button onClick={() => startCall(chat)} size="icon" className="bg-gradient-to-r from-primary to-accent shrink-0">
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
                className={`p-3 md:p-4 cursor-pointer transition-all hover:bg-muted/50 border-b border-border active:scale-95 ${
                  activeChat?.id === chat.id ? 'bg-muted' : ''
                }`}
                style={{ animationDelay: `${idx * 0.03}s` }}
              >
                <div className="flex items-start gap-3">
                  <div className="relative shrink-0">
                    <Avatar className="h-11 w-11 md:h-12 md:w-12">
                      <AvatarFallback className="text-xl md:text-2xl">{chat.avatar}</AvatarFallback>
                    </Avatar>
                    {chat.online && (
                      <div className="absolute bottom-0 right-0 h-3 w-3 bg-accent rounded-full border-2 border-background animate-pulse" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold truncate text-sm md:text-base">{chat.name}</h3>
                      <span className="text-xs text-muted-foreground shrink-0">{chat.time}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs md:text-sm text-muted-foreground truncate flex-1">
                        {chat.encrypted && <Icon name="Lock" size={12} className="inline mr-1" />}
                        {chat.lastMessage}
                      </p>
                      {chat.unread > 0 && (
                        <Badge className="ml-2 bg-primary animate-pulse shrink-0 h-5 min-w-5 p-0 flex items-center justify-center text-xs">{chat.unread}</Badge>
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
              <div className="p-3 md:p-4 border-b border-border flex items-center justify-between animate-fade-in">
                <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                  <Avatar className="h-9 w-9 md:h-10 md:w-10 shrink-0">
                    <AvatarFallback className="text-lg md:text-xl">{activeChat.avatar}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold text-sm md:text-base truncate">{activeChat.name}</h2>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      {activeChat.online ? (
                        <><div className="h-2 w-2 bg-accent rounded-full animate-pulse" /> онлайн</>
                      ) : (
                        'не в сети'
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 md:gap-2 shrink-0">
                  <Badge variant="outline" className="gap-1 text-xs hidden md:flex">
                    <Icon name="ShieldCheck" size={14} />
                    Зашифровано
                  </Badge>
                  {activeChat.phone && (
                    <Button variant="ghost" size="icon" onClick={() => startCall(activeChat)} className="h-9 w-9 md:h-10 md:w-10">
                      <Icon name="Phone" size={18} />
                    </Button>
                  )}
                </div>
              </div>

              <ScrollArea className="flex-1 p-3 md:p-4">
                <div className="space-y-3 md:space-y-4 max-w-3xl mx-auto">
                  {messages.map((msg, idx) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sent ? 'justify-end' : 'justify-start'} animate-slide-up`}
                      style={{ animationDelay: `${idx * 0.05}s` }}
                    >
                      <div
                        className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-3 py-2 md:px-4 md:py-2 ${
                          msg.sent
                            ? 'bg-gradient-to-r from-primary to-secondary text-primary-foreground'
                            : 'bg-muted text-foreground'
                        }`}
                      >
                        <p className="text-sm break-words">{msg.text}</p>
                        <div className="flex items-center gap-1 justify-end mt-1">
                          <span className="text-xs opacity-70">{msg.time}</span>
                          {msg.encrypted && <Icon name="Lock" size={10} className="opacity-70" />}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="p-3 md:p-4 border-t border-border animate-slide-up safe-bottom">
                <div className="flex items-center gap-2 max-w-3xl mx-auto">
                  <Button variant="ghost" size="icon" className="h-9 w-9 md:h-10 md:w-10 shrink-0">
                    <Icon name="Paperclip" size={18} />
                  </Button>
                  <Input
                    placeholder="Сообщение..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    className="flex-1 text-sm md:text-base"
                  />
                  <Button onClick={sendMessage} size="icon" className="bg-gradient-to-r from-primary to-secondary h-9 w-9 md:h-10 md:w-10 shrink-0">
                    <Icon name="Send" size={18} />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground animate-fade-in p-4">
              <div className="text-center">
                <Icon name="MessageSquare" size={48} className="mx-auto mb-4 opacity-50 md:w-16 md:h-16" />
                <p className="text-sm md:text-base">Выберите чат для начала общения</p>
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
        <DialogContent className="animate-scale-in max-w-[90%] md:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon name="Contacts" size={24} className="text-primary" />
              Доступ к контактам
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground mb-4 text-sm md:text-base">
              veas запрашивает доступ к вашим контактам для автоматического добавления друзей в мессенджер
            </p>
            <div className="flex flex-col md:flex-row gap-2">
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
        <DialogContent className="animate-scale-in max-w-[90%] md:max-w-md">
          <div className="py-6 md:py-8 text-center">
            <Avatar className="h-20 w-20 md:h-24 md:w-24 mx-auto mb-4 animate-pulse">
              <AvatarFallback className="text-3xl md:text-4xl">{activeChat?.avatar}</AvatarFallback>
            </Avatar>
            <h2 className="text-xl md:text-2xl font-bold mb-2">{activeChat?.name}</h2>
            <Badge className="mb-4 bg-accent">
              <Icon name="Phone" size={14} className="mr-1" />
              {formatCallDuration()}
            </Badge>
            <div className="flex items-center justify-center gap-3 md:gap-4 mt-6 md:mt-8">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-12 w-12 md:h-14 md:w-14"
                onClick={toggleMute}
              >
                <Icon name={isMuted ? "MicOff" : "Mic"} size={20} />
              </Button>
              <Button onClick={endCall} size="icon" className="h-14 w-14 md:h-16 md:w-16 bg-destructive hover:bg-destructive/90 rounded-full">
                <Icon name="PhoneOff" size={24} />
              </Button>
              <Button variant="ghost" size="icon" className="h-12 w-12 md:h-14 md:w-14">
                <Icon name="Volume2" size={20} />
              </Button>
            </div>
            <audio ref={remoteAudioRef} autoPlay />
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex-1 flex overflow-hidden">
        {renderContent()}
      </div>

      <nav className="border-t border-border bg-card safe-bottom">
        <div className="flex justify-around items-center h-14 md:h-16 px-2">
          <Button
            variant={activeTab === 'chats' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('chats')}
            className="flex-col h-12 md:h-14 gap-0.5 md:gap-1 px-2 md:px-4"
          >
            <Icon name="MessageSquare" size={18} />
            <span className="text-[10px] md:text-xs">Чаты</span>
          </Button>
          <Button
            variant={activeTab === 'calls' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('calls')}
            className="flex-col h-12 md:h-14 gap-0.5 md:gap-1 px-2 md:px-4"
          >
            <Icon name="Phone" size={18} />
            <span className="text-[10px] md:text-xs">Звонки</span>
          </Button>
          <Button
            variant={activeTab === 'contacts' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('contacts')}
            className="flex-col h-12 md:h-14 gap-0.5 md:gap-1 px-2 md:px-4 relative"
          >
            <Icon name="Users" size={18} />
            <span className="text-[10px] md:text-xs">Контакты</span>
            {contacts.length > 0 && (
              <Badge className="absolute -top-0.5 -right-0.5 h-4 w-4 p-0 flex items-center justify-center text-[9px] animate-pulse">
                {contacts.length}
              </Badge>
            )}
          </Button>
          <Button
            variant={activeTab === 'profile' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('profile')}
            className="flex-col h-12 md:h-14 gap-0.5 md:gap-1 px-2 md:px-4"
          >
            <Icon name="User" size={18} />
            <span className="text-[10px] md:text-xs">Профиль</span>
          </Button>
          <Button
            variant={activeTab === 'settings' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('settings')}
            className="flex-col h-12 md:h-14 gap-0.5 md:gap-1 px-2 md:px-4"
          >
            <Icon name="Settings" size={18} />
            <span className="text-[10px] md:text-xs">Настройки</span>
          </Button>
        </div>
      </nav>
    </div>
  );
}