import requests

BACKEND_URL = "https://japanrail.preview.emergentagent.com"
API = f"{BACKEND_URL}/api"

# Login as admin
login_data = {
    "email": "administration@traininjapan.com",
    "password": "admin123"
}
response = requests.post(f"{API}/auth/login", json=login_data, timeout=10)
print(f"Login: {response.status_code}")

if response.status_code == 200:
    # Extract session token
    cookies = response.headers.get('Set-Cookie', '')
    if 'session_token=' in cookies:
        token_start = cookies.find('session_token=') + len('session_token=')
        token_end = cookies.find(';', token_start)
        if token_end == -1:
            token_end = len(cookies)
        admin_token = cookies[token_start:token_end]
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get all users first
        users_response = requests.get(f"{API}/admin/users", headers=headers, timeout=10)
        print(f"\nGet users: {users_response.status_code}")
        
        if users_response.status_code == 200:
            users = users_response.json()
            print(f"Found {len(users)} users")
            
            # Find a test user (not admin)
            test_user = None
            for user in users:
                if user.get('email') == 'testuser@example.com':
                    test_user = user
                    break
            
            if test_user:
                print(f"\nFound test user: {test_user.get('name')} (ID: {test_user.get('id')})")
                
                # Try to delete
                delete_response = requests.delete(f"{API}/admin/users/{test_user.get('id')}", headers=headers, timeout=10)
                print(f"Delete response: {delete_response.status_code}")
                print(f"Delete response body: {delete_response.text}")
            else:
                print("\nNo test user found to delete")
                print("Available users:")
                for user in users[:5]:
                    print(f"  - {user.get('name')} ({user.get('email')}) - Role: {user.get('role')}")
        else:
            print(f"Failed to get users: {users_response.text}")
else:
    print(f"Login failed: {response.text}")
