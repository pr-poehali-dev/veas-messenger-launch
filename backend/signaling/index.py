import json
import os
from typing import Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Business: WebRTC signaling server for peer-to-peer calls
    Args: event with httpMethod, body, headers
    Returns: HTTP response with signaling data
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
                
                if action == 'offer':
                    target_user_id = body_data.get('target_user_id')
                    offer = body_data.get('offer')
                    
                    cur.execute(
                        """CREATE TABLE IF NOT EXISTS call_signals (
                            id SERIAL PRIMARY KEY,
                            from_user_id INTEGER NOT NULL,
                            to_user_id INTEGER NOT NULL,
                            signal_type VARCHAR(20) NOT NULL,
                            signal_data TEXT NOT NULL,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            is_read BOOLEAN DEFAULT false
                        )"""
                    )
                    
                    cur.execute(
                        """INSERT INTO call_signals (from_user_id, to_user_id, signal_type, signal_data)
                        VALUES (%s, %s, %s, %s)""",
                        (user_id, target_user_id, 'offer', json.dumps(offer))
                    )
                    conn.commit()
                    
                    return {
                        'statusCode': 200,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({'success': True, 'message': 'Offer sent'}),
                        'isBase64Encoded': False
                    }
                
                elif action == 'answer':
                    target_user_id = body_data.get('target_user_id')
                    answer = body_data.get('answer')
                    
                    cur.execute(
                        """INSERT INTO call_signals (from_user_id, to_user_id, signal_type, signal_data)
                        VALUES (%s, %s, %s, %s)""",
                        (user_id, target_user_id, 'answer', json.dumps(answer))
                    )
                    conn.commit()
                    
                    return {
                        'statusCode': 200,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({'success': True, 'message': 'Answer sent'}),
                        'isBase64Encoded': False
                    }
                
                elif action == 'ice_candidate':
                    target_user_id = body_data.get('target_user_id')
                    candidate = body_data.get('candidate')
                    
                    cur.execute(
                        """INSERT INTO call_signals (from_user_id, to_user_id, signal_type, signal_data)
                        VALUES (%s, %s, %s, %s)""",
                        (user_id, target_user_id, 'ice', json.dumps(candidate))
                    )
                    conn.commit()
                    
                    return {
                        'statusCode': 200,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({'success': True, 'message': 'ICE candidate sent'}),
                        'isBase64Encoded': False
                    }
            
            elif method == 'GET':
                cur.execute(
                    """SELECT * FROM call_signals 
                    WHERE to_user_id = %s AND is_read = false
                    ORDER BY created_at ASC""",
                    (user_id,)
                )
                signals = cur.fetchall()
                
                if signals:
                    signal_ids = [s['id'] for s in signals]
                    cur.execute(
                        """UPDATE call_signals SET is_read = true 
                        WHERE id = ANY(%s)""",
                        (signal_ids,)
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
                        'signals': [{
                            'from_user_id': s['from_user_id'],
                            'signal_type': s['signal_type'],
                            'signal_data': json.loads(s['signal_data'])
                        } for s in signals]
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
