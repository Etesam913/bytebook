from fastapi import APIRouter

github_router = APIRouter(
    prefix="/github",
    tags=["GitHub"],
    responses={404: {"description": "Not found"}},
)

@github_router.get("/login")
async def login_to_github():
   return {"Hello": "Etesam"}

