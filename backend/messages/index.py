import json
import os
from typing import Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Business: Send and receive messages in chats
    Args: event with httpMethod, body, headers with X-Session-Token
    Returns: HTTP response with messages or send confirmation
    """
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    headers = event.get('headers', {})
    session_token = headers.get('x-session-token') or headers.get('X-Session-Token')
    
    if not session_token:
        return {
            'statusCode': 401,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Unauthorized'}),
            'isBase64Encoded': False
        }
    
    db_url = os.environ.get('DATABASE_URL')
    conn = psycopg2.connect(db_url)
    
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """SELECT user_id FROM auth_sessions 
                WHERE session_token = %s AND expires_at > NOW()""",
                (session_token,)
            )
            session = cur.fetchone()
            
            if not session:
                return {
                    'statusCode': 401,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'Invalid session'}),
                    'isBase64Encoded': False
                }
            
            user_id = session['user_id']
            
            if method == 'POST':
                body_data = json.loads(event.get('body', '{}'))
                action = body_data.get('action')
                
                if action == 'send':
                    chat_id = body_data.get('chat_id')
                    content = body_data.get('content')
                    message_type = body_data.get('type', 'text')
                    
                    cur.execute(
                        """INSERT INTO messages (chat_id, sender_id, content, type) 
                        VALUES (%s, %s, %s, %s) 
                        RETURNING id, chat_id, sender_id, content, type, created_at""",
                        (chat_id, user_id, content, message_type)
                    )
                    message = cur.fetchone()
                    
                    cur.execute(
                        "UPDATE chats SET updated_at = NOW() WHERE id = %s",
                        (chat_id,)
                    )
                    
                    conn.commit()
                    
                    return {
                        'statusCode': 200,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({
                            'success': True,
                            'message': {
                                'id': message['id'],
                                'chat_id': message['chat_id'],
                                'sender_id': message['sender_id'],
                                'content': message['content'],
                                'type': message['type'],
                                'created_at': message['created_at'].isoformat()
                            }
                        }),
                        'isBase64Encoded': False
                    }
                
                elif action == 'create_chat':
                    participant_phone = body_data.get('participant_phone')
                    
                    cur.execute(
                        "SELECT id FROM users WHERE phone_number = %s",
                        (participant_phone,)
                    )
                    participant = cur.fetchone()
                    
                    if not participant:
                        return {
                            'statusCode': 404,
                            'headers': {
                                'Content-Type': 'application/json',
                                'Access-Control-Allow-Origin': '*'
                            },
                            'body': json.dumps({'error': 'User not found'}),
                            'isBase64Encoded': False
                        }
                    
                    cur.execute(
                        """SELECT c.id FROM chats c
                        JOIN chat_participants cp1 ON c.id = cp1.chat_id
                        JOIN chat_participants cp2 ON c.id = cp2.chat_id
                        WHERE c.type = 'private' 
                        AND cp1.user_id = %s 
                        AND cp2.user_id = %s
                        LIMIT 1""",
                        (user_id, participant['id'])
                    )
                    existing_chat = cur.fetchone()
                    
                    if existing_chat:
                        return {
                            'statusCode': 200,
                            'headers': {
                                'Content-Type': 'application/json',
                                'Access-Control-Allow-Origin': '*'
                            },
                            'body': json.dumps({
                                'success': True,
                                'chat_id': existing_chat['id']
                            }),
                            'isBase64Encoded': False
                        }
                    
                    cur.execute(
                        "INSERT INTO chats (type) VALUES ('private') RETURNING id",
                    )
                    chat = cur.fetchone()
                    
                    cur.execute(
                        "INSERT INTO chat_participants (chat_id, user_id) VALUES (%s, %s), (%s, %s)",
                        (chat['id'], user_id, chat['id'], participant['id'])
                    )
                    
                    conn.commit()
                    
                    return {
                        'statusCode': 200,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({
                            'success': True,
                            'chat_id': chat['id']
                        }),
                        'isBase64Encoded': False
                    }
            
            elif method == 'GET':
                params = event.get('queryStringParameters') or {}
                chat_id = params.get('chat_id')
                
                if chat_id:
                    cur.execute(
                        """SELECT m.*, u.username, u.avatar_url 
                        FROM messages m
                        JOIN users u ON m.sender_id = u.id
                        WHERE m.chat_id = %s
                        ORDER BY m.created_at ASC""",
                        (chat_id,)
                    )
                    messages = cur.fetchall()
                    
                    return {
                        'statusCode': 200,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({
                            'success': True,
                            'messages': [{
                                'id': msg['id'],
                                'chat_id': msg['chat_id'],
                                'sender_id': msg['sender_id'],
                                'content': msg['content'],
                                'type': msg['type'],
                                'is_read': msg['is_read'],
                                'created_at': msg['created_at'].isoformat(),
                                'sender': {
                                    'username': msg['username'],
                                    'avatar_url': msg['avatar_url']
                                }
                            } for msg in messages]
                        }),
                        'isBase64Encoded': False
                    }
                else:
                    cur.execute(
                        """SELECT DISTINCT c.*, 
                        (SELECT COUNT(*) FROM messages WHERE chat_id = c.id AND is_read = false AND sender_id != %s) as unread_count,
                        (SELECT content FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
                        (SELECT created_at FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_time
                        FROM chats c
                        JOIN chat_participants cp ON c.id = cp.chat_id
                        WHERE cp.user_id = %s
                        ORDER BY c.updated_at DESC""",
                        (user_id, user_id)
                    )
                    chats = cur.fetchall()
                    
                    return {
                        'statusCode': 200,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({
                            'success': True,
                            'chats': [{
                                'id': chat['id'],
                                'type': chat['type'],
                                'name': chat['name'],
                                'avatar_url': chat['avatar_url'],
                                'unread_count': chat['unread_count'],
                                'last_message': chat['last_message'],
                                'last_message_time': chat['last_message_time'].isoformat() if chat['last_message_time'] else None
                            } for chat in chats]
                        }),
                        'isBase64Encoded': False
                    }
    
    finally:
        conn.close()
    
    return {
        'statusCode': 405,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({'error': 'Method not allowed'}),
        'isBase64Encoded': False
    }
