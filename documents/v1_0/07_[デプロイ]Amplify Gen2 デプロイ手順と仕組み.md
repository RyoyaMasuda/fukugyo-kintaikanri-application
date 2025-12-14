# 【詳細解説】AWS Amplify デプロイの仕組みと設定の意味

このドキュメントは、Next.js (Frontend) + AWS SAM (Backend) のモノレポ構成をAmplifyでデプロイする際の技術的背景をまとめたものです。

---

## 1. 全体の仕組み：CI/CDパイプライン

Amplifyは単なるレンタルサーバーではありません。「CI/CD (継続的インテグレーション/継続的デリバリー)」という自動化システムです。

### デプロイフロー

1. **[Trigger]:** あなたが GitHub へ `git push` をする。

2. **[Webhook]:** GitHub が AWS Amplify に「更新があったよ！」と通知を送る。

3. **[Provision]:** Amplify があなたのための「使い捨てのLinuxサーバー」を1台起動する。

4. **[Clone]:** そのサーバーの中に、GitHubからあなたのコードをダウンロードする。

5. **[Build]:** サーバー内で `npm install` や `npm run build` を実行し、Webサイト用のファイルを生成する。

6. **[Deploy]:** 生成されたファイルを、世界中のサーバー (CDN) に配信する。

この一連の流れを自動でやってくれるのが Amplify の正体です。

---

## 2. 「モノレポ設定」が必要だった理由

今回のプロジェクトは以下のような階層構造になっています。

```
(Gitリポジトリのルート)
 └── my-work-app        <-- 親フォルダ
       ├── backend      <-- ここは今回は関係ない (SAMでデプロイ済み)
       └── frontend     <-- ★ここにWebサイトのコードがある
```

Amplifyが起動したLinuxサーバーは、最初は「リポジトリのルート」にいます。

もし設定をしないと、Amplifyはルートで `npm install` をしようとして「package.json が見つからない！」とエラーになってしまいます。

そのため、「AMPLIFY_MONOREPO_APP_ROOT: my-work-app/frontend」という設定で、「作業を開始する前に、まず `cd my-work-app/frontend` コマンドを実行してね」と指示を出しているのです。

---

## 3. 環境変数 (NEXT_PUBLIC_API_URL) の正体

Next.js のプログラム内で `process.env.NEXT_PUBLIC_...` と書かれている部分は、サーバーが動いている時（実行時）ではなく、**「ビルド時（アプリを組み立てる時）」** に実際の値に書き換えられます。

### 重要ポイント

Amplifyのコンソールで環境変数を設定すると、ビルド中のLinuxサーバーにその値が渡されます。

Next.js はその値を読み取って、JavaScriptのコードの中に APIのURL を「焼き込み」ます。

### 注意点

「ビルド時」に値が決まるため、もし後からAWSコンソールでURLを変更しても、**「再デプロイ（リビルド）」ボタンを押すまでは、Webサイト上のURLは変わりません。**

---

## 4. ビルド設定ファイル (amplify.yml) の中身

デプロイ中、Amplifyは裏側で `amplify.yml` という指示書を自動生成して実行しています。

中身は概ね以下のようになっています。

```yaml
version: 1
applications:
  - appRoot: my-work-app/frontend  # ← ここでフォルダを指定
    frontend:
      phases:
        preBuild:
          commands:
            - npm ci               # ← 依存ライブラリのインストール
        build:
          commands:
            - npm run build        # ← Next.jsのビルド実行
      artifacts:
        baseDirectory: .next       # ← 出来上がった成果物の場所
        files:
          - '**/*'
      cache:
        paths:
          - node_modules/**/*      # ← 次回高速化のためのキャッシュ
```

もし「ビルドが成功したのに画面が真っ白」などのトラブルが起きた場合、この `baseDirectory` が間違っている（例: `.next` ではなく `out` になっている等）ケースが多いです。

---

## 5. 今後の運用フロー (DevOps)

この設定が一度完了してしまえば、AWSの管理画面を開く必要はほとんどありません。

### コードを変更したい場合

1. VS Codeでコードを修正して保存。

2. `git add .`

3. `git commit -m "ボタンの色を変更"`

4. `git push origin main`

これだけで、数分後には自動的に新しいバージョンのWebサイトが公開されます。

これが現代的なWeb開発（DevOps）のスタンダードな流れです。

