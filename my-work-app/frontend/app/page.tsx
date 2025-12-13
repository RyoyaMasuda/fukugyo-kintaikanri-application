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
          
          {/* ここに後で打刻ボタンを追加します */}
          
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