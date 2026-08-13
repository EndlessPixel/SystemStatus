FROM python:3.12.13-bookworm

WORKDIR /app

COPY requirements-unix.txt .

RUN pip install --no-cache-dir -r requirements-unix.txt

COPY . .

EXPOSE 8001
CMD ["python", "main.py"]