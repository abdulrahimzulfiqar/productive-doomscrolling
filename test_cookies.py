import http.cookiejar
try:
    cookie_jar = http.cookiejar.MozillaCookieJar("www.youtube.com_cookies.txt")
    cookie_jar.load(ignore_discard=True, ignore_expires=True)
    print("✅ Loaded cookies successfully! Found", len(cookie_jar))
except Exception as e:
    print("❌ Failed:", type(e).__name__, e)
