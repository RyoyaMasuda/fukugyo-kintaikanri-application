# 副業用勤怠管理アプリ 開発詳細手順書 (バックエンド編)

## 概要

FastAPI (Python) を使用してAPIを作成し、AWS SAM を使って AWS Lambda と Amazon DynamoDB にデプロイ（構築）します。

## 前提

親フォルダ「my-work-app」の中にいる状態から開始します。

既に「frontend」フォルダがある隣に、「backend」フォルダを作成します。

---

## 【前提条件】 必要なツールのインストールと設定

### 1. Pythonのインストール確認

Python 3.9以上がインストールされていることを確認します。

コマンド:

```bash
python3 --version
```

または

```bash
python --version
```

※Pythonがインストールされていない場合は、[Python公式サイト](https://www.python.org/downloads/)からインストールしてください。

### 2. AWS CLIのインストール

AWS CLIがインストールされていることを確認します。

コマンド:

```bash
aws --version
```

※AWS CLIがインストールされていない場合:

**macOS (Homebrew使用):**

```bash
brew install awscli
```

**macOS (インストーラー使用):**

```bash
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
sudo installer -pkg AWSCLIV2.pkg -target /
```

**Linux:**

```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

**Windows:**

[公式インストーラー](https://awscli.amazonaws.com/AWSCLIV2.msi)をダウンロードして実行してください。

### 3. AWS CLIの設定

AWS認証情報を設定します。

コマンド:

```bash
aws configure
```

以下の情報を入力します：

- AWS Access Key ID: (AWSコンソールで取得したアクセスキー)
- AWS Secret Access Key: (AWSコンソールで取得したシークレットキー)
- Default region name: `ap-northeast-1` (または使用したいリージョン)
- Default output format: `json`

※AWS認証情報の取得方法:
1. AWSコンソールにログイン
2. 右上のユーザー名をクリック → 「セキュリティ認証情報」
3. 「アクセスキー」セクションで「アクセスキーを作成」をクリック

### 4. SAM CLIのインストール

AWS SAM CLIがインストールされていることを確認します。

コマンド:

```bash
sam --version
```

※SAM CLIがインストールされていない場合:

**macOS (Homebrew使用):**

```bash
brew install aws-sam-cli
```

**macOS (インストーラー使用):**

```bash
brew tap aws/tap
brew install aws-sam-cli
```

**Linux:**

```bash
wget https://github.com/aws/aws-sam-cli/releases/latest/download/aws-sam-cli-linux-x86_64.zip
unzip aws-sam-cli-linux-x86_64.zip -d sam-installation
sudo ./sam-installation/install
```

**Windows:**

```powershell
# Chocolateyを使用する場合
choco install aws-sam-cli

# または、インストーラーをダウンロード
# https://github.com/aws/aws-sam-cli/releases から最新版をダウンロード
```

### 5. SAM CLIの動作確認

インストールが正しく完了したか確認します。

コマンド:

```bash
sam --version
```

正常にインストールされていれば、バージョン番号が表示されます。

---

## 【手順1】 プロジェクトの作成と初期化

1. バックエンド用のフォルダを作成して移動します。

   コマンド:

   ```bash
   mkdir backend
   cd backend
   ```

2. AWS SAM プロジェクトを初期化します。

   コマンド:

   ```bash
   sam init
   ```

   ※実行時の質問には以下のように回答してください：

   - Which template source would you like to use? ... 1 (AWS Quick Start Templates)
   - Choose an AWS Quick Start application template ... 1 (Hello World Example)
   - Use the most popular runtime and package type? ... N (No)
   - Which runtime would you like to use? ... (お使いのPCのPythonバージョンを選択: 例 python3.11)
   - What package type would you like to use? ... 1 (Zip)
   - Would you like to enable X-Ray tracing...? ... N
   - Would you like to enable monitoring using CloudWatch...? ... N
   - Would you like to set Structured Logging...? ... N
   - Project name ... attendance-api

3. 作成されたフォルダに移動します。

   コマンド:

   ```bash
   cd attendance-api
   ```

---

## 【手順2】 AWS構成ファイル (template.yaml) の作成

AWSのインフラ（DynamoDBやLambdaの設定）を定義します。

**ファイルパス:**

`backend/attendance-api/template.yaml`

**記述内容 (ファイルの中身を全て以下に書き換えてください):**

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: Attendance App Backend (FastAPI + DynamoDB)

Globals:
  Function:
    Timeout: 10
    MemorySize: 128
    LoggingConfig:
      LogFormat: Text

Resources:
  # 1. 勤怠データを保存するDynamoDBテーブル
  AttendanceTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: AttendanceTable
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: userId
          AttributeType: S
        - AttributeName: timestamp
          AttributeType: S
      KeySchema:
        - AttributeName: userId
          KeyType: HASH
        - AttributeName: timestamp
          KeyType: RANGE

  # 2. FastAPIを動かすLambda関数
  FastAPIFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: hello_world/
      Handler: app.handler
      # ※注意: 下のRuntimeはご自身のPCのPythonバージョンに合わせて書き換えてください
      # 例: python3.9, python3.10, python3.11, python3.12
      Runtime: python3.11
      Architectures:
        - x86_64
      Environment:
        Variables:
          TABLE_NAME: !Ref AttendanceTable
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref AttendanceTable
      Events:
        ApiRoot:
          Type: Api
          Properties:
            Path: /
            Method: ANY
        ApiProxy:
          Type: Api
          Properties:
            Path: /{proxy+}
            Method: ANY

Outputs:
  AttendanceApiUrl:
    Description: "API Gateway endpoint URL"
    Value: !Sub "https://${ServerlessRestApi}.execute-api.${AWS::Region}.amazonaws.com/Prod/"
```

---

## 【手順3】 必要なライブラリの定義

APIを動かすために必要な Python ライブラリを指定します。

**ファイルパス:**

`backend/attendance-api/hello_world/requirements.txt`

**記述内容 (ファイルの中身を全て以下に書き換えてください):**

```
fastapi
mangum
boto3
```

---

## 【手順4】 APIプログラム (app.py) の作成

FastAPIを使って、打刻データの保存と取得を行うプログラムを書きます。

**ファイルパス:**

`backend/attendance-api/hello_world/app.py`

**記述内容 (ファイルの中身を全て以下に書き換えてください):**

```python
import os
import boto3
from fastapi import FastAPI
from mangum import Mangum
from pydantic import BaseModel
from boto3.dynamodb.conditions import Key

app = FastAPI()

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

# 打刻データを保存する (POST)
@app.post("/attendance")
def create_attendance(item: AttendanceItem):
    table.put_item(Item=item.dict())
    return {"message": "Recorded successfully", "data": item}

# ユーザーごとの履歴を取得する (GET)
@app.get("/attendance/{user_id}")
def get_attendance(user_id: str):
    response = table.query(
        KeyConditionExpression=Key('userId').eq(user_id)
    )
    return {"items": response.get('Items', [])}

# Lambda用のアダプター
handler = Mangum(app)
```

---

## 【手順5】 ビルドとデプロイ

1. ビルド（準備）を行います。

   コマンド:

   ```bash
   sam build
   ```

   ※最後に「Build Succeeded」と表示されればOKです。

2. デプロイ（AWSへのアップロード）を行います。

   コマンド:

   ```bash
   sam deploy --guided
   ```

   ※質問には以下のように入力してください：

   - Stack Name: attendance-backend-stack
   - AWS Region: ap-northeast-1  (または us-west-2 など)
   - Confirm changes before deploy: y
   - Allow SAM CLI IAM role creation: y
   - Disable rollback: n
   - FastAPIFunction has no authentication...: y  (★重要: 必ず y を入力)
   - Save arguments to configuration file: y
   - SAM configuration file: (エンター)
   - SAM configuration environment: (エンター)

   ※最後に「Deploy this changeset? [y/N]」と聞かれたら y を入力します。

---

## 【手順6】 動作確認

デプロイ完了後、ターミナルの Outputs に表示された URL (Value) を確認します。

例: `https://xxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/Prod/`

1. ブラウザで上記 URL の末尾に `/docs` をつけてアクセスします。

   例: `https://.../Prod/docs`

2. Swagger UI (APIテスト画面) が表示されることを確認します。

3. 「POST /attendance」を開き、「Try it out」→「Execute」を実行して、Code 200 (Recorded successfully) が返ってくればデータベース連携成功です。

