from fastapi import FastAPI, HTTPException, Depends, Header, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, List
import uvicorn
import time

from database import db
from llm_service import llm_service
from sql_validator import validator
from config import FRONTEND_URL, BACKEND_PORT
from auth import router as auth_router, get_current_user
from fastapi import Depends

# Initialize FastAPI app
app = FastAPI(
    title="Natural Language to SQL API",
    description="Convert natural language queries to SQL and execute them safely",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000", "https://rubi-tau.vercel.app"],
    allow_origin_regex="https://.*\\.vercel\\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)

# Pydantic models for request/response
class QueryRequest(BaseModel):
    query: str
    operation_type: Optional[str] = "any"

class ExecuteRequest(BaseModel):
    sql: str

class FollowUpRequest(BaseModel):
    query: str
    previous_sql: str
    operation_type: Optional[str] = "any"

class QueryResponse(BaseModel):
    success: bool
    sql: Optional[str] = None
    explanation: Optional[str] = None
    warnings: Optional[List[str]] = None
    errors: Optional[List[str]] = None
    risk_level: Optional[str] = None
    message: Optional[str] = None

# Startup event
@app.on_event("startup")
async def startup_event():
    """Connect to database on startup"""
    print("[INFO] Starting Natural Language to SQL API...")
    if db.connect():
        print("[OK] Database connection established")
    else:
        print("[ERROR] Failed to connect to database")

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Close database connection on shutdown"""
    db.disconnect()
    print("[INFO] API shutdown complete")

# Helper to fetch custom config
def get_custom_config(user_id: int, connection_id: Optional[str]) -> Optional[dict]:
    if not connection_id or connection_id == "default": return None
    config = db.get_connection_config(int(connection_id), user_id)
    if not config:
        raise HTTPException(status_code=404, detail="Connection not found")
    return config

# Health check endpoint
@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "running",
        "message": "Natural Language to SQL API is running",
        "database_connected": db.test_connection()
    }

# Get database schema
@app.get("/api/schema")
async def get_schema(current_user: dict = Depends(get_current_user), x_connection_id: Optional[str] = Header(None)):
    """Get complete database schema"""
    try:
        cfg = get_custom_config(current_user['id'], x_connection_id)
        full_schema = db.get_full_schema(cfg)
        tables = db.get_tables(cfg)
        
        return {
            "success": True,
            "tables": tables,
            "schema": full_schema,
            "table_count": len(tables)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching schema: {str(e)}")

# Get specific table details
@app.get("/api/schema/{table_name}")
async def get_table_schema(table_name: str, current_user: dict = Depends(get_current_user), x_connection_id: Optional[str] = Header(None)):
    """Get schema for a specific table"""
    try:
        cfg = get_custom_config(current_user['id'], x_connection_id)
        schema = db.get_table_schema(table_name, cfg)
        if not schema:
            raise HTTPException(status_code=404, detail=f"Table '{table_name}' not found")
        
        return {
            "success": True,
            "table_name": table_name,
            "columns": schema
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching table schema: {str(e)}")

# Generate SQL from natural language
@app.post("/api/generate-sql", response_model=QueryResponse)
async def generate_sql(request: QueryRequest, current_user: dict = Depends(get_current_user), x_connection_id: Optional[str] = Header(None)):
    """
    Generate SQL query from natural language
    
    This endpoint:
    1. Takes natural language input
    2. Uses LLM to generate SQL
    3. Validates the generated SQL
    4. Returns SQL with explanation and warnings
    """
    try:
        cfg = get_custom_config(current_user['id'], x_connection_id)
        # Get database schema
        schema = db.get_schema_as_text(cfg)
        
        # Generate SQL using LLM
        llm_response = llm_service.generate_sql(
            user_query=request.query,
            schema=schema,
            operation_type=request.operation_type
        )
        
        if not llm_response['success']:
            return QueryResponse(
                success=False,
                message=llm_response.get('error', 'Failed to generate SQL'),
                errors=[llm_response.get('error', 'Unknown error')]
            )
        
        sql = llm_response['sql']
        
        # Validate SQL
        validation = validator.validate_query(sql)
        
        # Add LIMIT if missing for SELECT queries
        if validation['query_type'] == 'SELECT':
            sql = validator.add_limit_if_missing(sql)
        
        # Sanitize query
        sql = validator.sanitize_query(sql)
        
        return QueryResponse(
            success=validation['is_valid'],
            sql=sql,
            explanation=llm_response['explanation'],
            warnings=validation['warnings'],
            errors=validation['errors'],
            risk_level=validation['risk_level']
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating SQL: {str(e)}")

# Generate follow-up SQL with context
@app.post("/api/generate-followup", response_model=QueryResponse)
async def generate_followup(request: FollowUpRequest, current_user: dict = Depends(get_current_user), x_connection_id: Optional[str] = Header(None)):
    """Generate a follow-up SQL query using context from the previous query"""
    try:
        cfg = get_custom_config(current_user['id'], x_connection_id)
        schema = db.get_schema_as_text(cfg)
        llm_response = llm_service.generate_followup_sql(
            user_query=request.query,
            previous_sql=request.previous_sql,
            schema=schema,
            operation_type=request.operation_type
        )

        if not llm_response['success']:
            return QueryResponse(
                success=False,
                message=llm_response.get('error', 'Failed to generate SQL'),
                errors=[llm_response.get('error', 'Unknown error')]
            )

        sql = llm_response['sql']
        validation = validator.validate_query(sql)
        if validation['query_type'] == 'SELECT':
            sql = validator.add_limit_if_missing(sql)
        sql = validator.sanitize_query(sql)

        return QueryResponse(
            success=validation['is_valid'],
            sql=sql,
            explanation=llm_response['explanation'],
            warnings=validation['warnings'],
            errors=validation['errors'],
            risk_level=validation['risk_level']
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating follow-up SQL: {str(e)}")

# Execute SQL query
@app.post("/api/execute-sql")
async def execute_sql(request: ExecuteRequest, current_user: dict = Depends(get_current_user), x_connection_id: Optional[str] = Header(None)):
    """
    Execute SQL query after user approval
    
    This endpoint:
    1. Re-validates the SQL
    2. Executes if valid
    3. Returns results or error
    """
    try:
        sql = request.sql
        cfg = get_custom_config(current_user['id'], x_connection_id)
        
        # Re-validate before execution
        validation = validator.validate_query(sql)
        
        if not validation['is_valid']:
            return {
                "success": False,
                "message": "Query validation failed",
                "errors": validation['errors']
            }
        
        # Execute query
        result = db.execute_query(sql, cfg)
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error executing SQL: {str(e)}")

# Test database connection
@app.get("/api/test-connection")
async def test_connection(current_user: dict = Depends(get_current_user), x_connection_id: Optional[str] = Header(None)):
    """Test database connection"""
    try:
        cfg = get_custom_config(current_user['id'], x_connection_id)
        is_connected = db.test_connection(cfg)
    except:
        is_connected = False
        
    if not is_connected and not x_connection_id:
        is_connected = db.connect()
    
    return {
        "success": is_connected,
        "message": "Database connected" if is_connected else "Database connection failed"
    }

class SchemaCreate(BaseModel):
    schema_name: str

@app.post("/api/create-schema")
async def create_schema(req: SchemaCreate, current_user: dict = Depends(get_current_user)):
    """Creates a blank database schema and registers it as a connection"""
    try:
        safe_name = "".join([c if c.isalnum() else "_" for c in req.schema_name]).lower()
        db_name = f"sqhelp_usr{current_user['id']}_{safe_name}_{int(time.time())}"
        
        if not db.create_database(db_name):
            raise HTTPException(status_code=500, detail="Failed to create database schema")
            
        from config import MYSQL_CONFIG
        new_config = {
            "name": req.schema_name,
            "host": MYSQL_CONFIG['host'],
            "port": MYSQL_CONFIG.get('port', 3306),
            "username": MYSQL_CONFIG['user'],
            "password": MYSQL_CONFIG['password'],
            "database_name": db_name
        }
        conn_id = db.add_user_connection(current_user['id'], new_config)
        return {"success": True, "connection_id": conn_id, "message": f"Schema '{req.schema_name}' created successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
# CSV Upload Endpoint
@app.post("/api/upload-csv")
async def upload_csv(
    file: UploadFile = File(...), 
    connection_id: Optional[int] = None,
    current_user: dict = Depends(get_current_user),
    x_connection_id: Optional[str] = Header(None)
):
    """Upload a CSV file into a specific database schema"""
    try:
        if not file.filename.endswith('.csv'):
            raise HTTPException(status_code=400, detail="Only CSV files are allowed")
            
        # Determine target connection
        target_conn_id = connection_id if connection_id else x_connection_id
        cfg = get_custom_config(current_user['id'], target_conn_id)
            
        base_name = file.filename.rsplit('.', 1)[0]
        safe_name = "".join([c if c.isalnum() else "_" for c in base_name]).lower()
        table_name = safe_name if safe_name else "uploaded_data"
        
        # Upload data into the target database
        rows_inserted = db.upload_csv_to_db(file.file, table_name, cfg)
        
        return {
            "success": True, 
            "message": f"Successfully loaded {rows_inserted} rows into table '{table_name}'.",
            "connection_id": target_conn_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing CSV: {str(e)}")

# ------------------------------------------------------------------
# Connections CRUD Endpoints
# ------------------------------------------------------------------
class ConnectionCreate(BaseModel):
    name: str
    host: str
    port: int = 3306
    username: str
    password: str
    database_name: str

@app.get("/api/connections")
def list_connections(current_user: dict = Depends(get_current_user)):
    conns = db.get_user_connections(current_user['id'])
    return {"connections": conns}

@app.post("/api/connections")
def create_connection(conn_data: ConnectionCreate, current_user: dict = Depends(get_current_user)):
    cid = db.add_user_connection(current_user['id'], conn_data.dict())
    return {"success": True, "id": cid}

@app.post("/api/connections/test")
def test_new_connection(conn_data: ConnectionCreate, current_user: dict = Depends(get_current_user)):
    config = {
        "host": conn_data.host,
        "port": conn_data.port,
        "user": conn_data.username,
        "password": conn_data.password,
        "database": conn_data.database_name
    }
    is_ok = db.test_connection(config)
    return {"success": is_ok}

@app.delete("/api/connections/{connection_id}")
def delete_connection(connection_id: int, current_user: dict = Depends(get_current_user)):
    success = db.delete_user_connection(connection_id, current_user['id'])
    if not success:
        raise HTTPException(status_code=404, detail="Connection not found")
    return {"success": True}

# Run the application
if __name__ == "__main__":
    print("""
    ============================================================
       Natural Language to SQL API - Backend Server Starting
    ============================================================
    """)
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=BACKEND_PORT,
        reload=True,
        log_level="info"
    )
