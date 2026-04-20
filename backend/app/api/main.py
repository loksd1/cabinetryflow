from fastapi import APIRouter

from app.api.routes import auth, employees, files, logs, projects, tasks, utils

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(employees.router)
api_router.include_router(projects.router)
api_router.include_router(tasks.router)
api_router.include_router(logs.router)
api_router.include_router(utils.router)
api_router.include_router(files.router)
