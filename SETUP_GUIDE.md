# 📘 Complete Setup Guide

This guide will walk you through setting up the Natural Language to SQL prototype from scratch.

## ⏱️ Estimated Time: 15-20 minutes

---

## Step 1: Install Prerequisites

### Install Python (if not already installed)

**Check if Python is installed:**
```bash
python --version
# or
python3 --version
```

**Install Python:**
- Download from: https://www.python.org/downloads/
- Install Python 3.8 or higher
- ✅ Make sure to check "Add Python to PATH" during installation

### Install Node.js (if not already installed)

**Check if Node.js is installed:**
```bash
node --version
npm --version
```

**Install Node.js:**
- Download from: https://nodejs.org/
- Install LTS version (16+ or higher)

### Verify MySQL is Running

**Check MySQL status:**
```bash
mysql --version
```

**Start MySQL service:**
- **Windows**: Open Services, start MySQL service
- **Mac**: `brew services start mysql`
- **Linux**: `sudo systemctl start mysql`

---

## Step 2: Get Your Gemini API Key (FREE)

1. **Open your browser** and go to:
   ```
   https://aistudio.google.com/apikey
   ```

2. **Sign in** with your Google account

3. **Click "Create API Key"**

4. **Copy the API key** - it looks like:
   ```
   AIzaSyD...xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

5. **Save it somewhere** - you'll need it in Step 4

**Important:** This is FREE! No credit card required. You get 1,500 requests per day.

---

## Step 3: Download and Extract the Project

1. **Navigate to your project folder:**
   ```bash
   cd /path/to/your/projects
   ```

2. **Copy the `nl-to-sql-prototype` folder** to your desired location

---

## Step 4: Setup Backend

### 4.1 Navigate to Backend Folder
```bash
cd nl-to-sql-prototype/backend
```

### 4.2 Create Virtual Environment

**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**Mac/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

You should see `(venv)` at the start of your command prompt.

### 4.3 Install Python Dependencies
```bash
pip install -r requirements.txt
```

Wait for all packages to install (~2-3 minutes).

### 4.4 Create Environment Variables File

**Copy the example file:**
```bash
# Windows
copy .env.example .env

# Mac/Linux
cp .env.example .env
```

**Edit the `.env` file** with your favorite text editor (Notepad, VS Code, nano, etc.)

**Update these values:**
```env
# Your MySQL database credentials
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root                    # Your MySQL username
MYSQL_PASSWORD=your_password       # Your MySQL password
MYSQL_DATABASE=your_database_name  # Your database name

# Your Gemini API key (from Step 2)
LLM_PROVIDER=gemini
GEMINI_API_KEY=AIzaSyD...xxxxxxxxxxxxxxx  # Paste your API key here

# These can stay as-is
BACKEND_PORT=8000
FRONTEND_URL=http://localhost:3000
```

**Save the file!**

### 4.5 Test Database Connection

```bash
python -c "from database import db; print('✅ Connected!' if db.connect() else '❌ Connection failed')"
```

If you see **"✅ Connected!"** - great! Move to Step 5.

If you see **"❌ Connection failed"**:
1. Check MySQL is running
2. Verify credentials in `.env`
3. Make sure database exists: `CREATE DATABASE your_database_name;`

---

## Step 5: Setup Frontend

### 5.1 Open a New Terminal Window
Keep the backend terminal open, open a new one.

### 5.2 Navigate to Frontend Folder
```bash
cd nl-to-sql-prototype/frontend
```

### 5.3 Install Node Dependencies
```bash
npm install
```

This will take 2-3 minutes to install all packages.

---

## Step 6: Start the Application

### 6.1 Start Backend (Terminal 1)

```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
python main.py
```

You should see:
```
╔═══════════════════════════════════════════════════════╗
║   Natural Language to SQL API                        ║
║   Backend Server Starting...                         ║
╚═══════════════════════════════════════════════════════╝

🚀 Starting Natural Language to SQL API...
✅ Database connection established
✅ Initialized Gemini 1.5 Flash
INFO:     Uvicorn running on http://0.0.0.0:8000
```

**✅ Backend is ready!**

### 6.2 Start Frontend (Terminal 2)

In a NEW terminal:
```bash
cd frontend
npm start
```

Your browser should automatically open to `http://localhost:3000`

If not, manually open: http://localhost:3000

**✅ Frontend is ready!**

---

## Step 7: Verify Everything Works

### 7.1 Check Connection Status
In the browser, look at the top-right corner. You should see:
- 🟢 **Connected** (green dot)

### 7.2 View Database Schema
On the left sidebar, you should see your database tables and columns.

### 7.3 Try a Test Query

**Click one of the example queries or type:**
```
Show all products
```

**You should see:**
1. SQL query generated
2. Explanation of what it does
3. Approval prompt
4. Click "Execute Query"
5. Results displayed!

---

## 🎉 Success!

You now have a working Natural Language to SQL prototype!

---

## Common Issues and Solutions

### Issue 1: "Port 8000 already in use"

**Solution:**
```bash
# Find process using port 8000
# Windows:
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Mac/Linux:
lsof -ti:8000 | xargs kill -9
```

### Issue 2: "Cannot connect to database"

**Solution:**
1. Verify MySQL is running
2. Test connection manually:
   ```bash
   mysql -u your_user -p
   ```
3. Check credentials in `.env` file
4. Ensure database exists

### Issue 3: "GEMINI_API_KEY not found"

**Solution:**
1. Make sure `.env` file exists in `backend/` folder
2. Check API key is correct (no extra spaces)
3. Restart backend server

### Issue 4: "npm: command not found"

**Solution:**
1. Install Node.js from https://nodejs.org/
2. Restart your terminal
3. Verify: `node --version`

### Issue 5: Frontend shows "Disconnected"

**Solution:**
1. Make sure backend is running on port 8000
2. Check backend terminal for errors
3. Try refreshing the page
4. Check `.env` has `FRONTEND_URL=http://localhost:3000`

### Issue 6: "Module not found" errors in Python

**Solution:**
```bash
# Make sure virtual environment is activated
source venv/bin/activate  # or venv\Scripts\activate

# Reinstall dependencies
pip install -r requirements.txt
```

### Issue 7: Queries are slow

**Solution:**
- Gemini free tier has rate limits (15 req/min)
- If you hit limits, wait 1 minute
- Consider using Groq for faster responses (see README)

---

## Testing the Application

### Test 1: Read Query (SELECT)
```
Show me all records from [your_table_name]
```
Expected: Query generated, no approval needed, results shown

### Test 2: Write Query (INSERT)
```
Add a new supplier named Test Corp from Mumbai
```
Expected: Query generated, approval required, executes after approval

### Test 3: Update Query
```
Update product price to 1500 where product_id is 5
```
Expected: Warning shown, approval required, executes after approval

### Test 4: Complex Query
```
Show total sales by product category for last month
```
Expected: JOIN query generated (if you have related tables)

---

## Next Steps

### Customize for Your Database

1. **Update example queries** in `App.js`:
   ```javascript
   "Show all products with price greater than 1000"
   ```
   Change these to match your actual tables.

2. **Adjust row limits** in `config.py`:
   ```python
   DEFAULT_ROW_LIMIT = 1000  # Change as needed
   ```

3. **Add more safety rules** in `config.py`:
   ```python
   DANGEROUS_KEYWORDS = [
       'DROP TABLE',
       # Add more...
   ]
   ```

### Enable Other LLM Providers

**Switch to Groq (faster, still free):**
1. Get API key from https://console.groq.com
2. Update `.env`:
   ```env
   LLM_PROVIDER=groq
   GROQ_API_KEY=your_groq_key
   ```
3. Restart backend

**Switch to Claude (best quality, paid):**
1. Get API key from https://console.anthropic.com
2. Update `.env`:
   ```env
   LLM_PROVIDER=claude
   ANTHROPIC_API_KEY=your_claude_key
   ```
3. Restart backend

---

## How to Stop the Application

### Stop Backend
In the backend terminal, press: `Ctrl + C`

### Stop Frontend
In the frontend terminal, press: `Ctrl + C`

---

## How to Restart

```bash
# Terminal 1 - Backend
cd backend
source venv/bin/activate
python main.py

# Terminal 2 - Frontend
cd frontend
npm start
```

---

## Getting Help

### Check Logs

**Backend logs:** Look at the terminal where you ran `python main.py`

**Frontend logs:** 
- Browser console (F12 → Console tab)
- Terminal where you ran `npm start`

### API Documentation

Visit: http://localhost:8000/docs

This shows all available API endpoints with testing interface.

### Health Check

Visit: http://localhost:8000/

Should show:
```json
{
  "status": "running",
  "message": "Natural Language to SQL API is running",
  "database_connected": true
}
```

---

## Tips for Best Results

1. **Be specific in queries:**
   - ❌ "Show products"
   - ✅ "Show all products with price greater than 1000"

2. **Use actual column names:**
   - ❌ "Show cost"
   - ✅ "Show price" (if your column is named 'price')

3. **For complex operations, break them down:**
   - Instead of: "Update all products in electronics category to 10% discount"
   - Try: "Show me products in electronics category" first
   - Then: "Update price for product_id X to [new price]"

4. **Always review generated SQL** before approving!

---

## Congratulations! 🎊

You've successfully set up your Natural Language to SQL prototype!

**What you can do now:**
- ✅ Query your database in plain English
- ✅ Add, update, delete data safely
- ✅ Share with your team
- ✅ Customize for your needs

**Need help?** Check the README.md for more details and troubleshooting.
