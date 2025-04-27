"use client";

import React from 'react';

// --- Props Interface ---
interface LoginFormProps {
  loginInput: string;
  loginError: string | null;
  handleLoginAttempt: () => void;
  handleLoginKeyPress: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  setLoginInput: (value: string) => void;
}

// --- Component ---
const LoginForm: React.FC<LoginFormProps> = ({
  loginInput,
  loginError,
  handleLoginAttempt,
  handleLoginKeyPress,
  setLoginInput,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.7)]">
      <div className="bg-white rounded-lg shadow-xl p-8 w-11/12 max-w-md">
        <h2 className="text-xl font-semibold mb-2 text-center text-gray-800">登录系统</h2>
        <p className="text-sm text-gray-500 text-center mb-6">请输入您的账号</p>
        {/* Login Error Display */}
        {loginError && (
          <div className="bg-red-100 border border-red-300 text-red-700 text-sm rounded-md p-3 mb-4">
            {loginError}
          </div>
        )}
        <input 
          type="text" 
          placeholder="请输入账号" 
          maxLength={20} 
          className="mb-5 w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-base"
          value={loginInput} 
          onChange={(e) => setLoginInput(e.target.value)}
          onKeyPress={handleLoginKeyPress}
        />
        <button 
          onClick={handleLoginAttempt} 
          className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          登录
        </button>
      </div>
    </div>
  );
};

export default LoginForm; 