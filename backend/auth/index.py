import json
import os
import random
import string
from datetime import datetime, timedelta
from typing import Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Business: User authentication - send verification code and login
    Args: event with httpMethod, body, queryStringParameters
    Returns: HTTP response with session token or verification status
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
    
    db_url = os.environ.get('DATABASE_URL')
    conn = psycopg2.connect(db_url)
    
    try:
        if method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            action = body_data.get('action')
            
            if action == 'send_code':
                phone_number = body_data.get('phone_number')
                
                code = ''.join(random.choices(string.digits, k=4))
                expires_at = datetime.now() + timedelta(minutes=5)
                
                with conn.cursor() as cur:
                    cur.execute(
                        "INSERT INTO verification_codes (phone_number, code, expires_at) VALUES (%s, %s, %s)",
                        (phone_number, code, expires_at)
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
                        'message': f'Код: {code}'
                    }),
                    'isBase64Encoded': False
                }
            
            elif action == 'verify_code':
                phone_number = body_data.get('phone_number')
                code = body_data.get('code')
                
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(
                        """SELECT * FROM verification_codes 
                        WHERE phone_number = %s AND code = %s AND expires_at > NOW() AND is_used = false
                        ORDER BY created_at DESC LIMIT 1""",
                        (phone_number, code)
                    )
                    verification = cur.fetchone()
                    
                    if not verification:
                        return {
                            'statusCode': 400,
                            'headers': {
                                'Content-Type': 'application/json',
                                'Access-Control-Allow-Origin': '*'
                            },
                            'body': json.dumps({'success': False, 'error': 'Invalid or expired code'}),
                            'isBase64Encoded': False
                        }
                    
                    cur.execute(
                        "UPDATE verification_codes SET is_used = true WHERE id = %s",
                        (verification['id'],)
                    )
                    
                    cur.execute(
                        "SELECT * FROM users WHERE phone_number = %s",
                        (phone_number,)
                    )
                    user = cur.fetchone()
                    
                    if not user:
                        cur.execute(
                            """INSERT INTO users (phone_number, username) 
                            VALUES (%s, %s) RETURNING id, phone_number, username, avatar_url, status""",
                            (phone_number, f'User_{phone_number[-4:]}')
                        )
                        user = cur.fetchone()
                    
                    session_token = ''.join(random.choices(string.ascii_letters + string.digits, k=64))
                    expires_at = datetime.now() + timedelta(days=30)
                    
                    cur.execute(
                        "INSERT INTO auth_sessions (user_id, session_token, expires_at) VALUES (%s, %s, %s)",
                        (user['id'], session_token, expires_at)
                    )
                    
                    cur.execute(
                        "UPDATE users SET is_online = true, last_seen = NOW() WHERE id = %s",
                        (user['id'],)
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
                        'session_token': session_token,
                        'user': {
                            'id': user['id'],
                            'phone_number': user['phone_number'],
                            'username': user['username'],
                            'avatar_url': user['avatar_url'],
                            'status': user['status']
                        }
                    }),
                    'isBase64Encoded': False
                }
        
        elif method == 'GET':
            headers = event.get('headers', {})
            session_token = headers.get('x-session-token') or headers.get('X-Session-Token')
            
            if not session_token:
                return {
                    'statusCode': 401,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'success': False, 'error': 'No session token'}),
                    'isBase64Encoded': False
                }
            
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """SELECT u.* FROM users u
                    JOIN auth_sessions s ON u.id = s.user_id
                    WHERE s.session_token = %s AND s.expires_at > NOW()""",
                    (session_token,)
                )
                user = cur.fetchone()
                
                if not user:
                    return {
                        'statusCode': 401,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({'success': False, 'error': 'Invalid session'}),
                        'isBase64Encoded': False
                    }
                
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({
                        'success': True,
                        'user': {
                            'id': user['id'],
                            'phone_number': user['phone_number'],
                            'username': user['username'],
                            'avatar_url': user['avatar_url'],
                            'status': user['status'],
                            'is_online': user['is_online']
                        }
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