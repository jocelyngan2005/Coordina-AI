"""
core/config.py — centralised settings loaded from environment variables.
"""

from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # Z.AI GLM
    ZAI_API_KEY: str
    ZAI_API_BASE_URL: str = "https://api.ilmu.ai/v1"
    ZAI_MODEL: str = "ilmu-glm-5.1"

    # Database
    DATABASE_URL: str

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # App
    APP_ENV: str = "development"
    APP_SECRET_KEY: str = "change_me"
    CORS_ORIGINS: List[str] = ["http://localhost:5173"]

    # File uploads
    MAX_UPLOAD_SIZE_MB: int = 20
    UPLOAD_DIR: str = "./uploads"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()