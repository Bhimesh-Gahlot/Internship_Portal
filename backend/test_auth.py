import pymysql
import json

# This is a minimal test script to debug login issues

def test_database_connection():
    """Test direct database connection and query"""
    try:
        print("Testing database connection...")
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='yoyobheemsa',
            database='internship_portal'
        )
        
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        # Check if users table exists
        cursor.execute("SHOW TABLES LIKE 'users'")
        if not cursor.fetchone():
            print("ERROR: 'users' table does not exist!")
            return False
            
        # Check for users
        cursor.execute("SELECT id, email, password, role FROM users")
        users = cursor.fetchall()
        
        print(f"Found {len(users)} users in database")
        for user in users:
            # Only print partial password for security
            user_info = {
                'id': user['id'],
                'email': user['email'],
                'password': user['password'][:5] + '****' if user['password'] else None,
                'role': user['role']
            }
            print(f"User: {json.dumps(user_info)}")
            
        conn.close()
        print("Database connection test completed successfully")
        return True
        
    except Exception as e:
        print(f"Database connection test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    # Run tests
    print("Starting auth testing...")
    db_test = test_database_connection()
    
    if db_test:
        print("\nSUCCESS: Database connection and user query successful")
        print("\nLogin instructions for fixing the 500 error:")
        print("1. Check that all users have valid passwords in the database")
        print("2. Try using a known valid email/password from the printed users above")
        print("3. Make sure your frontend is using the correct URL: http://localhost:5000/auth/login")
        print("\nIf you still encounter issues, check the server logs for more detailed error information")
    else:
        print("\nFAILED: Database connection or user query failed")
        print("Please check your database configuration and make sure it's running")
    
    print("\nTest completed") 