# FastAPI + AWS API Gateway (Lambda) 連携時の重要ポイント

## 1. root_path の設定が必要な理由

AWS API Gateway では、URLの末尾に「ステージ名」がつきます。

(例: `https://xxx.amazonaws.com/Prod/`)

しかし、FastAPI は自分が「/Prod/」の下にいることをデフォルトでは知りません。

そのため、Swagger UI (自動ドキュメント) が設定ファイルを読みに行く際に、「/Prod/openapi.json」ではなく「/openapi.json」を探しに行ってしまい、403 Forbidden エラーが発生します。

**[対策]**

FastAPIの初期化時に `root_path` を指定することで、「自分は /Prod の下にいる」と認識させます。

```python
app = FastAPI(root_path="/Prod")
```

---

## 2. ステージ名を変える場合

もし将来、AWS側のステージ名を「Prod」から「Dev」や「v1」などに変更した場合は、Pythonコード内の `root_path` も合わせて書き換える必要があります。

例:

```python
app = FastAPI(root_path="/Dev")
```

---

## 3. ローカル実行 (uvicorn) との違い

手元のPCで `uvicorn app:app --reload` で動かす場合、通常はURLにステージ名 (/Prod) はつきません。

(例: `http://127.0.0.1:8000/docs`)

`root_path="/Prod"` が入っていても、ローカル実行時には大きな影響はありませんが、ローカルと本番で挙動が少し違う点に注意してください。

---

## 4. CORS (Cross-Origin Resource Sharing) エラー

フロントエンド(Next.js)とバックエンド(API)のドメイン(URL)が違うため、ブラウザのセキュリティ機能により通信がブロックされることがあります。

**[対策]**

FastAPI に `CORSMiddleware` を追加して、許可証を発行します。

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 許可するURL (本番では特定のドメインのみにするのが推奨)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 5. フロントエンド側の接続先設定 (.env.local)

AWSへデプロイし直してAPIのURLが変わった場合、フロントエンド側の設定ファイル (`.env.local`) の更新を忘れないようにします。

※更新後はサーバーの再起動 (`npm run dev` のやり直し) が必要です。

```
NEXT_PUBLIC_API_URL=https://(新しいID).execute-api.(リージョン).amazonaws.com/Prod
```

