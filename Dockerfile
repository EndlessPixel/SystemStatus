FROM python:3.9-slim

WORKDIR /app

COPY . .

# 安装依赖，排除wmi（仅Windows需要）
RUN grep -v "wmi" requirements.txt > requirements-linux.txt && pip install --no-cache-dir -r requirements-linux.txt && rm requirements-linux.txt

# 暴露端口
EXPOSE 8000

# 启动应用
CMD ["python", "main.py"]