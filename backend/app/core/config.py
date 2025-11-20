from __future__ import annotations

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    project_name: str = "Newborn Health Tracking API"
    api_v1_prefix: str = "/api/v1"

    database_url: str = Field(
        default="mysql+aiomysql://user:password@localhost:3306/newborn_health",
        validation_alias="NB_DATABASE_URL",
    )
    database_echo: bool = False
    db_pool_size: int = 5
    db_max_overflow: int = 10

    cors_origins_raw: str = "http://localhost:3000"

    jwt_secret_key: str = "change-me"
    jwt_algorithm: str = "HS256"
    access_token_expires_minutes: int = 60 * 24

    google_audience_raw: str = ""

    @staticmethod
    def _split_csv(value: str) -> list[str]:
        return [item.strip() for item in value.split(",") if item.strip()]

    @property
    def cors_origins(self) -> list[str]:
        return self._split_csv(self.cors_origins_raw) or ["http://localhost:3000"]

    @property
    def google_audience(self) -> list[str]:
        return self._split_csv(self.google_audience_raw)


settings = Settings()
