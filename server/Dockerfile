FROM python:3.13-slim AS core

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
ENV UV_PROJECT_ENVIRONMENT="/venv"
ENV UV_LINK_MODE=copy
ENV PATH="$UV_PROJECT_ENVIRONMENT/bin:$PATH"
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --frozen --no-cache --no-install-project

# Install Playwright browsers and system dependencies
RUN playwright install --with-deps chromium
WORKDIR /src

COPY . .

FROM core AS production
EXPOSE 8000 
ENV PYTHONPATH=.
ENTRYPOINT ["python", "server.py"]