'use client';

import { useState } from 'react';
import { TextInput } from '@tremor/react';
import { useSearchParams, useRouter } from 'next/navigation';
import { authClient } from '@/utils/auth-client';

export default function ResetForm() {
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    // Validate that the passwords match.
    if (password !== repeatPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    // Enforce a minimum password length (e.g., 8 characters)
    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long');
      return;
    }

    if (!token) {
      setErrorMessage('Invalid or missing token');
      return;
    }

    setLoading(true);

    try {
      await authClient.resetPassword({
        newPassword: password,
        token,
      });
      setSuccessMessage('Password reset successful! Redirecting to login...');
      // Redirect to the login page after a short delay
      setTimeout(() => {
        router.push('/login');
      }, 1500);
    } catch (error: any) {
      console.error('Reset password error:', error);
      setErrorMessage(error?.message || 'Error resetting password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-1 flex-col justify-center px-4 py-10 lg:px-6">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <h3 className="text-center text-tremor-title font-semibold text-tremor-content-strong dark:text-dark-tremor-content-strong">
          Hey,
        </h3>
        <p className="text-center text-tremor-default text-tremor-content dark:text-dark-tremor-content">
          Enter your new password and try not to forget it again.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="password"
              className="text-tremor-default font-medium text-tremor-content-strong dark:text-dark-tremor-content-strong"
            >
              Password
            </label>
            <TextInput
              type="password"
              id="password"
              name="password"
              autoComplete="new-password"
              placeholder="Password"
              className="mt-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label
              htmlFor="repeatPassword"
              className="text-tremor-default font-medium text-tremor-content-strong dark:text-dark-tremor-content-strong"
            >
              Repeat your password
            </label>
            <TextInput
              type="password"
              id="repeatPassword"
              name="repeatPassword"
              autoComplete="new-password"
              placeholder="Repeat Password"
              className="mt-2"
              value={repeatPassword}
              onChange={(e) => setRepeatPassword(e.target.value)}
              required
            />
          </div>
          {errorMessage && (
            <p className="text-red-500 text-sm">{errorMessage}</p>
          )}
          {successMessage && (
            <p className="text-green-500 text-sm">{successMessage}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary mt-4 w-full whitespace-nowrap rounded-tremor-default bg-tremor-brand py-2 text-center text-tremor-default font-medium text-tremor-brand-inverted shadow-tremor-input hover:bg-tremor-brand-emphasis dark:bg-dark-tremor-brand dark:text-dark-tremor-brand-inverted dark:shadow-dark-tremor-input dark:hover:bg-dark-tremor-brand-emphasis"
          >
            {loading ? 'Resetting...' : 'Reset password'}
          </button>
        </form>
      </div>
    </div>
  );
}
