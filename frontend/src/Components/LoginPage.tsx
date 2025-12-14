// src/components/LoginPage.tsx

import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { loginUser } from "../API/auth.ts";

interface LoginPageProps {
  onLoginSuccess: (token: string) => void;
  onSwitchToRegister: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  onSwitchToRegister,
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const loginMutation = useMutation({
    mutationFn: loginUser,
    onSuccess: (data) => {
      // Upon successful API call, execute the success callback
      onLoginSuccess(data.token);
    },
    onError: (error: Error) => {
      // Error handled by the mutation state
      console.error("Login Error:", error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Trigger the mutation
    loginMutation.mutate({ email, password });
  };

  return (
    // Responsive Container: Centered, full height, light blue background
    <div className="flex justify-center items-center min-h-screen bg-blue-50 p-4 sm:p-6">
      <div className="w-full max-w-md p-6 bg-white rounded-xl shadow-2xl border border-gray-100">
        <h1 className="text-3xl font-bold text-center text-blue-600 mb-8">
          HE Client Login 👋
        </h1>

        {loginMutation.isError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
            {loginMutation.error.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition duration-150"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition duration-150"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className={`w-full py-3 px-4 rounded-lg text-white font-semibold transition duration-200 ${
              loginMutation.isPending
                ? "bg-blue-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Don't have an account?{" "}
          <span
            className="text-blue-600 hover:text-blue-700 font-medium cursor-pointer transition duration-150"
            onClick={onSwitchToRegister}
          >
            Register here
          </span>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
