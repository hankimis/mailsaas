'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

function WebmailLoginContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'submitting' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('로그인 토큰이 없습니다.');
      return;
    }

    // Decode JWT token (client-side, just to get the payload)
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid token format');
      }

      const payload = JSON.parse(atob(parts[1]));

      // Check expiration
      if (payload.exp && payload.exp < Date.now() / 1000) {
        setStatus('error');
        setErrorMessage('로그인 세션이 만료되었습니다. 다시 시도해주세요.');
        return;
      }

      const { email, password } = payload;

      if (!email || !password) {
        setStatus('error');
        setErrorMessage('로그인 정보가 올바르지 않습니다.');
        return;
      }

      setStatus('submitting');

      // Create and submit a form to the webmail login page
      const webmailHost = process.env.NEXT_PUBLIC_WEBMAIL_HOST || 'host51.registrar-servers.com';
      const webmailUrl = `https://${webmailHost}:2096/login/?login_only=1`;

      const form = document.createElement('form');
      form.method = 'POST';
      form.action = webmailUrl;
      form.target = '_self';

      // Add form fields
      const userField = document.createElement('input');
      userField.type = 'hidden';
      userField.name = 'user';
      userField.value = email;
      form.appendChild(userField);

      const passField = document.createElement('input');
      passField.type = 'hidden';
      passField.name = 'pass';
      passField.value = password;
      form.appendChild(passField);

      const gotoField = document.createElement('input');
      gotoField.type = 'hidden';
      gotoField.name = 'goto_uri';
      gotoField.value = '/';
      form.appendChild(gotoField);

      document.body.appendChild(form);
      form.submit();
    } catch {
      setStatus('error');
      setErrorMessage('로그인 처리 중 오류가 발생했습니다.');
    }
  }, [token]);

  if (status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="rounded-lg bg-white p-8 shadow-lg text-center">
          <div className="text-red-500 text-4xl mb-4">!</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">로그인 오류</h1>
          <p className="text-gray-600 mb-4">{errorMessage}</p>
          <a
            href="/dashboard/emails"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            돌아가기
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="rounded-lg bg-white p-8 shadow-lg text-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-gray-900 mb-2">
          {status === 'loading' ? '로그인 준비 중...' : '웹메일 로그인 중...'}
        </h1>
        <p className="text-gray-600">잠시만 기다려주세요.</p>
      </div>
    </div>
  );
}

export default function WebmailLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-100">
          <div className="rounded-lg bg-white p-8 shadow-lg text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">로딩 중...</h1>
            <p className="text-gray-600">잠시만 기다려주세요.</p>
          </div>
        </div>
      }
    >
      <WebmailLoginContent />
    </Suspense>
  );
}
