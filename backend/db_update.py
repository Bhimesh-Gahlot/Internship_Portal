#!/usr/bin/env python
import os
import pymysql
import logging
from config import Config

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def execute_sql_file(file_path, connection):
    """Execute SQL statements from a file."""
    try:
        with open(file_path, 'r') as f:
            sql_file = f.read()
            
        # Split the SQL file into individual statements
        sql_commands = sql_file.split(';')
        
        with connection.cursor() as cursor:
            for command in sql_commands:
                # Skip empty statements
                if command.strip():
                    try:
                        cursor.execute(command)
                        logger.info(f"Executed: {command[:50]}...")
                    except Exception as e:
                        logger.warning(f"Command failed: {command[:50]}... Error: {str(e)}")
        
        connection.commit()
        logger.info(f"Successfully executed SQL file: {file_path}")
        return True
    
    except Exception as e:
        logger.error(f"Failed to execute SQL file: {file_path}. Error: {str(e)}")
        connection.rollback()
        return False

def update_database():
    """Update the database schema."""
    try:
        # Connect to the database
        connection = pymysql.connect(
            host=Config.MYSQL_HOST,
            user=Config.MYSQL_USER,
            password=Config.MYSQL_PASSWORD,
            database=Config.MYSQL_DB,
            charset='utf8mb4',
            cursorclass=pymysql.cursors.DictCursor
        )
        
        logger.info("Connected to the database")
        
        # Execute the SQL migration script
        script_dir = os.path.dirname(os.path.abspath(__file__))
        sql_file_path = os.path.join(script_dir, 'db_migrate.sql')
        
        if execute_sql_file(sql_file_path, connection):
            logger.info("Database schema updated successfully")
        else:
            logger.error("Failed to update database schema")
        
        # Close the connection
        connection.close()
        logger.info("Database connection closed")
        
    except Exception as e:
        logger.error(f"Database update failed: {str(e)}")

if __name__ == "__main__":
    logger.info("Starting database update...")
    update_database()
    logger.info("Database update process completed") 