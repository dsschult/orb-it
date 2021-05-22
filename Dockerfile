FROM python:3.8

RUN pip install --upgrade pip

COPY requirements.txt ./

RUN pip install --no-cache-dir -r requirements.txt

RUN adduser -D app
USER app
WORKDIR /home/app

COPY --chown=app:app . .

CMD [ "python", "server.py" ]
