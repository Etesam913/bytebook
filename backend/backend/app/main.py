import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.endpoints.auth import auth_router
from starlette.middleware.sessions import SessionMiddleware

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins="*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(SessionMiddleware, secret_key=os.getenv('SECRET_KEY'))
app.include_router(auth_router)

@app.get("/")
def read_root():
    return {"Hello": "World"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
