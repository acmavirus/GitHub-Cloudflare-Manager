import sys
import os
import time
import threading
import httpx
import webview
import uvicorn
import asyncio
from fastapi import FastAPI, Request, Response
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

# Ensure WindowsProactorEventLoopPolicy if on Windows
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

# Setup FastAPI App
app = FastAPI()

# Locate dist folder (works when running normally or inside PyInstaller executable)
if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
    BASE_DIR = sys._MEIPASS
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DIST_DIR = os.path.join(BASE_DIR, "dist")

async_client = httpx.AsyncClient()

@app.api_route("/cf-api/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"])
async def proxy_cf(path: str, request: Request):
    url = f"https://api.cloudflare.com/client/v4/{path}"
    
    # Forward query parameters
    params = dict(request.query_params)
    
    # Forward headers
    headers = {}
    for k, v in request.headers.items():
        if k.lower() not in ["host", "content-length"]:
            headers[k] = v
            
    # Set/Override headers matching vite.config.js
    headers["Origin"] = "https://api.cloudflare.com"
    
    # Read request body
    body = await request.body()
    
    try:
        response = await async_client.request(
            method=request.method,
            url=url,
            headers=headers,
            params=params,
            content=body,
            timeout=30.0
        )
        
        # Exclude response headers that should not be forwarded
        resp_headers = {}
        for k, v in response.headers.items():
            if k.lower() not in ["content-encoding", "transfer-encoding", "content-length"]:
                resp_headers[k] = v
                
        return Response(
            content=response.content,
            status_code=response.status_code,
            headers=resp_headers
        )
    except Exception as e:
        return Response(content=f"Proxy error: {str(e)}", status_code=500)

@app.api_route("/indexnow-api/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"])
async def proxy_indexnow(path: str, request: Request):
    url = f"https://api.indexnow.org/{path}"
    
    params = dict(request.query_params)
    headers = {}
    for k, v in request.headers.items():
        if k.lower() not in ["host", "content-length"]:
            headers[k] = v
            
    body = await request.body()
    
    try:
        response = await async_client.request(
            method=request.method,
            url=url,
            headers=headers,
            params=params,
            content=body,
            timeout=30.0
        )
        
        resp_headers = {}
        for k, v in response.headers.items():
            if k.lower() not in ["content-encoding", "transfer-encoding", "content-length"]:
                resp_headers[k] = v
                
        return Response(
            content=response.content,
            status_code=response.status_code,
            headers=resp_headers
        )
    except Exception as e:
        return Response(content=f"Proxy error: {str(e)}", status_code=500)

@app.get("/fetch-url")
async def fetch_url(url: str = ""):
    if not url:
        return Response(content="Missing url parameter", status_code=400)
    try:
        response = await async_client.get(
            url,
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout=15.0
        )
        content_type = response.headers.get('content-type', 'text/plain')
        
        resp_headers = {
            'Content-Type': content_type,
            'Access-Control-Allow-Origin': '*'
        }
        return Response(
            content=response.content,
            status_code=response.status_code,
            headers=resp_headers
        )
    except Exception as e:
        return Response(content=f"Error fetching URL: {str(e)}", status_code=500)

# Serve the static files
# Root path loads index.html
@app.get("/")
async def read_root():
    index_path = os.path.join(DIST_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return Response(content="Build folder 'dist' not found or empty. Please run 'npm run build' first.", status_code=404)

# Serve static files for assets
if os.path.exists(DIST_DIR):
    app.mount("/", StaticFiles(directory=DIST_DIR), name="static")

class ServerThread(threading.Thread):
    def __init__(self):
        super().__init__(daemon=True)
        config = uvicorn.Config(
            app,
            host="127.0.0.1",
            port=8901,
            log_level="info",
            loop="asyncio"
        )
        self.server = uvicorn.Server(config)

    def run(self):
        self.server.run()

    def stop(self):
        self.server.should_exit = True

def wait_for_server(url, timeout=15):
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            resp = httpx.get(url, timeout=1.0)
            if resp.status_code in [200, 404]: # 404 is also fine (means server is up but dist index.html might not be built yet)
                return True
        except Exception:
            pass
        time.sleep(0.2)
    return False

def on_closed():
    print("Desktop window closed. Shutting down server...")
    server_thread.stop()

if __name__ == "__main__":
    print("Starting background API & Static server...")
    server_thread = ServerThread()
    server_thread.start()

    url = "http://127.0.0.1:8901"
    if wait_for_server(url):
        print("Server is ready. Launching WebView...")
        # Create webview window
        window = webview.create_window(
            "GITCORE — Premium Dev & Site Management Hub",
            url=url,
            width=1280,
            height=800,
            min_size=(1024, 700),
            resizable=True
        )
        # Register window close callback
        window.events.closed += on_closed
        
        # Start webview loop (blocks until window is closed)
        # Disable private_mode to persist localStorage and cookies, and use a custom storage path to avoid conflicts
        appdata_dir = os.environ.get('APPDATA')
        storage_path = os.path.join(appdata_dir, "GitCoreManager") if appdata_dir else None
        webview.start(private_mode=False, storage_path=storage_path)
        
        # In case the closed event didn't trigger, stop the server
        server_thread.stop()
    else:
        print("Error: Local server failed to start in time.")
        sys.exit(1)
