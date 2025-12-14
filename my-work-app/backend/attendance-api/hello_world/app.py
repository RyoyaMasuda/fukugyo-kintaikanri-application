import os
import boto3
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
from pydantic import BaseModel
from boto3.dynamodb.conditions import Key

app = FastAPI(root_path="/Prod")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# DynamoDBの設定
dynamodb = boto3.resource('dynamodb')
table_name = os.environ.get('TABLE_NAME', 'AttendanceTable')
table = dynamodb.Table(table_name)

# データ形式の定義
class AttendanceItem(BaseModel):
    userId: str
    timestamp: str
    type: str

@app.get("/")
def read_root():
    return {"message": "Hello from FastAPI Backend!"}

# 打刻する (POST)
@app.post("/attendance")
def create_attendance(item: AttendanceItem):
    table.put_item(Item=item.dict())
    return {"message": "Recorded successfully", "data": item}

# 履歴を見る (GET)
@app.get("/attendance/{user_id}")
def get_attendance(user_id: str):
    response = table.query(
        KeyConditionExpression=Key('userId').eq(user_id)
    )
    return {"items": response.get('Items', [])}

handler = Mangum(app)