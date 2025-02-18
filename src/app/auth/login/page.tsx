'use client';

import React, { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';


const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    console.log('LoginPage loaded at:', window.location.href);
  }, []);

  // Handle form submission for email/password login
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        setErrorMessage(result.error);
      } else if (result?.ok) {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
      setErrorMessage('An error occurred during login');
    }
  };

  // Function to handle Google Sign-In
  // This will redirect to Google's login page
  const handleGoogleSignIn = async () => {
    try {
      await signIn('google', {
        callbackUrl: '/dashboard', // Where to redirect after successful login
        redirect: true, // Enable automatic redirect
        prompt: 'select_account consent' // Always show Google account selector
      });
    } catch (error) {
      console.error('Google sign-in error:', error);
      setErrorMessage('Failed to connect to Google. Please try again.');
    }
  };

  //  checking in
  // UI Component
  return (
    // Main container with full height and light background
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6">
      {/* Content container with max width */}
      <div className="w-full max-w-[420px] space-y-8">
        {/* Logo and Header Section */}
        <div className="text-center space-y-6">
          {/* <img 
            src="/kku-logo.png" 
            alt="KKU Logo" 
            className="h-16 w-auto mx-auto filter drop-shadow-sm"
          /> */}
          <div className="space-y-2">
            <h1 className="text-2xl font-medium text-gray-900">
              Document Verification
            </h1>
            <p className="text-sm text-gray-500 font-light">
              KKU
            </p>
          </div>
        </div>

        {/* Main Form Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {/* Show error message if exists */}
          {errorMessage && (
            <div className="p-4 mb-4 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">
              {errorMessage}
            </div>
          )}

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-lg bg-gray-50 border border-gray-200 
                           focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 
                           focus:border-blue-400 transition-all duration-200"
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-lg bg-gray-50 border border-gray-200 
                           focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 
                           focus:border-blue-400 transition-all duration-200"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-11 bg-gray-900 text-white rounded-lg font-medium
                       hover:bg-gray-800 active:bg-gray-950 transition-colors duration-200"
            >
              Sign in with Email
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">or</span>
              </div>
            </div>

            {/* Google Sign-In Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full h-11 bg-white border border-gray-200 rounded-lg font-medium text-gray-700
                       hover:bg-gray-50 active:bg-gray-100 transition-colors duration-200
                       flex items-center justify-center space-x-2"
            >
              {/* <img src="/google-logo.svg" alt="Google" className="w-5 h-5" /> */}
              <span>Sign in with KKU Google Account</span>
            </button>
          </form>
        </div>

        {/* Help Section */}
        <div className="text-center">
          <p className="text-sm text-gray-500">
            Need help? <a href="" className="text-blue-600 hover:underline">Contact IT Support</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;