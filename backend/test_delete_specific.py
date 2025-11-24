import requests

BACKEND_URL = "https://japanrail.preview.emergentagent.com"
API = f"{BACKEND_URL}/api"

# Login as admin
login_data = {
    "email": "administration@traininjapan.com",
    "password": "admin123"
}
response = requests.post(f"{API}/auth/login", json=login_data, timeout=10)

if response.status_code == 200:
    cookies = response.headers.get('Set-Cookie', '')
    if 'session_token=' in cookies:
        token_start = cookies.find('session_token=') + len('session_token=')
        token_end = cookies.find(';', token_start)
        if token_end == -1:
            token_end = len(cookies)
        admin_token = cookies[token_start:token_end]
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get all users
        users_response = requests.get(f"{API}/admin/users", headers=headers, timeout=10)
        users = users_response.json()
        
        # Find the "Test Admin" user (role: student, should be safe to delete)
        target_user = None
        for user in users:
            if user.get('email') == 'admin1763782983701@test.com':
                target_user = user
                break
        
        if target_user:
            print(f"Attempting to delete user: {target_user.get('name')} ({target_user.get('email')})")
            print(f"User ID: {target_user.get('id')}")
            
            # Try to delete
            delete_response = requests.delete(f"{API}/admin/users/{target_user.get('id')}", headers=headers, timeout=10)
            print(f"\nDelete response status: {delete_response.status_code}")
            print(f"Delete response: {delete_response.text}")
            
            # Verify user was deleted
            verify_response = requests.get(f"{API}/admin/users", headers=headers, timeout=10)
            if verify_response.status_code == 200:
                remaining_users = verify_response.json()
                still_exists = any(u.get('id') == target_user.get('id') for u in remaining_users)
                if still_exists:
                    print("\n❌ User still exists after delete")
                else:
                    print("\n✅ User successfully deleted")
        else:
            print("Target user not found")
