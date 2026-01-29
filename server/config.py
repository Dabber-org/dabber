from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    OPENAPI_URL: str
    SCRAPING_URL: str
    API_BASE_URL: str
    AGENT_ID: str
    DASHBOARD_URL: str
    IS_DYNAMIC_ENABLED: str
    IS_STATIC_ENABLED: str
    openai_api_key: str

settings = Settings(_env_file=".env")
