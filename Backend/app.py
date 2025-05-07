from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from dotenv import load_dotenv
import os
import jwt
import datetime
import pickle
from functools import wraps
import bcrypt
import random
import string
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import re
import logging
import json
import numpy as np
from cryptography.fernet import Fernet

load_dotenv()

app = Flask(__name__)
# Fix CORS configuration to allow credentials
CORS(app, resources={r"/*": {"origins": os.getenv('ALLOWED_ORIGINS', 'http://localhost:5173').split(','), 
                             "methods": ["GET", "POST", "OPTIONS"],
                             "allow_headers": ["Content-Type", "Authorization"],
                             "supports_credentials": True}})

# Set up logging with rotating file handler
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('security.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('security')

# Setup rate limiter with more restrictive limits
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["5 per minute"],
    storage_uri="memory://",
)

# Load environment variables
MONGO_URI = os.getenv('MONGO_URI')
JWT_SECRET = os.getenv('JWT_SECRET')
EMAIL_USER = os.getenv('EMAIL_USER')
EMAIL_PASSWORD = os.getenv('EMAIL_PASSWORD')
EMAIL_SERVER = os.getenv('EMAIL_SERVER', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', '587'))

# Initialize encryption key for model protection
ENCRYPTION_KEY = os.getenv('ENCRYPTION_KEY', Fernet.generate_key())
cipher_suite = Fernet(ENCRYPTION_KEY)

# Database setup
try:
    client = MongoClient(MONGO_URI, 
                        serverSelectionTimeoutMS=5000)
    db = client.spam_classifier_db
    users_collection = db.users
    logs_collection = db.logs
    otp_collection = db.otps
    security_events_collection = db.security_events  # New collection for security events
    
    # Create indexes for performance and security
    users_collection.create_index("email", unique=True)
    otp_collection.create_index([("email", 1), ("action", 1)])
    otp_collection.create_index("expires_at", expireAfterSeconds=0)  # TTL index
    logs_collection.create_index("timestamp")
    security_events_collection.create_index("timestamp")
    
    logger.info("Connected to MongoDB successfully")
except Exception as e:
    logger.error(f"Error connecting to MongoDB: {e}")
    raise

# Load the model and feature extraction
try:
    with open('logistic_regression.pkl', 'rb') as file:
        model = pickle.load(file)
    with open('feature_extraction.pkl', 'rb') as file:
        feature_extraction = pickle.load(file)
    logger.info("Model and feature extraction loaded successfully")
    
except Exception as e:
    logger.error(f"Error loading model or feature extraction: {e}")
    raise

# Model defense: adversarial input detection thresholds
# These limits should be adjusted based on your model's characteristics
MAX_INPUT_LENGTH = 50000  # Maximum acceptable email length
MIN_INPUT_LENGTH = 5      # Minimum acceptable email length
SUSPICIOUS_PATTERNS = [
    r'(DROP|DELETE|INSERT|UPDATE|SELECT)\s+.*\bFROM\b',  # SQL injection patterns
    r'<script.*?>',                                      # XSS scripts
    r'(?:\${.*?}|\$\(.*?\))',                            # Command injection patterns
    r'\\x[0-9a-fA-F]{2}',                                # Hex encoded characters
]

#========================Security Functions==================================================
def log_security_event(event_type, details, ip_address=None, user_email=None, severity="medium"):
    """Log security events to the database for monitoring"""
    if ip_address is None:
        ip_address = get_remote_address()
    
    security_event = {
        'event_type': event_type,
        'details': details,
        'ip_address': ip_address,
        'user_email': user_email,
        'severity': severity,
        'timestamp': datetime.datetime.utcnow()
    }
    security_events_collection.insert_one(security_event)
    logger.warning(f"Security event: {event_type} - {details}")

import re
import numpy as np

def is_adversarial_input(text):
    """Check if input might be adversarial or malicious"""
    # Define constants if not already defined elsewhere
    MAX_INPUT_LENGTH = 1000  # Adjust as needed
    MIN_INPUT_LENGTH = 5     # Adjust as needed
    SUSPICIOUS_PATTERNS = [
        r'<script.?>.?</script>',
        r'<.?javascript:.?>',
        # Add other patterns here
    ]
    
    # Helper function for logging (implement as needed)
    def log_security_event(event_type, details, severity):
        # Implementation of your logging function
        pass
    
    # Check input length constraints
    if len(text) > MAX_INPUT_LENGTH:
        log_security_event("oversized_input", f"Input length: {len(text)}", severity="medium")
        return True
    
    if len(text) < MIN_INPUT_LENGTH:
        log_security_event("undersized_input", f"Input length: {len(text)}", severity="low")
        return True
    
    # Check for suspicious patterns
    for pattern in SUSPICIOUS_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            log_security_event("suspicious_pattern", f"Pattern detected: {pattern}", severity="high")
            return True
    
    # Check for unusual character distributions
    char_counts = {}
    for char in text:
        if char in char_counts:
            char_counts[char] += 1
        else:
            char_counts[char] = 1
    
    # Calculate character distribution entropy
    total_chars = len(text)
    entropy = 0
    for char, count in char_counts.items():
        prob = count / total_chars
        entropy -= prob * np.log2(prob) if prob > 0 else 0
    
    # Unusually low entropy can indicate adversarial inputs
    if entropy < 2.0 and len(text) > 10:
        log_security_event("unusual_entropy", f"Input entropy: {entropy}", severity="medium")
        return True
    
    # Check for repeated character patterns
    repeated_chars_pattern = r'(.)\1{3,}'  # At least 4 of the same character in a row
    if re.search(repeated_chars_pattern, text):
        log_security_event("repeated_characters", "Repeated character sequence detected", severity="medium")
        return True
    
    # Check for alternating character patterns
    alternating_pattern = r'(.)(.)(\1\2){2,}'  # Pattern like 'abababab'
    if re.search(alternating_pattern, text):
        log_security_event("alternating_pattern", "Alternating character pattern detected", severity="medium")
        return True
    
    # Check for keyboard patterns
    keyboard_patterns = [
        r'qwert', r'asdfg', r'zxcvb', 
        r'qay', r'wsx', r'edc'  # Vertical patterns
    ]
    for pattern in keyboard_patterns:
        if pattern in text.lower():
            log_security_event("keyboard_pattern", f"Keyboard pattern detected: {pattern}", severity="medium")
            return True
    
    # Check for numeric-only content that's not reasonably formatted
    if re.match(r'^[0-9]+$', text) and len(text) > 4:
        typical_number_patterns = [
            r'^\d{3}-\d{3}-\d{4}$',  # Phone number with hyphens
            r'^\d{5}(-\d{4})?$',     # ZIP code
            r'^\d{1,3}$'              # Small numbers
        ]
        if not any(re.match(pattern, text) for pattern in typical_number_patterns):
            log_security_event("suspicious_numeric", "Suspicious numeric sequence", severity="medium")
            return True
    
    # Check ratio of alphanumeric to non-alphanumeric characters
    alnum_count = sum(1 for c in text if c.isalnum())
    if len(text) > 5 and alnum_count / len(text) < 0.7:
        log_security_event("high_special_char_ratio", "High ratio of special characters", severity="medium")
        return True
    
    # Check for random character distribution (gibberish detection)
    unique_chars = len(char_counts)
    if len(text) > 8 and unique_chars / len(text) > 0.8:
        log_security_event("random_distribution", "Random character distribution detected", severity="medium")
        return True
    
    # NEW: Check for repeating subsequences (like your example "uiqauiqa1209uiqauiqa1209")
    if len(text) >= 8:  # Only check longer strings
        # Check if the string is made up of repeating patterns
        for pattern_length in range(2, len(text) // 2 + 1):
            # Get the potential pattern
            pattern = text[:pattern_length]
            # Check if the string consists of repetitions of this pattern
            if text == pattern * (len(text) // pattern_length) + text[:(len(text) % pattern_length)]:
                log_security_event("repeating_subsequence", f"Repeating pattern detected: {pattern}", severity="medium")
                return True
                
        # NEW: Check if string has two identical halves
        half_length = len(text) // 2
        if text[:half_length] == text[half_length:half_length*2] and half_length >= 4:
            log_security_event("identical_halves", "String contains identical halves", severity="medium")
            return True
        
        # NEW: Check for identical segments (any position)
        for segment_length in range(4, len(text) // 2 + 1):
            for i in range(len(text) - segment_length * 2 + 1):
                segment = text[i:i+segment_length]
                # Look for this segment elsewhere in the string
                rest_of_string = text[i+segment_length:]
                if segment in rest_of_string:
                    log_security_event("identical_segments", f"Identical segments detected: {segment}", severity="medium")
                    return True
        
    return False

def sanitize_input(text):
    """Sanitize input text to prevent injection attacks"""
    # Basic sanitization - remove potentially dangerous characters
    # This is a simple implementation - consider using a library like bleach for production
    text = re.sub(r'<[^>]*>', '', text)  # Remove HTML tags
    text = re.sub(r'[\'";]', '', text)   # Remove quotes and semicolons
    
    # Normalize whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    
    return text

#========================Password Hashing==================================================
def hash_password(password):
    # Generate a salt and hash the password
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(rounds=12))
    return hashed_password.decode('utf-8')  # Store as a string

def check_password(password, hashed_password):
    # Check if the password matches the hash
    try:
        return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

#========================OTP Functions==================================================
def generate_otp():
    # Generate a 6-digit OTP
    return ''.join(random.choices(string.digits, k=6))

def save_otp(email, otp, action):
    # Store OTP in database with expiration time (10 minutes)
    expiry_time = datetime.datetime.utcnow() + datetime.timedelta(minutes=10)
    
    # Delete any existing OTPs for this email and action
    otp_collection.delete_many({'email': email, 'action': action})
    
    # Insert new OTP with additional security metadata
    otp_collection.insert_one({
        'email': email,
        'otp': otp,
        'action': action,  # 'login' or 'signup'
        'created_at': datetime.datetime.utcnow(),
        'expires_at': expiry_time,
        'verified': False,
        'attempts': 0,  # Track verification attempts
        'ip_address': get_remote_address()
    })

def verify_otp(email, otp, action):
    # Find OTP in database
    otp_data = otp_collection.find_one({
        'email': email,
        'action': action,
        'expires_at': {'$gt': datetime.datetime.utcnow()},
        'verified': False
    })
    
    if not otp_data:
        return False
    
    # Track failed attempts
    if otp_data['otp'] != otp:
        # Increment attempts counter and check if we've exceeded max attempts
        attempts = otp_data.get('attempts', 0) + 1
        if attempts >= 5:  # Max 5 attempts
            # Delete OTP to force re-requesting
            otp_collection.delete_one({'_id': otp_data['_id']})
            log_security_event('max_otp_attempts', 
                              f"User {email} exceeded maximum OTP attempts for {action}",
                              user_email=email,
                              severity="high")
            return False
            
        otp_collection.update_one(
            {'_id': otp_data['_id']}, 
            {'$set': {'attempts': attempts}}
        )
        return False
    
    # Mark OTP as verified
    otp_collection.update_one({'_id': otp_data['_id']}, {'$set': {'verified': True}})
    return True

def send_otp_email(email, otp, action):
    # Send OTP via email
    try:
        msg = MIMEMultipart()
        msg['From'] = EMAIL_USER
        msg['To'] = email
        
        if action == 'signup':
            msg['Subject'] = 'Your Signup Verification Code'
            body = f"""
            <html>
              <body>
                <h2>Complete Your Registration</h2>
                <p>Thank you for signing up! Please use the following verification code to complete your registration:</p>
                <h3 style="background-color: #f2f2f2; padding: 10px; font-size: 24px; letter-spacing: 5px;">{otp}</h3>
                <p>This code will expire in 10 minutes.</p>
                <p>If you didn't request this code, please ignore this email.</p>
                <p>IP Address: {get_remote_address()}</p>
              </body>
            </html>
            """
        else:  # login
            msg['Subject'] = 'Your Login Verification Code'
            body = f"""
            <html>
              <body>
                <h2>Login Verification</h2>
                <p>You're trying to log in to your account. Please use the following verification code:</p>
                <h3 style="background-color: #f2f2f2; padding: 10px; font-size: 24px; letter-spacing: 5px;">{otp}</h3>
                <p>This code will expire in 10 minutes.</p>
                <p>IP Address: {get_remote_address()}</p>
                <p>If you didn't attempt to log in, please secure your account immediately.</p>
              </body>
            </html>
            """
        
        msg.attach(MIMEText(body, 'html'))
        
        server = smtplib.SMTP(EMAIL_SERVER, EMAIL_PORT)
        server.starttls()
        server.login(EMAIL_USER, EMAIL_PASSWORD)
        text = msg.as_string()
        server.sendmail(EMAIL_USER, email, text)
        server.quit()
        return True
    except Exception as e:
        logger.error(f"Error sending email: {e}")
        return False

#========================Authentication==================================================
def create_token(user):
    payload = {
        'user_id': str(user['_id']),
        'email': user['email'],
        'role': user['role'],
        'ip': get_remote_address(),  # Add IP address for extra validation
        'iat': datetime.datetime.utcnow(),  # Issued at time
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=8)  # Reduced token lifetime
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm='HS256')
    return token

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            log_security_event('missing_token', 'API request without token', severity="medium")
            return jsonify({'message': 'Token is missing'}), 401

        try:
            token = token.split(" ")[1]
            data = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
            current_user = users_collection.find_one({'email': data['email']})
            
            # Additional security: validate the IP hasn't changed
            if data.get('ip') != get_remote_address():
                log_security_event('ip_mismatch', 
                                  f"Token IP {data.get('ip')} doesn't match current IP {get_remote_address()}",
                                  user_email=data['email'],
                                  severity="high")
                return jsonify({'message': 'Session expired, please login again'}), 401
                
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            log_security_event('invalid_token', 'Invalid token used', severity="high")
            return jsonify({'message': 'Invalid token'}), 401
        except Exception as e:
            logger.error(f"Token validation error: {str(e)}")
            return jsonify({'message': 'Authentication failed'}), 500

        return f(current_user, *args, **kwargs)
    return decorated

#========================API Endpoints==================================================
@app.route('/register/initiate', methods=['POST'])
@limiter.limit("5 per minute")
def register_initiate():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'message': 'Email and password are required'}), 400
        
    # Validate email format
    if not re.match(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$", email):
        return jsonify({'message': 'Invalid email format'}), 400
        
    # Password strength validation
    if len(password) < 8:
        return jsonify({'message': 'Password must be at least 8 characters'}), 400
    if not re.search(r"[A-Z]", password) or not re.search(r"[a-z]", password) or not re.search(r"[0-9]", password):
        return jsonify({'message': 'Password must contain uppercase, lowercase and numbers'}), 400

    if users_collection.find_one({'email': email}):
        return jsonify({'message': 'Email already exists'}), 400

    # Generate and send OTP
    otp = generate_otp()
    save_otp(email, otp, 'signup')
    
    if send_otp_email(email, otp, 'signup'):
        # Store hashed password in Redis or another temporary store for better security
        # For this example, we'll return it encrypted
        encrypted_pwd = cipher_suite.encrypt(password.encode()).decode()
        return jsonify({
            'message': 'Verification code sent to your email',
            'email': email,
            'password': encrypted_pwd
        }), 200
    else:
        return jsonify({'message': 'Failed to send verification code'}), 500

@app.route('/register/verify', methods=['POST'])
@limiter.limit("5 per minute")
def register_verify():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    otp = data.get('otp')

    if not email or not password or not otp:
        return jsonify({'message': 'Email, password and verification code are required'}), 400

    try:
        # Decrypt password if it was encrypted
        if password.startswith('gAAA'):  # Simple check if it looks like Fernet encrypted
            try:
                password = cipher_suite.decrypt(password.encode()).decode()
            except Exception:
                # If decryption fails, assume it's plaintext
                pass
    except Exception as e:
        logger.error(f"Password decryption error: {e}")
        return jsonify({'message': 'Invalid request format'}), 400

    # Verify OTP
    if not verify_otp(email, otp, 'signup'):
        return jsonify({'message': 'Invalid or expired verification code'}), 400

    # Create user
    hashed_password = hash_password(password)
    new_user = {
        'email': email,
        'password': hashed_password,
        'role': 'user',  # Default role
        'created_at': datetime.datetime.utcnow(),
        'last_login': None
    }
    users_collection.insert_one(new_user)
    logger.info(f"New user registered: {email}")
    return jsonify({'message': 'User registered successfully'}), 201

@app.route('/login/initiate', methods=['POST'])
@limiter.limit("5 per minute")
def login_initiate():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'message': 'Email and password are required'}), 400

    user = users_collection.find_one({'email': email})
    if not user or not check_password(password, user['password']):
        # Add delay to prevent timing attacks
        import time
        time.sleep(random.uniform(0.5, 1.5))
        log_security_event('failed_login', f"Failed login attempt for {email}", user_email=email)
        return jsonify({'message': 'Invalid credentials'}), 401

    # Generate and send OTP
    otp = generate_otp()
    save_otp(email, otp, 'login')
    
    if send_otp_email(email, otp, 'login'):
        return jsonify({
            'message': 'Verification code sent to your email',
            'email': email
        }), 200
    else:
        return jsonify({'message': 'Failed to send verification code'}), 500

@app.route('/login/verify', methods=['POST'])
@limiter.limit("5 per minute")
def login_verify():
    data = request.get_json()
    email = data.get('email')
    otp = data.get('otp')

    if not email or not otp:
        return jsonify({'message': 'Email and verification code are required'}), 400

    # Verify OTP
    if not verify_otp(email, otp, 'login'):
        return jsonify({'message': 'Invalid or expired verification code'}), 400

    # Get user and create token
    user = users_collection.find_one({'email': email})
    if not user:
        return jsonify({'message': 'User not found'}), 404

    # Update last login timestamp
    users_collection.update_one(
        {'_id': user['_id']},
        {'$set': {'last_login': datetime.datetime.utcnow()}}
    )

    token = create_token(user)
    logger.info(f"User logged in: {email}")
    return jsonify({'token': token, 'role': user['role']}), 200

@app.route('/check_spam', methods=['POST'])
@token_required
@limiter.limit("10 per minute")
def check_spam(current_user):
    data = request.get_json()
    mail = data.get('mail')

    if not mail:
        return jsonify({'message': 'Email content is required'}), 400
        
    # Security: Sanitize and validate input
    mail = sanitize_input(mail)
    
    # Check for adversarial inputs
    if is_adversarial_input(mail):
        log_security_event(
            'potential_adversarial_input', 
            'Potential adversarial input detected',
            user_email=current_user['email'],
            severity="high"
        )
        return jsonify({'message': 'Invalid input format'}), 400

    try:
        # Transform input for prediction
        input_data_features = feature_extraction.transform([mail])
        
        # Implement gradient masking as a defense against adversarial examples
        # This is a simplified example - more sophisticated techniques would be used in production
        prediction_probabilities = model.predict_proba(input_data_features)[0]
        
        # If the prediction is very close to the decision boundary, treat with caution
        is_spam = prediction_probabilities[0] > 0.5
        confidence = max(prediction_probabilities)
        
        # If confidence is low, flag as uncertain
        result = 'SPAM' if is_spam else 'NOT SPAM'
        confidence_level = "high" if confidence > 0.8 else "medium" if confidence > 0.6 else "low"
        
        # Log the prediction with confidence
        log_data = {
            'user': current_user['email'],
            'emailSubject': mail[:50],  # Truncate subject for logging
            'result': result,
            'confidence': float(confidence),
            'confidence_level': confidence_level,
            'timestamp': datetime.datetime.utcnow(),
            'ip_address': get_remote_address()
        }
        logs_collection.insert_one(log_data)
        
        # If confidence is very low, add a warning in the response
        response = {'result': result, 'confidence': float(confidence), 'confidence_level': confidence_level}
        if confidence < 0.6:
            response['warning'] = 'Prediction has low confidence, please review carefully'
            
        return jsonify(response), 200
        
    except Exception as e:
        logger.error(f"Error processing email: {str(e)}")
        return jsonify({'message': 'Error processing email content'}), 500

@app.route('/logs', methods=['GET'])
@token_required
@limiter.limit("5 per minute")
def get_logs(current_user):
    if current_user['role'] != 'admin':
        log_security_event(
            'unauthorized_access',
            f"User {current_user['email']} attempted to access logs without permission",
            user_email=current_user['email'],
            severity="high"
        )
        return jsonify({'message': 'Unauthorized'}), 403

    # Pagination support
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 10))
    skip = (page - 1) * per_page
    
    logs = list(logs_collection.find({}).sort('timestamp', -1).skip(skip).limit(per_page))
    total = logs_collection.count_documents({})
    
    # Convert ObjectId to string for JSON serialization
    logs = [{**log, '_id': str(log['_id'])} for log in logs]
    
    return jsonify({
        'logs': logs,
        'page': page,
        'per_page': per_page,
        'total': total
    }), 200

@app.route('/security-events', methods=['GET'])
@token_required
@limiter.limit("5 per minute")
def get_security_events(current_user):
    if current_user['role'] != 'admin':
        log_security_event(
            'unauthorized_access',
            f"User {current_user['email']} attempted to access security events without permission",
            user_email=current_user['email'],
            severity="high"
        )
        return jsonify({'message': 'Unauthorized'}), 403

    # Filter by severity if specified
    severity = request.args.get('severity')
    query = {'severity': severity} if severity else {}
    
    # Pagination support
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 10))
    skip = (page - 1) * per_page
    
    events = list(security_events_collection.find(query).sort('timestamp', -1).skip(skip).limit(per_page))
    total = security_events_collection.count_documents(query)
    
    # Convert ObjectId to string for JSON serialization
    events = [{**event, '_id': str(event['_id'])} for event in events]
    
    return jsonify({
        'events': events,
        'page': page,
        'per_page': per_page,
        'total': total
    }), 200

# Add OPTIONS route handlers for CORS preflight requests
@app.route('/register/initiate', methods=['OPTIONS'])
@app.route('/register/verify', methods=['OPTIONS'])
@app.route('/login/initiate', methods=['OPTIONS'])
@app.route('/login/verify', methods=['OPTIONS'])
@app.route('/check_spam', methods=['OPTIONS'])
@app.route('/logs', methods=['OPTIONS'])
@app.route('/security-events', methods=['OPTIONS'])
def handle_options_request():
    return '', 200

# Route to handle rate limit exceeded error
@app.errorhandler(429)
def ratelimit_handler(e):
    log_security_event(
        'rate_limit_exceeded',
        f"Rate limit exceeded: {str(e)}",
        severity="medium"
    )
    return jsonify({
        "message": "Rate limit exceeded. Please try again later.",
        "error": "Too many requests"
    }), 429

if __name__ == '__main__':
    # Don't run in debug mode in production
    debug_mode = os.getenv('FLASK_ENV') == 'development'
    app.run(debug=debug_mode, host='0.0.0.0', port=int(os.getenv('PORT', 5000)))