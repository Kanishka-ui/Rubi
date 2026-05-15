import sqlparse
import re
from typing import Dict, List
from config import DANGEROUS_KEYWORDS, DEFAULT_ROW_LIMIT

class SQLValidator:
    
    @staticmethod
    def validate_query(sql: str) -> Dict:
        """
        Validate SQL query for safety and correctness
        
        Returns:
            Dict with is_valid, warnings, errors, and risk_level
        """
        warnings = []
        errors = []
        risk_level = "low"  # low, medium, high
        
        # Parse SQL
        try:
            parsed = sqlparse.parse(sql)
            if not parsed:
                errors.append("Could not parse SQL query")
                return {
                    'is_valid': False,
                    'warnings': warnings,
                    'errors': errors,
                    'risk_level': 'high'
                }
        except Exception as e:
            errors.append(f"SQL parsing error: {str(e)}")
            return {
                'is_valid': False,
                'warnings': warnings,
                'errors': errors,
                'risk_level': 'high'
            }
        
        sql_upper = sql.upper()
        
        # Check for dangerous keywords
        for keyword in DANGEROUS_KEYWORDS:
            if keyword in sql_upper:
                errors.append(f"Dangerous operation detected: {keyword}")
                risk_level = "high"
        
        # Detect query type
        query_type = SQLValidator._detect_query_type(sql_upper)
        
        # Check for DELETE/UPDATE without WHERE
        if query_type == 'DELETE':
            risk_level = "high"
            if 'WHERE' not in sql_upper:
                errors.append("DELETE without WHERE clause - this will delete ALL rows!")
            else:
                warnings.append("DELETE operation - please verify the WHERE condition carefully")
        
        if query_type == 'UPDATE':
            risk_level = "medium"
            if 'WHERE' not in sql_upper:
                errors.append("UPDATE without WHERE clause - this will update ALL rows!")
            else:
                warnings.append("UPDATE operation - please verify the WHERE condition carefully")
        
        if query_type == 'INSERT':
            risk_level = "low"
            warnings.append("INSERT operation - new row will be added")
        
        # Check for LIMIT in SELECT queries
        if query_type == 'SELECT':
            if 'LIMIT' not in sql_upper:
                warnings.append(f"No LIMIT specified - will default to {DEFAULT_ROW_LIMIT} rows")
        
        # Check for multiple statements (SQL injection attempt)
        if sql.count(';') > 1 or sql.strip().endswith(';') and sql.count(';') > 0:
            if sql.strip().endswith(';'):
                # Single statement with trailing semicolon is OK
                pass
            else:
                errors.append("Multiple SQL statements detected - only one statement allowed")
                risk_level = "high"
        
        is_valid = len(errors) == 0
        
        return {
            'is_valid': is_valid,
            'warnings': warnings,
            'errors': errors,
            'risk_level': risk_level,
            'query_type': query_type
        }
    
    @staticmethod
    def _detect_query_type(sql: str) -> str:
        """Detect the type of SQL query"""
        sql = sql.strip().upper()
        
        if sql.startswith('SELECT'):
            return 'SELECT'
        elif sql.startswith('INSERT'):
            return 'INSERT'
        elif sql.startswith('UPDATE'):
            return 'UPDATE'
        elif sql.startswith('DELETE'):
            return 'DELETE'
        else:
            return 'UNKNOWN'
    
    @staticmethod
    def add_limit_if_missing(sql: str) -> str:
        """Add LIMIT clause to SELECT queries if missing"""
        sql_upper = sql.upper()
        
        if sql_upper.strip().startswith('SELECT') and 'LIMIT' not in sql_upper:
            sql = sql.strip().rstrip(';')
            sql += f' LIMIT {DEFAULT_ROW_LIMIT}'
        
        return sql
    
    @staticmethod
    def sanitize_query(sql: str) -> str:
        """Clean and sanitize SQL query"""
        # Remove extra whitespace
        sql = ' '.join(sql.split())
        
        # Remove trailing semicolon for consistency
        sql = sql.strip().rstrip(';')
        
        return sql

# Global validator instance
validator = SQLValidator()
