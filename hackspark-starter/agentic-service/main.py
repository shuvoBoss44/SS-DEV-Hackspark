from fastapi import FastAPI

app = FastAPI()

# This is the endpoint the API Gateway and Docker Healthcheck will call
@app.get("/status")
def read_status():
    return {"service": "agentic-service", "status": "OK"}