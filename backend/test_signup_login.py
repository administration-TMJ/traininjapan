import requests
import time

BACKEND_URL = "https://japanrail.preview.emergentagent.com"
API = f"{BACKEND_URL}/api"

# Test signup
timestamp = int(time.time())
signup_data = {
    "name": "Test User Signup",
    "email": f"testsignup{timestamp}@example.com",
    "password": "password123"
}

print("Testing Signup...")
signup_response = requests.post(f"{API}/auth/signup", json=signup_data, timeout=10)
print(f"Signup status: {signup_response.status_code}")

if signup_response.status_code == 200:
    print("✓ Signup successful")
    result = signup_response.json()
    print(f"  User: {result.get('user', {}).get('name')} ({result.get('user', {}).get('email')})")
    
    # Now try to login with same credentials
    print("\nTesting Login with signup credentials...")
    login_data = {
        "email": signup_data["email"],
        "password": signup_data["password"]
    }
    
    login_response = requests.post(f"{API}/auth/login", json=login_data, timeout=10)
    print(f"Login status: {login_response.status_code}")
    
    if login_response.status_code == 200:
        print("✓ Login successful")
        result = login_response.json()
        print(f"  User: {result.get('user', {}).get('name')} ({result.get('user', {}).get('email')})")
    else:
        print("✗ Login failed")
        print(f"  Error: {login_response.text}")
else:
    print("✗ Signup failed")
    print(f"  Error: {signup_response.text}")
