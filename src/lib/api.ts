const API_BASE = 'https://functions.poehali.dev';

const AUTH_URL = '3c8cdd77-9aa5-42dc-9fb7-5d598252a04c';
const MESSAGES_URL = '77153e37-44c4-447f-8000-09f09dfc829b';

export const api = {
  auth: {
    sendCode: async (phoneNumber: string) => {
      const response = await fetch(`${API_BASE}/${AUTH_URL}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_code',
          phone_number: phoneNumber
        })
      });
      return response.json();
    },

    verifyCode: async (phoneNumber: string, code: string) => {
      const response = await fetch(`${API_BASE}/${AUTH_URL}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_code',
          phone_number: phoneNumber,
          code: code
        })
      });
      return response.json();
    },

    getUser: async (sessionToken: string) => {
      const response = await fetch(`${API_BASE}/${AUTH_URL}`, {
        method: 'GET',
        headers: { 'X-Session-Token': sessionToken }
      });
      return response.json();
    }
  },

  messages: {
    getChats: async (sessionToken: string) => {
      const response = await fetch(`${API_BASE}/${MESSAGES_URL}`, {
        method: 'GET',
        headers: { 'X-Session-Token': sessionToken }
      });
      return response.json();
    },

    getChatMessages: async (sessionToken: string, chatId: number) => {
      const response = await fetch(`${API_BASE}/${MESSAGES_URL}?chat_id=${chatId}`, {
        method: 'GET',
        headers: { 'X-Session-Token': sessionToken }
      });
      return response.json();
    },

    sendMessage: async (sessionToken: string, chatId: number, content: string) => {
      const response = await fetch(`${API_BASE}/${MESSAGES_URL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Token': sessionToken
        },
        body: JSON.stringify({
          action: 'send',
          chat_id: chatId,
          content: content,
          type: 'text'
        })
      });
      return response.json();
    },

    createChat: async (sessionToken: string, participantPhone: string) => {
      const response = await fetch(`${API_BASE}/${MESSAGES_URL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Token': sessionToken
        },
        body: JSON.stringify({
          action: 'create_chat',
          participant_phone: participantPhone
        })
      });
      return response.json();
    }
  }
};

export const getSessionToken = () => localStorage.getItem('session_token');
export const setSessionToken = (token: string) => localStorage.setItem('session_token', token);
export const clearSessionToken = () => localStorage.removeItem('session_token');
export const getCurrentUser = () => {
  const userStr = localStorage.getItem('current_user');
  return userStr ? JSON.parse(userStr) : null;
};
export const setCurrentUser = (user: any) => localStorage.setItem('current_user', JSON.stringify(user));
export const clearCurrentUser = () => localStorage.removeItem('current_user');
