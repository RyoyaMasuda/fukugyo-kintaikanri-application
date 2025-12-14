# template.yaml 解説書

## 概要

このファイルは、AWS SAM (Serverless Application Model) を使用して、勤怠管理アプリのバックエンドインフラストラクチャを定義するCloudFormationテンプレートです。

FastAPIアプリケーションをAWS Lambda上で実行し、Amazon DynamoDBにデータを保存する構成を定義しています。

---

## ファイル全体の構造

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: Attendance App Backend (FastAPI + DynamoDB)

Globals:
  # 全Lambda関数に適用される共通設定

Resources:
  # 作成するAWSリソースの定義

Outputs:
  # デプロイ後に出力される情報
```

---

## 1. ヘッダー部分

### AWSTemplateFormatVersion

```yaml
AWSTemplateFormatVersion: '2010-09-09'
```

- **説明:** CloudFormationテンプレートのフォーマットバージョンを指定します。
- **値:** `2010-09-09` は現在の標準バージョンです。変更する必要はありません。

### Transform

```yaml
Transform: AWS::Serverless-2016-10-31
```

- **説明:** SAMテンプレートであることを示すマクロです。
- **役割:** SAMがこのマクロを読み込むことで、`AWS::Serverless::Function` などの簡略化されたリソースタイプを使用できます。
- **注意:** この行がないと、SAMの機能が使えません。

### Description

```yaml
Description: Attendance App Backend (FastAPI + DynamoDB)
```

- **説明:** このテンプレートの説明文です。
- **用途:** AWSコンソールやコマンドラインで表示される説明として使用されます。

---

## 2. Globals セクション

```yaml
Globals:
  Function:
    Timeout: 10
    MemorySize: 128
    LoggingConfig:
      LogFormat: Text
```

### 概要

`Globals` セクションは、このテンプレート内の**すべてのLambda関数に共通して適用される設定**を定義します。

### Timeout: 10

- **説明:** Lambda関数の最大実行時間を秒単位で指定します。
- **値:** `10` 秒
- **意味:** 10秒以内に処理が終わらない場合、Lambdaはタイムアウトエラーを返します。
- **注意:** 最大値は900秒（15分）です。API Gatewayのタイムアウトは29秒なので、それより短く設定するのが一般的です。

### MemorySize: 128

- **説明:** Lambda関数に割り当てるメモリサイズをMB単位で指定します。
- **値:** `128` MB
- **注意点:**
  - メモリが多いほど、CPUパワーも比例して増えます。
  - 料金はメモリサイズと実行時間に基づいて計算されます。
  - 128MBは最小値で、コストを抑えたい場合に使用します。
  - FastAPIアプリの場合は、256MB以上を推奨する場合もあります。

### LoggingConfig: LogFormat: Text

- **説明:** CloudWatch Logsに出力されるログのフォーマットを指定します。
- **値:** `Text` (テキスト形式)
- **その他の選択肢:** `JSON` (JSON形式) も選択可能です。

---

## 3. Resources セクション

### 3.1 AttendanceTable (DynamoDBテーブル)

```yaml
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
```

#### Type: AWS::DynamoDB::Table

- **説明:** DynamoDBテーブルリソースを作成することを示します。

#### TableName: AttendanceTable

- **説明:** 作成されるDynamoDBテーブルの名前です。
- **注意:** この名前はAWSアカウント内で一意である必要があります。

#### BillingMode: PAY_PER_REQUEST

- **説明:** 従量課金モードを指定します。
- **意味:** 
  - 読み書きリクエスト数に応じて課金されます。
  - 事前にキャパシティを設定する必要がありません。
  - 小規模なアプリケーションや開発環境に適しています。
- **代替案:** `PROVISIONED` (プロビジョニング済み) モードもありますが、キャパシティユニットの設定が必要です。

#### AttributeDefinitions

- **説明:** テーブルのキーとして使用する属性（カラム）を定義します。
- **userId (AttributeType: S):**
  - `S` は String（文字列）型を意味します。
  - パーティションキー（HASH）として使用されます。
- **timestamp (AttributeType: S):**
  - ソートキー（RANGE）として使用されます。
  - ISO 8601形式の日時文字列（例: `2025-12-14T09:00:00`）を格納します。

#### KeySchema

- **説明:** テーブルの主キー構造を定義します。
- **userId (KeyType: HASH):**
  - **パーティションキー**（HASH）です。
  - データを物理的に分散させるために使用されます。
  - 同じ `userId` のデータは同じパーティションに保存されます。
- **timestamp (KeyType: RANGE):**
  - **ソートキー**（RANGE）です。
  - 同じパーティション内でデータを時系列順に並べるために使用されます。
  - これにより、特定ユーザーのデータを時系列で効率的に取得できます。

**設計のポイント:**
- `userId` でユーザーを特定し、`timestamp` で時系列順に並べることで、「ユーザーごとの勤怠履歴を時系列で取得する」というクエリが高速に実行できます。

---

### 3.2 FastAPIFunction (Lambda関数)

```yaml
FastAPIFunction:
  Type: AWS::Serverless::Function
  Properties:
    CodeUri: hello_world/
    Handler: app.handler
    Runtime: python3.12
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
```

#### Type: AWS::Serverless::Function

- **説明:** SAMが提供する簡略化されたLambda関数リソースタイプです。
- **利点:** 通常の `AWS::Lambda::Function` よりも簡単に設定できます。

#### CodeUri: hello_world/

- **説明:** Lambda関数のソースコードが格納されているディレクトリを指定します。
- **意味:** `hello_world/` フォルダ内のコードがLambda関数としてデプロイされます。
- **注意:** `sam build` コマンド実行時に、このディレクトリがビルドされます。

#### Handler: app.handler

- **説明:** Lambda関数のエントリーポイントを指定します。
- **形式:** `ファイル名.関数名`
- **意味:** `hello_world/app.py` ファイル内の `handler` 関数が呼び出されます。
- **注意:** FastAPIアプリの場合は、`Mangum` アダプターを使用して `handler = Mangum(app)` と定義します。

#### Runtime: python3.12

- **説明:** Lambda関数の実行環境（Pythonのバージョン）を指定します。
- **値:** `python3.12` (Python 3.12)
- **その他の選択肢:** `python3.9`, `python3.10`, `python3.11` など
- **注意:** ローカル環境のPythonバージョンと一致させる必要はありませんが、互換性を考慮することが推奨されます。

#### Architectures: x86_64

- **説明:** Lambda関数の実行アーキテクチャを指定します。
- **値:** `x86_64` (Intel/AMD 64ビット)
- **その他の選択肢:** `arm64` (ARM 64ビット、コストが約20%安い)
- **注意:** `arm64` を使用する場合は、依存ライブラリがARM対応している必要があります。

#### Environment: Variables: TABLE_NAME

```yaml
Environment:
  Variables:
    TABLE_NAME: !Ref AttendanceTable
```

- **説明:** Lambda関数の実行環境変数を設定します。
- **TABLE_NAME:** DynamoDBテーブル名を環境変数として渡します。
- **!Ref AttendanceTable:** CloudFormationの組み込み関数で、`AttendanceTable` リソースの物理ID（テーブル名）を参照します。
- **用途:** Pythonコード内で `os.environ.get('TABLE_NAME')` として取得できます。

#### Policies: DynamoDBCrudPolicy

```yaml
Policies:
  - DynamoDBCrudPolicy:
      TableName: !Ref AttendanceTable
```

- **説明:** Lambda関数に付与するIAMポリシーを定義します。
- **DynamoDBCrudPolicy:** SAMが提供する組み込みポリシーで、指定したDynamoDBテーブルに対する読み書き権限を付与します。
- **権限内容:**
  - `dynamodb:PutItem` (データ追加)
  - `dynamodb:GetItem` (データ取得)
  - `dynamodb:UpdateItem` (データ更新)
  - `dynamodb:DeleteItem` (データ削除)
  - `dynamodb:Query` (クエリ実行)
  - `dynamodb:Scan` (スキャン実行)
- **セキュリティ:** このテーブルに対してのみ権限が付与されるため、他のテーブルにはアクセスできません。

#### Events: ApiRoot と ApiProxy

```yaml
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
```

- **説明:** API Gatewayのエンドポイントを定義します。
- **ApiRoot:**
  - **Path:** `/` (ルートパス)
  - **Method:** `ANY` (すべてのHTTPメソッド: GET, POST, PUT, DELETEなど)
  - **用途:** ルートパス (`/`) へのリクエストをLambda関数にルーティングします。
- **ApiProxy:**
  - **Path:** `/{proxy+}` (すべてのパス)
  - **Method:** `ANY` (すべてのHTTPメソッド)
  - **用途:** ルートパス以外のすべてのパス（例: `/attendance`, `/docs`）へのリクエストをLambda関数にルーティングします。
  - **`{proxy+}` の意味:** ワイルドカードで、任意のパスとその下のパスすべてにマッチします。

**設計のポイント:**
- FastAPIアプリは複数のエンドポイント（`/`, `/attendance`, `/docs` など）を持つため、両方のイベント定義が必要です。
- `ApiRoot` だけだと `/attendance` などのパスにアクセスできません。
- `ApiProxy` だけだと `/` にアクセスできません。

---

## 4. Outputs セクション

```yaml
Outputs:
  AttendanceApiUrl:
    Description: "API Gateway endpoint URL"
    Value: !Sub "https://${ServerlessRestApi}.execute-api.${AWS::Region}.amazonaws.com/Prod/"
```

### 概要

`Outputs` セクションは、デプロイ完了後に出力される情報を定義します。

### AttendanceApiUrl

- **説明:** API GatewayのエンドポイントURLを出力します。
- **!Sub:** CloudFormationの組み込み関数で、文字列内の変数を置換します。
- **変数の意味:**
  - `${ServerlessRestApi}`: SAMが自動生成するAPI GatewayのID
  - `${AWS::Region}`: デプロイ先のAWSリージョン（例: `ap-northeast-1`）
- **出力例:** `https://abc123xyz.execute-api.ap-northeast-1.amazonaws.com/Prod/`
- **用途:** このURLをフロントエンドの設定ファイル（`.env.local`）に設定して使用します。

---

## まとめ

この `template.yaml` ファイルは、以下のAWSリソースを作成・設定します：

1. **DynamoDBテーブル (`AttendanceTable`)**
   - 勤怠データを保存するNoSQLデータベース
   - ユーザーIDとタイムスタンプをキーとして使用

2. **Lambda関数 (`FastAPIFunction`)**
   - FastAPIアプリケーションを実行するサーバーレス関数
   - DynamoDBへの読み書き権限を付与

3. **API Gateway**
   - HTTPリクエストをLambda関数にルーティングするAPIエンドポイント
   - 自動的に作成され、URLがOutputsに出力される

この構成により、サーバーレスアーキテクチャでスケーラブルなAPIバックエンドが構築されます。

