from db_update import run_migrations
import sys

if __name__ == "__main__":
    print("Running database migrations...")
    success = run_migrations()
    if success:
        print("All migrations completed successfully")
    else:
        print("Some migrations failed")
        sys.exit(1) 