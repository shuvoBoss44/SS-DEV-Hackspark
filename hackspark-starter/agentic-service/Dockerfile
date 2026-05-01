# Stage 1: Builder
FROM python:3.11-slim AS builder
WORKDIR /app

# Create a virtual environment
RUN python -m venv /opt/venv
# Make sure we use the virtualenv
ENV PATH="/opt/venv/bin:$PATH"

# Install dependencies (Motor for Async MongoDB, FastAPI, LangChain, etc.)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Stage 2: Lean Runtime
FROM python:3.11-slim
WORKDIR /app

# Copy the virtual environment from the builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy your Python application code
COPY . .

EXPOSE 8004

# Run FastAPI server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8004"]