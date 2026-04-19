from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from server.api.routes import router

app = FastAPI(
    title="Productive Doomscrolling API",
    description="Backend AI pipeline bridging YouTube logic with Gemini 2.5 Flash Segmentation",
    version="1.0.0"
)

# Allow our future React/Vite development server to connect locally
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/v1")

@app.get("/health")
async def health_check():
    return {"status": "ok", "message": "Productive Doomscrolling API is alive!"}

if __name__ == "__main__":
    import uvicorn
    # When run directly, spin up uvicorn mapped to the internal app scope
    uvicorn.run("server.main:app", host="0.0.0.0", port=8000, reload=True)
