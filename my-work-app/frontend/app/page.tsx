"use client";

import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { Amplify } from 'aws-amplify';
import outputs from '@/amplify_outputs.json';
import { useState, useEffect } from 'react';
import axios from 'axios';

// AWS設定
Amplify.configure(outputs);

// --- 型定義 ---
interface AttendanceRecord {
  userId: string;
  timestamp: string;
  type: string;
}

interface AttendanceParams {
  type: "start" | "end";
  userId: string | undefined;
}

// ============================================================
// 部品1: ログイン後に表示される中身 (Dashboard)
// ============================================================
function Dashboard({ user, signOut }: { user: any; signOut: ((data?: any) => void) | undefined }) {
  
  const [message, setMessage] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  // 履歴取得
  const fetchHistory = async (userId: string) => {
    if (!apiUrl) return;
    try {
      const res = await axios.get(`${apiUrl}/attendance/${userId}`);
      const sortedItems = res.data.items.sort((a: AttendanceRecord, b: AttendanceRecord) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      setHistory(sortedItems);
    } catch (err) {
      console.error("履歴取得エラー:", err);
    }
  };

  // 打刻処理
  const handleAttendance = async ({ type, userId }: AttendanceParams) => {
    setLoading(true);
    setMessage("通信中...");

    try {
      const now = new Date();
      const timestamp = now.toISOString();

      if (!apiUrl) throw new Error("API URL未設定");

      await axios.post(`${apiUrl}/attendance`, {
        userId: userId,
        timestamp: timestamp,
        type: type,
      })

      const typeText = type === "start" ? "出勤" : "退勤";
      setMessage(`${typeText}を記録しました!`);

      if (userId) await fetchHistory(userId);

    } catch (error) {
      console.error(error);
      setMessage("エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  // 初期化時に履歴読み込み
  useEffect(() => {
    if (user?.username) {
      fetchHistory(user.username);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-50">
      <div className="w-full max-w-md bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">勤怠管理アプリ</h1>
        <p className="mb-6 text-center text-gray-600 text-sm">
          ID: {user?.signInDetails?.loginId}
        </p>
        
        <div className="space-y-4 mb-6">
          <button onClick={() => user?.username && handleAttendance({ type: "start", userId: user.username})}
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 transition disabled:opacity-50"
          >
            出勤 (Start)
          </button>
          <button onClick={() => user?.username && handleAttendance({ type: "end", userId: user.username})}
            disabled={loading}
            className="w-full py-3 bg-orange-500 text-white rounded font-bold hover:bg-orange-600 transition disabled:opacity-50"
          >
            退勤 (End)
          </button>
          
          {message && (
            <div className="p-3 bg-blue-50 text-blue-800 rounded text-sm text-center">
              {message}
            </div>
          )}
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-bold mb-3 text-gray-700 border-b pb-2">履歴</h2>
          <div className="h-48 overflow-y-auto pr-1">
            {history.length === 0 ? (
              <p className="text-gray-400 text-center text-sm py-4">履歴なし</p>
            ) : (
              <ul className="space-y-2">
                {history.map((item, index) => (
                  <li key={index} className="bg-gray-50 p-3 rounded text-sm flex justify-between items-center">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${item.type === 'start' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>
                      {item.type === 'start' ? '出勤' : '退勤'}
                    </span>
                    <span className="text-gray-500 font-mono">
                      {new Date(item.timestamp).toLocaleString('ja-JP')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        
        <div className="text-center">
          <button onClick={() => signOut && signOut()} className="text-sm text-gray-400 hover:text-gray-600 underline">
            ログアウト
          </button>
        </div>
      </div>
    </main>
  );
}

// ============================================================
// 部品2: メインページ (エントリポイント)
// ============================================================
export default function Home() {
  return (
    <Authenticator>
      {({ signOut, user }) => (
        <Dashboard user={user} signOut={signOut} />
      )}
    </Authenticator>
  );
}