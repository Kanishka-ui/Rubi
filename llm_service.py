from google import genai
from google.genai import types
from typing import Dict, Optional
from config import LLM_PROVIDER, GEMINI_API_KEY, GROQ_API_KEY, ANTHROPIC_API_KEY

class LLMService:
    def __init__(self):
        self.provider = LLM_PROVIDER
        self._initialize_provider()
    
    def _initialize_provider(self):
        """Initialize the selected LLM provider"""
        if self.provider == 'gemini':
            if not GEMINI_API_KEY:
                raise ValueError("GEMINI_API_KEY not found in environment variables")
            self.client = genai.Client(api_key=GEMINI_API_KEY)
            self.model_name = 'gemini-2.5-flash'
            print(f"[OK] Initialized Gemini 2.5 Flash")
            
        elif self.provider == 'groq':
            if not GROQ_API_KEY:
                raise ValueError("GROQ_API_KEY not found in environment variables")
            from groq import Groq
            self.groq_client = Groq(api_key=GROQ_API_KEY)
            self.model_name = "llama-3.1-70b-versatile"
            print(f"[OK] Initialized Groq (Llama 3.1 70B)")
            
        elif self.provider == 'claude':
            if not ANTHROPIC_API_KEY:
                raise ValueError("ANTHROPIC_API_KEY not found in environment variables")
            from anthropic import Anthropic
            self.anthropic_client = Anthropic(api_key=ANTHROPIC_API_KEY)
            self.model_name = "claude-sonnet-4-20250514"
            print(f"[OK] Initialized Claude Sonnet 4.5")
        
        else:
            raise ValueError(f"Unknown LLM provider: {self.provider}")
    
    def generate_sql(self, user_query: str, schema: str, operation_type: str = "any") -> Dict:
        """
        Generate SQL query from natural language
        
        Args:
            user_query: Natural language query from user
            schema: Database schema as text
            operation_type: Type of operation (SELECT, INSERT, UPDATE, DELETE, or any)
        
        Returns:
            Dict with sql, explanation, and warnings
        """
        prompt = self._build_prompt(user_query, schema, operation_type)
        
        try:
            if self.provider == 'gemini':
                response = self.client.models.generate_content(
                    model=self.model_name,
                    contents=prompt
                )
                return self._parse_response(response.text)
                
            elif self.provider == 'groq':
                response = self.groq_client.chat.completions.create(
                    model=self.model_name,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.1,
                    max_tokens=1000
                )
                return self._parse_response(response.choices[0].message.content)
                
            elif self.provider == 'claude':
                response = self.anthropic_client.messages.create(
                    model=self.model_name,
                    max_tokens=1000,
                    temperature=0.1,
                    messages=[{"role": "user", "content": prompt}]
                )
                return self._parse_response(response.content[0].text)
                
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'sql': None,
                'explanation': None
            }

    def generate_followup_sql(self, user_query: str, previous_sql: str, schema: str, operation_type: str = "any") -> Dict:
        """Generate a follow-up SQL query using context from a previous query"""
        prompt = self._build_followup_prompt(user_query, previous_sql, schema, operation_type)

        try:
            if self.provider == 'gemini':
                response = self.client.models.generate_content(
                    model=self.model_name,
                    contents=prompt
                )
                return self._parse_response(response.text)

            elif self.provider == 'groq':
                response = self.groq_client.chat.completions.create(
                    model=self.model_name,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.1,
                    max_tokens=1000
                )
                return self._parse_response(response.choices[0].message.content)

            elif self.provider == 'claude':
                response = self.anthropic_client.messages.create(
                    model=self.model_name,
                    max_tokens=1000,
                    temperature=0.1,
                    messages=[{"role": "user", "content": prompt}]
                )
                return self._parse_response(response.content[0].text)

        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'sql': None,
                'explanation': None
            }

    def _build_followup_prompt(self, user_query: str, previous_sql: str, schema: str, operation_type: str) -> str:
        """Build prompt for follow-up SQL generation with context"""
        return f"""You are an expert SQL assistant. The user is having a conversation about their data.
They previously ran this SQL query:

PREVIOUS SQL:
{previous_sql}

Now the user wants to REFINE or FOLLOW UP on that result. Modify the previous query based on their new request.
Do NOT start from scratch -- build upon the previous query.

{schema}

USER FOLLOW-UP REQUEST: {user_query}

RULES:
1. Generate ONLY valid MySQL syntax
2. Use proper table and column names from the schema above
3. MODIFY the previous SQL to satisfy the new request (add WHERE, GROUP BY, ORDER BY, JOINs, etc.)
4. For SELECT queries, include LIMIT 1000 if not specified
5. Return your response in this EXACT format:

SQL:
[Your SQL query here]

EXPLANATION:
[Brief explanation of what changed from the previous query]

WARNINGS:
[Any warnings or concerns about this query, or "None" if safe]

IMPORTANT: Do not include any markdown formatting, code blocks, or extra text. Follow the format exactly."""

    def _build_prompt(self, user_query: str, schema: str, operation_type: str) -> str:
        """Build prompt for SQL generation"""
        prompt = f"""You are an expert SQL assistant. Generate a MySQL query based on the user's natural language request.

{schema}

USER REQUEST: {user_query}

RULES:
1. Generate ONLY valid MySQL syntax
2. Use proper table and column names from the schema above
3. Do NOT use columns that don't exist in the schema
4. For SELECT queries, include LIMIT 1000 if not specified
5. For UPDATE/DELETE, ALWAYS include WHERE clause unless user explicitly says "all rows"
6. Use proper JOIN syntax when multiple tables are involved
7. Return your response in this EXACT format:

SQL:
[Your SQL query here]

EXPLANATION:
[Brief explanation of what this query does in plain English]

WARNINGS:
[Any warnings or concerns about this query, or "None" if safe]

IMPORTANT: Do not include any markdown formatting, code blocks, or extra text. Follow the format exactly."""

        return prompt
    
    def _parse_response(self, response_text: str) -> Dict:
        """Parse LLM response into structured format"""
        try:
            # Remove markdown code blocks if present
            response_text = response_text.replace('```sql', '').replace('```', '').strip()
            
            # Split by sections
            parts = response_text.split('\n\n')
            
            sql = None
            explanation = None
            warnings = None
            
            current_section = None
            for part in response_text.split('\n'):
                part = part.strip()
                
                if part.startswith('SQL:'):
                    current_section = 'sql'
                    sql = part.replace('SQL:', '').strip()
                elif part.startswith('EXPLANATION:'):
                    current_section = 'explanation'
                    explanation = part.replace('EXPLANATION:', '').strip()
                elif part.startswith('WARNINGS:'):
                    current_section = 'warnings'
                    warnings = part.replace('WARNINGS:', '').strip()
                elif current_section and part:
                    if current_section == 'sql':
                        sql = (sql + ' ' + part) if sql else part
                    elif current_section == 'explanation':
                        explanation = (explanation + ' ' + part) if explanation else part
                    elif current_section == 'warnings':
                        warnings = (warnings + ' ' + part) if warnings else part
            
            # Clean up SQL
            if sql:
                sql = sql.strip().rstrip(';')
            
            return {
                'success': True,
                'sql': sql,
                'explanation': explanation or "SQL query generated",
                'warnings': warnings or "None"
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f"Failed to parse LLM response: {str(e)}",
                'sql': None,
                'explanation': None,
                'warnings': None
            }

# Global LLM service instance
llm_service = LLMService()
