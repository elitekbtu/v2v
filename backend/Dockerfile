FROM python:3.11-slim

WORKDIR /app

# Install Python dependencies
COPY requirements.txt ./
ENV PIP_DEFAULT_TIMEOUT=100
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"] 