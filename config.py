import os
from dotenv import load_dotenv

load_dotenv()

# Database Configuration
_host = os.getenv('MYSQL_HOST', 'localhost')
# Enable SSL automatically when connecting to a remote host (e.g. Aiven)
# Set MYSQL_USE_SSL=false explicitly to disable
_use_ssl_default = 'false' if _host in ('localhost', '127.0.0.1') else 'true'
MYSQL_USE_SSL = os.getenv('MYSQL_USE_SSL', _use_ssl_default).lower() == 'true'

MYSQL_CONFIG = {
    'host': _host,
    'port': int(os.getenv('MYSQL_PORT', 3306)),
    'user': os.getenv('MYSQL_USER', 'root'),
    'password': os.getenv('MYSQL_PASSWORD', ''),
    'database': os.getenv('MYSQL_DATABASE', 'defaultdb'),
}

if MYSQL_USE_SSL:
    MYSQL_CONFIG['ssl_disabled'] = False

print("Loaded MYSQL_CONFIG (host):", MYSQL_CONFIG['host'], "| SSL:", MYSQL_USE_SSL)

# LLM Configuration
LLM_PROVIDER = os.getenv('LLM_PROVIDER', 'gemini')  # Options: gemini, groq, claude
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
GROQ_API_KEY = os.getenv('GROQ_API_KEY')
ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY')

# Server Configuration
BACKEND_PORT = int(os.getenv('BACKEND_PORT', 8000))
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000')

# SQL Safety Rules
DANGEROUS_KEYWORDS = [
    'DROP TABLE',
    'DROP DATABASE',
    'GRANT',
    'REVOKE'
]

# Query row limit
DEFAULT_ROW_LIMIT = 1000
