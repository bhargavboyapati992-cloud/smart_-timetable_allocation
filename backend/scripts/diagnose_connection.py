import requests
import time

def check_local():
    print("Checking Local Backend (8080)...")
    try:
        r = requests.get("http://localhost:8080/", timeout=5)
        print(f"Local Backend is UP: {r.json()}")
        return True
    except Exception as e:
        print(f"Local Backend is DOWN: {e}")
        return False

def check_public():
    print("\nChecking Public Tunnel (ngrok)...")
    url = "https://factor-driven-kooky.ngrok-free.dev/"
    try:
        r = requests.get(url, headers={"ngrok-skip-browser-warning": "true"}, timeout=10)
        try:
            print(f"Public Tunnel is UP: {r.json()}")
            return True
        except:
            print(f"Public Tunnel is UP but NOT JSON. Received HTML instead.")
            print(f"First 200 chars: {r.text[:200]}")
            return False
    except Exception as e:
        print(f"Public Tunnel is DOWN: {e}")
        return False

if __name__ == "__main__":
    print("VIMS Connectivity Diagnostic Tool")
    print("================================")
    l = check_local()
    if l:
        check_public()
    else:
        print("\nFix the Local Backend first!")
