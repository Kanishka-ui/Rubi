# Natural Language to SQL - Prototype

Convert natural language queries to SQL and execute them safely against your MySQL database.

## 🎯 Features

- **Natural Language Processing**: Convert plain English to SQL queries
- **Schema Awareness**: Automatically reads your database structure
- **Safety First**: Validates queries before execution
- **Human-in-the-Loop**: Requires approval before executing write operations
- **Real-time Dashboard**: See results immediately
- **Risk Detection**: Identifies dangerous operations
- **Multi-LLM Support**: Works with Gemini (free), Groq, or Claude

## 🏗️ Architecture

```
┌─────────────┐         ┌──────────────┐         ┌──────────┐
│   React     │ ◄─────► │   FastAPI    │ ◄─────► │  MySQL   │
│  Frontend   │         │   Backend    │         │ Database │
└─────────────┘         └──────────────┘         └──────────┘
                               │
                               ▼
                        ┌──────────────┐
                        │  Gemini API  │
                        │    (LLM)     │
                        └──────────────┘
```

## 📋 Prerequisites

- Python 3.8+
- Node.js 16+
- MySQL 5.7+ or 8.0+
- Gemini API key (free from Google AI Studio)

## 🚀 Quick Start

### 1. Get Gemini API Key (FREE)

1. Go to https://aistudio.google.com/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the API key

### 2. Setup Backend

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env

# Edit .env file with your credentials
nano .env  # or use any text editor
```

**Edit `.env` file:**
```env
# Database Configuration
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=your_mysql_username
MYSQL_PASSWORD=your_mysql_password
MYSQL_DATABASE=your_database_name

# LLM Configuration
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key_here

# Server Configuration
BACKEND_PORT=8000
FRONTEND_URL=http://localhost:3000
```

### 3. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

### 4. Run the Application

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
python main.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

The application will open at `http://localhost:3000`

## 🎮 Usage Examples

### Example 1: Query Data
**User:** "Show all products with price greater than 1000"

**System:**
- Generates: `SELECT * FROM products WHERE price > 1000 LIMIT 1000`
- Explains: "This query retrieves all products where the price exceeds 1000"
- Shows results in table format

### Example 2: Insert Data
**User:** "Add a new supplier named ABC Corp from Pune"

**System:**
- Generates: `INSERT INTO suppliers (name, city) VALUES ('ABC Corp', 'Pune')`
- Explains: "This will add a new supplier record"
- Asks for approval
- Executes after confirmation

### Example 3: Update Data
**User:** "Update the price of product ID 5 to 2500"

**System:**
- Generates: `UPDATE products SET price = 2500 WHERE product_id = 5`
- Warns: "UPDATE operation - please verify the WHERE condition"
- Asks for approval
- Executes after confirmation

## 🔒 Safety Features

### Query Validation
- Blocks dangerous keywords (DROP, TRUNCATE, etc.)
- Detects DELETE/UPDATE without WHERE clause
- Enforces row limits on SELECT queries
- Parses SQL to prevent injection attacks

### Risk Levels
- **Low**: SELECT, INSERT operations
- **Medium**: UPDATE with WHERE clause
- **High**: DELETE operations or missing WHERE clause

### Human Approval Required
All write operations (INSERT, UPDATE, DELETE) require explicit user approval before execution.

## 🔄 Switching LLM Providers

### Using Groq (Free, Ultra Fast)

1. Get API key from https://console.groq.com
2. Update `.env`:
```env
LLM_PROVIDER=groq
GROQ_API_KEY=your_groq_api_key
```

### Using Claude (Paid, Best Quality)

1. Get API key from https://console.anthropic.com
2. Update `.env`:
```env
LLM_PROVIDER=claude
ANTHROPIC_API_KEY=your_claude_api_key
```

## 📊 API Endpoints

### Backend API (Port 8000)

- `GET /` - Health check
- `GET /api/schema` - Get database schema
- `GET /api/schema/{table_name}` - Get specific table schema
- `POST /api/generate-sql` - Generate SQL from natural language
- `POST /api/execute-sql` - Execute approved SQL query
- `GET /api/test-connection` - Test database connection

## 🛠️ Configuration

### Database Settings (`config.py`)
```python
MYSQL_CONFIG = {
    'host': 'localhost',
    'port': 3306,
    'user': 'your_user',
    'password': 'your_password',
    'database': 'your_database'
}
```

### Safety Settings
```python
DANGEROUS_KEYWORDS = [
    'DROP TABLE',
    'DROP DATABASE',
    'TRUNCATE',
    'ALTER TABLE',
    'CREATE TABLE',
    'GRANT',
    'REVOKE'
]

DEFAULT_ROW_LIMIT = 1000  # Maximum rows for SELECT
```

## 🐛 Troubleshooting

### Backend Issues

**Problem:** "ModuleNotFoundError: No module named 'fastapi'"
**Solution:** Make sure virtual environment is activated and dependencies are installed:
```bash
source venv/bin/activate
pip install -r requirements.txt
```

**Problem:** "Can't connect to MySQL server"
**Solution:** 
1. Check MySQL is running: `mysql -u root -p`
2. Verify credentials in `.env` file
3. Check if database exists

**Problem:** "GEMINI_API_KEY not found"
**Solution:** Make sure `.env` file exists in backend directory with your API key

### Frontend Issues

**Problem:** "npm: command not found"
**Solution:** Install Node.js from https://nodejs.org/

**Problem:** "Failed to fetch" or "Network Error"
**Solution:** 
1. Ensure backend is running on port 8000
2. Check CORS settings in `main.py`
3. Clear browser cache

### LLM Issues

**Problem:** "SQL generation failed"
**Solution:**
1. Verify API key is correct
2. Check API rate limits (Gemini: 15 requests/min)
3. Try simpler queries first

**Problem:** "Column not found in generated SQL"
**Solution:** The LLM hallucinated a column name. Try:
1. Use more specific column names in your query
2. Refresh schema in the UI
3. Rephrase your question

## 💰 Cost Estimation

### Gemini (FREE Tier)
- **Limit**: 15 requests/minute, 1,500/day
- **Cost**: ₹0 for prototype usage
- **Perfect for**: Testing and prototyping

### Groq (FREE Tier)
- **Limit**: 30 requests/minute, 14,400/day
- **Cost**: ₹0 for prototype usage
- **Perfect for**: Fast responses

### Claude (Paid)
- **Cost**: ~₹0.25-0.50 per query
- **Monthly**: ~₹300-500 for 1000 queries
- **Perfect for**: Production with best accuracy

## 📝 Project Structure

```
nl-to-sql-prototype/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── config.py            # Configuration
│   ├── database.py          # MySQL connection & queries
│   ├── llm_service.py       # LLM integration
│   ├── sql_validator.py     # Query validation
│   ├── requirements.txt     # Python dependencies
│   └── .env                 # Environment variables
├── frontend/
│   ├── public/
│   │   └── index.html       # HTML template
│   ├── src/
│   │   ├── App.js           # Main React component
│   │   ├── App.css          # Styles
│   │   ├── index.js         # Entry point
│   │   └── index.css        # Global styles
│   └── package.json         # Node dependencies
└── README.md                # This file
```

## 🔐 Security Considerations

### For Production
1. **Add authentication** - JWT tokens, OAuth
2. **Role-based access control** - Different permissions for different users
3. **Audit logging** - Track all queries and who executed them
4. **Rate limiting** - Prevent abuse
5. **Input sanitization** - Additional validation layers
6. **Environment variables** - Never commit `.env` to git
7. **HTTPS** - Use SSL/TLS for production

### Current Safety Measures
- SQL parsing and validation
- Dangerous keyword blocking
- Row limit enforcement
- Human approval for write operations
- No direct user input to database

## 🚧 Known Limitations

1. **LLM Accuracy**: May occasionally hallucinate column names
2. **Complex Queries**: Struggles with very complex joins/subqueries
3. **Schema Size**: Large databases (100+ tables) may exceed context window
4. **No Optimization**: Generated SQL may not be optimally performant
5. **Single Statement**: Only one SQL statement allowed per query

## 📈 Future Enhancements

- [ ] Authentication and user management
- [ ] Role-based access control
- [ ] Query history and favorites
- [ ] Export results (CSV, Excel)
- [ ] Scheduled queries
- [ ] Query optimization suggestions
- [ ] Support for PostgreSQL, SQL Server
- [ ] Natural language to chart/visualization
- [ ] Mobile responsive design improvements

## 🤝 Contributing

This is a prototype. Feel free to:
- Report bugs
- Suggest features
- Submit pull requests
- Share feedback

## 📄 License

MIT License - feel free to use for learning and commercial projects.

## 🙏 Acknowledgments

- **Gemini**: Free LLM API for SQL generation
- **FastAPI**: High-performance Python framework
- **React**: Frontend framework
- **MySQL**: Relational database

## 📞 Support

For issues or questions:
1. Check the Troubleshooting section
2. Review API documentation at `http://localhost:8000/docs`
3. Check Gemini API status at Google AI Studio

## 🎓 Learning Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)
- [MySQL Documentation](https://dev.mysql.com/doc/)
- [Gemini API Documentation](https://ai.google.dev/docs)

---

**Built with ❤️ for democratizing data access**
