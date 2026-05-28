import mysql.connector
from mysql.connector import Error, pooling
from typing import List, Dict, Optional
from config import MYSQL_CONFIG, MYSQL_USE_SSL
import pandas as pd
from sqlalchemy import create_engine
import urllib.parse

class DatabaseManager:
    def __init__(self):
        self.pool = None
        self._init_pool()

    # ------------------------------------------------------------------
    # Connection pool — always-fresh connections, no stale state
    # ------------------------------------------------------------------
    def _init_pool(self):
        """Create a connection pool on startup"""
        try:
            pool_config = {**MYSQL_CONFIG, "pool_name": "sqhelp_pool", "pool_size": 5}
            self.pool = pooling.MySQLConnectionPool(**pool_config)
            print(f"[OK] Connection pool created for database: {MYSQL_CONFIG['database']}")
        except Error as e:
            print(f"[ERROR] Could not create connection pool: {e}")
            self.pool = None

    def _get_connection(self, custom_config: Optional[Dict] = None):
        """Get a fresh connection from the pool, or a direct one if custom config is provided"""
        if custom_config:
            # For dynamic data sources, we don't pool to avoid keeping too many open connections.
            # We just create a fresh direct connection.
            return mysql.connector.connect(**custom_config)
            
        if self.pool:
            return self.pool.get_connection()
        # Fallback: direct connection without pool
        return mysql.connector.connect(**MYSQL_CONFIG)

    # ------------------------------------------------------------------
    # Legacy helpers kept for startup/shutdown hooks in main.py
    # ------------------------------------------------------------------
    def connect(self) -> bool:
        """Verify pool is working by grabbing a test connection"""
        try:
            conn = self._get_connection()
            ok = conn.is_connected()
            conn.close()
            if ok:
                print(f"[OK] Successfully connected to MySQL database: {MYSQL_CONFIG['database']}")
                self.init_users_table()
            return ok
        except Error as e:
            print(f"[ERROR] Error connecting to MySQL: {e}")
            return False

    def init_users_table(self):
        """Create users table if it does not exist"""
        conn = None
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS sqhelp_users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    full_name VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS sqhelp_connections (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    host VARCHAR(255) NOT NULL,
                    port INT DEFAULT 3306,
                    username VARCHAR(255) NOT NULL,
                    password VARCHAR(255) NOT NULL,
                    database_name VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES sqhelp_users(id) ON DELETE CASCADE
                )
            ''')
            
            conn.commit()
            cursor.close()
            print("[OK] Verified sqhelp_users and sqhelp_connections tables exist.")
        except Error as e:
            print(f"[ERROR] Error creating users table: {e}")
        finally:
            if conn:
                conn.close()

    def disconnect(self):
        """No-op for pooled connections; pool is GC'd on shutdown"""
        print("[INFO] MySQL connection pool released")

    def test_connection(self, custom_config: Optional[Dict] = None) -> bool:
        """Ping the database to verify connectivity"""
        try:
            conn = self._get_connection(custom_config)
            ok = conn.is_connected()
            conn.close()
            return ok
        except:
            return False

    def create_database(self, db_name: str) -> bool:
        """Create a new database (used for CSV uploads)"""
        conn = None
        try:
            # Connect without specifying a database to run CREATE DATABASE
            config_no_db = MYSQL_CONFIG.copy()
            if 'database' in config_no_db:
                del config_no_db['database']
            conn = mysql.connector.connect(**config_no_db)
            cursor = conn.cursor()
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{db_name}`")
            conn.commit()
            cursor.close()
            return True
        except Error as e:
            print(f"[ERROR] Error creating database {db_name}: {e}")
            return False
        finally:
            if conn:
                conn.close()

    # ------------------------------------------------------------------
    # Data Sources CRUD
    # ------------------------------------------------------------------
    def get_user_connections(self, user_id: int) -> List[Dict]:
        conn = None
        try:
            conn = self._get_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT id, name, host, port, username, database_name, created_at FROM sqhelp_connections WHERE user_id = %s", (user_id,))
            res = cursor.fetchall()
            cursor.close()
            return res
        except Error as e:
            print(f"[ERROR] fetching connections: {e}")
            return []
        finally:
            if conn: conn.close()

    def get_connection_config(self, connection_id: int, user_id: int) -> Optional[Dict]:
        conn = None
        try:
            conn = self._get_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT host, port, username as user, password, database_name as `database` FROM sqhelp_connections WHERE id = %s AND user_id = %s", (connection_id, user_id))
            res = cursor.fetchone()
            cursor.close()
            return res
        except Error as e:
            print(f"[ERROR] fetching connection config: {e}")
            return None
        finally:
            if conn: conn.close()

    def add_user_connection(self, user_id: int, data: Dict) -> int:
        conn = None
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO sqhelp_connections (user_id, name, host, port, username, password, database_name) VALUES (%s, %s, %s, %s, %s, %s, %s)",
                (user_id, data['name'], data['host'], data['port'], data['username'], data['password'], data['database_name'])
            )
            conn.commit()
            cid = cursor.lastrowid
            cursor.close()
            return cid
        finally:
            if conn: conn.close()

    def delete_user_connection(self, connection_id: int, user_id: int) -> bool:
        conn = None
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            cursor.execute("DELETE FROM sqhelp_connections WHERE id = %s AND user_id = %s", (connection_id, user_id))
            conn.commit()
            affected = cursor.rowcount
            cursor.close()
            return affected > 0
        finally:
            if conn: conn.close()

    # ------------------------------------------------------------------
    # Schema helpers
    # ------------------------------------------------------------------
    def get_tables(self, custom_config: Optional[Dict] = None) -> List[str]:
        """Get list of all tables in the database"""
        conn = None
        try:
            conn = self._get_connection(custom_config)
            cursor = conn.cursor()
            cursor.execute("SHOW TABLES")
            tables = [table[0] for table in cursor.fetchall()]
            cursor.close()
            return tables
        except Error as e:
            print(f"[ERROR] Error fetching tables: {e}")
            return []
        finally:
            if conn:
                conn.close()

    def get_table_schema(self, table_name: str, custom_config: Optional[Dict] = None) -> List[Dict]:
        """Get detailed schema for a specific table"""
        conn = None
        try:
            conn = self._get_connection(custom_config)
            cursor = conn.cursor(dictionary=True)
            cursor.execute(f"DESCRIBE `{table_name}`")
            schema = cursor.fetchall()
            cursor.close()
            return schema
        except Error as e:
            print(f"[ERROR] Error fetching schema for {table_name}: {e}")
            return []
        finally:
            if conn:
                conn.close()

    def get_full_schema(self, custom_config: Optional[Dict] = None) -> Dict:
        """Get complete database schema with all tables and columns"""
        schema = {}
        tables = self.get_tables(custom_config)
        for table in tables:
            schema[table] = self.get_table_schema(table, custom_config)
        return schema

    def get_schema_as_text(self, custom_config: Optional[Dict] = None) -> str:
        """Get schema formatted as text for LLM context"""
        full_schema = self.get_full_schema(custom_config)
        schema_text = "DATABASE SCHEMA:\n\n"
        for table_name, columns in full_schema.items():
            schema_text += f"Table: {table_name}\n"
            schema_text += "Columns:\n"
            for col in columns:
                null_constraint = "NOT NULL" if col['Null'] == 'NO' else "NULL"
                key_info = f" ({col['Key']})" if col['Key'] else ""
                schema_text += f"  - {col['Field']}: {col['Type']} {null_constraint}{key_info}\n"
            schema_text += "\n"
        return schema_text

    # ------------------------------------------------------------------
    # CSV Upload
    # ------------------------------------------------------------------
    def upload_csv_to_db(self, file_stream, table_name: str, custom_config: Optional[Dict] = None) -> int:
        """Reads CSV and uploads to the database, returns row count"""
        cfg = custom_config if custom_config else MYSQL_CONFIG
        
        # Build SQLAlchemy connection string
        password = urllib.parse.quote_plus(cfg.get('password', ''))
        user = cfg.get('user', cfg.get('username', 'root'))
        host = cfg.get('host', 'localhost')
        port = cfg.get('port', 3306)
        database = cfg.get('database', cfg.get('database_name', ''))
        
        conn_str = f"mysql+mysqlconnector://{user}:{password}@{host}:{port}/{database}"
        
        # Add SSL for remote hosts (e.g. Aiven)
        use_ssl = cfg.get('ssl_disabled') == False or (cfg is MYSQL_CONFIG and MYSQL_USE_SSL)
        connect_args = {'ssl_disabled': False} if use_ssl else {}
        engine = create_engine(conn_str, connect_args=connect_args)
        
        df = pd.read_csv(file_stream)
        # Sanitize column names
        df.columns = [c.strip().replace(' ', '_').lower() for c in df.columns]
        
        # Write to SQL
        df.to_sql(name=table_name, con=engine, if_exists='replace', index=False)
        return len(df)

    # ------------------------------------------------------------------
    # Query execution
    # ------------------------------------------------------------------
    def execute_query(self, query: str, custom_config: Optional[Dict] = None) -> Dict:
        """Execute SQL query and return results"""
        conn = None
        try:
            conn = self._get_connection(custom_config)
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query)

            if query.strip().upper().startswith('SELECT'):
                results = cursor.fetchall()
                # Convert non-serialisable types (Decimal, date, etc.) to strings
                serialised = []
                for row in results:
                    serialised.append({k: (str(v) if v is not None else None) for k, v in row.items()})
                columns = list(serialised[0].keys()) if serialised else \
                          ([desc[0] for desc in cursor.description] if cursor.description else [])
                cursor.close()
                return {
                    'success': True,
                    'data': serialised,
                    'columns': columns,
                    'row_count': len(serialised),
                    'query_type': 'SELECT'
                }
            else:
                conn.commit()
                affected_rows = cursor.rowcount
                cursor.close()
                return {
                    'success': True,
                    'affected_rows': affected_rows,
                    'query_type': query.strip().split()[0].upper(),
                    'message': f'Query executed successfully. {affected_rows} row(s) affected.'
                }

        except Error as e:
            return {
                'success': False,
                'error': str(e),
                'message': f'Error executing query: {str(e)}'
            }
        finally:
            if conn:
                conn.close()


# Global database instance
db = DatabaseManager()
