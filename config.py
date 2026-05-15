import os
from dotenv import load_dotenv

load_dotenv()

# Database Configuration
MYSQL_CONFIG = {
    'host': os.getenv('MYSQL_HOST', 'localhost'),
    'port': int(os.getenv('MYSQL_PORT', 3306)),
    'user': os.getenv('MYSQL_USER', 'root'),
    'password': os.getenv('MYSQL_PASSWORD', ''),
    'database': os.getenv('MYSQL_DATABASE', 'sqhelp_db')
}
print("Loaded MYSQL_CONFIG:", MYSQL_CONFIG)

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
