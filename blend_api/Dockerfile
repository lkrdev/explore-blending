FROM python:3.12-slim
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Set working directory and create necessary directories with proper permissions
WORKDIR /app

# Copy dependency files
COPY pyproject.toml uv.lock ./
COPY . .
ENV UV_PROJECT_ENVIRONMENT="/usr/local/"
RUN uv sync --frozen --no-dev

CMD ["uv", "run", "functions-framework", "--target=main"]