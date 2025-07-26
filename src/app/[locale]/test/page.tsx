'use client';

export default function TestPage() {
  return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-blue-600 mb-4">Test Page Working!</h1>
        <p className="text-gray-600">
          This test page confirms that routing is working correctly.
        </p>
        <div className="mt-4 space-y-2">
          <p><strong>URL:</strong> {typeof window !== 'undefined' ? window.location.href : 'Loading...'}</p>
          <p><strong>Status:</strong> ✅ Page rendered successfully</p>
        </div>
      </div>
    </div>
  );
}