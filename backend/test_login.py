import requests
import json
import sys

def test_login(email, password):
    print(f"Testing login with email: {email}, password: {password}")
    
    url = "http://localhost:5000/auth/login"
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    
    payload = {
        "email": email,
        "password": password
    }
    
    try:
        print(f"Sending request to {url}...")
        print(f"Request payload: {payload}")
        response = requests.post(url, json=payload, headers=headers)
        
        print(f"Response status code: {response.status_code}")
        
        if response.status_code == 200:
            print("Login successful!")
            print(f"Response headers: {response.headers}")
            print(f"Response content: {response.text}")
            try:
                json_response = response.json()
                print(f"Token: {json_response.get('access_token', 'N/A')[:10]}...")
                return True
            except Exception as e:
                print(f"Error parsing JSON response: {str(e)}")
                print(f"Raw response: {response.text}")
                return False
        else:
            print(f"Login failed with status code: {response.status_code}")
            print(f"Response: {response.text}")
            return False
    except Exception as e:
        print(f"Request error: {str(e)}")
        return False

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python test_login.py <email> <password>")
        sys.exit(1)
    
    email = sys.argv[1]
    password = sys.argv[2]
    
    test_login(email, password) 