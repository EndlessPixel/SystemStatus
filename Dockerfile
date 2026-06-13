FROM python:3.12.13-bookworm

WORKDIR /app

COPY requirements.txt .

RUN grep -v "wmi" requirements.txt > requirements-linux.txt \
    && pip install --no-cache-dir -r requirements-linux.txt \
    && rm requirements-linux.txt

COPY . .

EXPOSE 8001
CMD ["python", "main.py"]