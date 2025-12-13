# 副業用勤怠管理アプリ 開発詳細手順書 (フロントエンド編)

## 概要

Next.js (App Router) と AWS Amplify Gen 2 を使用して、ユーザー認証（ログイン画面）付きのWebアプリを作成します。

## 前提

親フォルダ「my-work-app」の中にいる状態から開始します。

---

## 【手順1】 プロジェクトの作成とAmplifyの初期化

1. ターミナルで親フォルダ(my-work-app)に移動し、以下のコマンドを実行してNext.jsアプリを作成します。

   コマンド:

   ```bash
   npx create-next-app@latest frontend
   ```

   ※実行時の質問には以下のように回答してください：

   - Would you like to use TypeScript? ... Yes
   - Would you like to use ESLint? ... Yes
   - Would you like to use Tailwind CSS? ... Yes
   - Would you like to use `src/` directory? ... No
   - Would you like to use App Router? ... Yes
   - Would you like to customize the default import alias? ... No

2. 作成された frontend フォルダに移動します。

   コマンド:

   ```bash
   cd frontend
   ```

3. Amplify Gen 2 を初期化します。

   コマンド:

   ```bash
   npm create amplify@latest
   ```

   ※「Install aws-amplify?」などは Yes で進めてください。

---

## 【手順2】 必要なライブラリのインストール

AmplifyのUIコンポーネント（ログイン画面のパーツ）をインストールします。

コマンド:

```bash
npm install aws-amplify @aws-amplify/ui-react
```

---

## 【手順3】 認証設定ファイルの確認

Amplifyが自動生成した設定ファイルを確認します。

デフォルトでメールアドレス認証になっているはずですが、念のため確認します。

**ファイルパス:**

`frontend/amplify/auth/resource.ts`

**記述内容 (ファイルの中身全て):**

```typescript
import { defineAuth } from '@aws-amplify/backend';

/**
 * Define and configure your auth resource
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
});
```

---

## 【手順4】 ログイン画面の実装

トップページを編集して、ログインしていないユーザーにはログイン画面を表示するようにします。

**ファイルパス:**

`frontend/app/page.tsx`

**記述内容 (ファイルの中身を全て以下に書き換えてください):**

```typescript
"use client";

import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { Amplify } from 'aws-amplify';
import outputs from '@/amplify_outputs.json';

// AWSの設定を読み込む
Amplify.configure(outputs);

export default function Home() {
  return (
    <Authenticator>
      {({ signOut, user }) => (
        <main className="flex min-h-screen flex-col items-center justify-center p-24">
          <h1 className="text-4xl font-bold mb-8">勤怠管理アプリ</h1>
          <p className="mb-4">ようこそ、{user?.signInDetails?.loginId} さん</p>
          
          <button 
            onClick={signOut} 
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            ログアウト
          </button>
        </main>
      )}
    </Authenticator>
  );
}
```

---

## 【手順5】 動作確認

1. AWS上に認証環境を作成（サンドボックス起動）

   裏側でAmplifyがAWS設定を行ってくれます。

   コマンド:

   ```bash
   npx ampx sandbox
   ```

   ※「Deployment successful」と表示されるまで待ちます。

   ※このターミナルは開いたままにしておきます。

2. ローカルサーバーの起動

   別のターミナルを開き、frontendフォルダに移動してから実行します。

   コマンド:

   ```bash
   npm run dev
   ```

3. ブラウザで確認

   `http://localhost:3000` にアクセスします。

   ログイン画面が表示され、アカウント作成とログインができれば成功です。

