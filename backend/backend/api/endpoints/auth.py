from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse, RedirectResponse
import httpx
import os
import urllib.parse

GITHUB_CLIENT_ID = os.getenv('GITHUB_CLIENT_ID')
GITHUB_CLIENT_SECRET = os.getenv('GITHUB_CLIENT_SECRET')
GITHUB_REDIRECT_URI = os.getenv('GITHUB_REDIRECT_URI')

auth_router = APIRouter(
    prefix="/auth",
    tags=["GitHub"],
    responses={404: {"description": "Not found"}},
)

@auth_router.get("/github")
async def login_to_github():
    url_base = "https://github.com/login/oauth/authorize"
    url_params = {
        "client_id": GITHUB_CLIENT_ID
    }

    github_authorize_url = url_base + "?" + urllib.parse.urlencode(url_params)
    return RedirectResponse(github_authorize_url)
    
@auth_router.get("/github/callback")
async def github_callback(request: Request):
    code = request.query_params.get('code')
    if not code:
        return JSONResponse({'error': 'Authorization code not provided'}, status_code=400)
    
    try:
        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                url='https://github.com/login/oauth/access_token',
                headers={'Accept': 'application/json'},
                data={
                    'client_id': GITHUB_CLIENT_ID,
                    'client_secret': GITHUB_CLIENT_SECRET,
                    'code': code,
                    'redirect_uri': GITHUB_REDIRECT_URI
                }
            )
            token_response_json = token_response.json()
            print(token_response_json)
            access_token = token_response_json.get('access_token')
            request.session['access_token'] = access_token
            
            if not access_token:
                return JSONResponse({'error': 'Access token not received'}, status_code=400)
            user_response = await client.get(
                'https://api.github.com/user',
                headers={'Authorization': f'Bearer {access_token}'}
            )
            user_data = user_response.json()
            request.session['user_data'] = user_data

            # You can save the user info to the database here
            return JSONResponse(user_data)
    
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

