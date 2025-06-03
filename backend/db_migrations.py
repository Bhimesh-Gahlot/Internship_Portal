import os
import pymysql
import glob

def run_migrations():
    """Run all SQL migration scripts in the migrations directory"""
    try:
        print("Running database migrations...")
        # Connect to the database
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='yoyobheemsa',
            database='internship_portal'
        )
        cursor = conn.cursor()
        
        # Get migration scripts from the migrations directory
        migration_dir = os.path.join(os.path.dirname(__file__), 'migrations')
        if not os.path.exists(migration_dir):
            os.makedirs(migration_dir)
            print(f"Created migrations directory at {migration_dir}")
        
        # Get all .sql files in the migrations directory
        sql_files = glob.glob(os.path.join(migration_dir, '*.sql'))
        if not sql_files:
            print("No migration files found")
            return
        
        # Create migrations table to track which migrations have been run
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS migrations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                filename VARCHAR(255) NOT NULL,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_filename (filename)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        """)
        
        # Get list of already applied migrations
        cursor.execute("SELECT filename FROM migrations")
        applied_migrations = [row[0] for row in cursor.fetchall()]
        
        # Run each migration file that hasn't been applied yet
        for sql_file in sorted(sql_files):
            filename = os.path.basename(sql_file)
            if filename in applied_migrations:
                print(f"Migration {filename} already applied, skipping")
                continue
            
            print(f"Applying migration: {filename}")
            with open(sql_file, 'r') as f:
                sql = f.read()
                
            # Execute the SQL commands
            cursor.execute(sql)
            
            # Record that this migration has been applied
            cursor.execute("INSERT INTO migrations (filename) VALUES (%s)", (filename,))
            conn.commit()
            print(f"Migration {filename} applied successfully")
        
        cursor.close()
        conn.close()
        print("Database migrations completed")
    except Exception as e:
        print(f"Error running migrations: {str(e)}")
        import traceback
        traceback.print_exc()
        
if __name__ == "__main__":
    # Can be run directly to apply migrations
    run_migrations() 