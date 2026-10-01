# Backend image for the Departmental Payment Tracking API.
#
# Optional alternative to the Render native Python runtime (see render.yaml).
# Build from the repo root:  docker build -t dpt-backend ./backend
# Local all-in-one:          docker compose up --build     (uses ../docker-compose.yml)
#
# python:3.12-slim matches PYTHON_VERSION in render.yaml. psycopg2-binary ships a
# manylinux wheel, so no compiler/toolchain is needed in the image.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Dependencies first: this layer is cached until requirements.txt changes.
COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

# Application code.
COPY . .

# Normalise line endings (a Windows checkout can hand us CRLF, which breaks the
# shell entrypoint) and make it executable.
RUN sed -i 's/\r$//' entrypoint.sh && chmod +x entrypoint.sh

# Gunicorn listens here. The host maps this port.
EXPOSE 8000

# apply migrations + collectstatic, then serve (see entrypoint.sh)
ENTRYPOINT ["./entrypoint.sh"]
