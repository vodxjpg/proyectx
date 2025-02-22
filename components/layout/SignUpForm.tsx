'use client';

import { useState } from 'react';
import { Card, TextInput } from '@tremor/react';
import { authClient } from '@/utils/auth-client';
import zxcvbn from 'zxcvbn';

// Your logo component remains the same
const Logo = (props) => (
  <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
    <path d="M10.9999 2.04938L11 5.07088C7.6077 5.55612 5 8.47352 5 12C5 15.866 8.13401 19 12 19C13.5723 19 15.0236 18.4816 16.1922 17.6064L18.3289 19.7428C16.605 21.1536 14.4014 22 12 22C6.47715 22 2 17.5228 2 12C2 6.81468 5.94662 2.55115 10.9999 2.04938ZM21.9506 13.0001C21.7509 15.0111 20.9555 16.8468 19.7433 18.3283L17.6064 16.1922C18.2926 15.2759 18.7595 14.1859 18.9291 13L21.9506 13.0001ZM13.0011 2.04948C17.725 2.51902 21.4815 6.27589 21.9506 10.9999L18.9291 10.9998C18.4905 7.93452 16.0661 5.50992 13.001 5.07103L13.0011 2.04948Z" />
  </svg>
);

export default function SignUpForm() {
  // State for form fields and UI messages
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Evaluate password strength as user types
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    if (newPassword) {
      const evaluation = zxcvbn(newPassword);
      setPasswordStrength(evaluation.score);
    } else {
      setPasswordStrength(0);
    }
  };

  // Map score to descriptive text
  const getStrengthLabel = (score: number) => {
    switch (score) {
      case 0:
        return 'Very Weak';
      case 1:
        return 'Weak';
      case 2:
        return 'Fair';
      case 3:
        return 'Strong';
      case 4:
        return 'Very Strong';
      default:
        return '';
    }
  };

  // Handle form submission
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    // Validate passwords match
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    // Optionally, enforce a minimum password strength (e.g., score >= 2)
    if (passwordStrength < 2) {
      setErrorMessage('Please choose a stronger password');
      return;
    }

    setLoading(true);

    try {
      // Call the Better Auth client method for sign-up.
      // This will automatically check if the email already exists via the unique constraint.
      await authClient.signUp.email({
        body: {
          name,
          email,
          password,
        },
      });
      
      // Show a success message instructing the user to verify their email.
      setSuccessMessage('Account created successfully! Please check your email for a verification link to activate your account.');
      
      // Optionally clear the form fields:
      // setName('');
      // setEmail('');
      // setPassword('');
      // setConfirmPassword('');
      // setPasswordStrength(0);
    } catch (error: any) {
      console.error('Sign-up error:', error);
      // If the email already exists or another error occurs, display it.
      setErrorMessage(error?.message || 'There was an error creating your account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-1 flex-col justify-center px-4 py-10 lg:px-6">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Logo
          className="mx-auto h-10 w-10 text-tremor-content-strong dark:text-dark-tremor-content-strong"
          aria-hidden={true}
        />
        <h3 className="mt-6 text-center text-tremor-title font-bold text-tremor-content-strong dark:text-dark-tremor-content-strong">
          Create an account to unlock the potential of your shop
        </h3>
      </div>
      <Card className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="text-tremor-default font-medium text-tremor-content-strong dark:text-dark-tremor-content-strong"
            >
              Name
            </label>
            <TextInput
              type="text"
              id="name"
              name="name"
              autoComplete="name"
              placeholder="Name"
              className="mt-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label
              htmlFor="email"
              className="text-tremor-default font-medium text-tremor-content-strong dark:text-dark-tremor-content-strong"
            >
              Email
            </label>
            <TextInput
              type="email"
              id="email"
              name="email"
              autoComplete="email"
              placeholder="john@company.com"
              className="mt-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
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
              onChange={handlePasswordChange}
              required
            />
            {/* Display password strength indicator */}
            {password && (
              <p className="mt-1 text-sm">
                Password Strength: <strong>{getStrengthLabel(passwordStrength)}</strong>
              </p>
            )}
          </div>
          <div>
            <label
              htmlFor="confirm-password"
              className="text-tremor-default font-medium text-tremor-content-strong dark:text-dark-tremor-content-strong"
            >
              Confirm Password
            </label>
            <TextInput
              type="password"
              id="confirm-password"
              name="confirm-password"
              autoComplete="new-password"
              placeholder="Confirm Password"
              className="mt-2"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          {/* Error Message */}
          {errorMessage && (
            <p className="text-red-500 text-sm">{errorMessage}</p>
          )}
          {/* Success Message */}
          {successMessage && (
            <p className="text-green-500 text-sm">{successMessage}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full whitespace-nowrap rounded-tremor-default btn-primary py-2 text-center text-tremor-default font-medium text-tremor-brand-inverted shadow-tremor-input hover:bg-tremor-brand-emphasis dark:bg-dark-tremor-brand dark:text-dark-tremor-brand-inverted dark:shadow-dark-tremor-input dark:hover:bg-dark-tremor-brand-emphasis"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
          <p className="mt-6 text-center text-sm text-gray-600">
            By signing up, you agree to our{' '}
            <a
              href="#"
              className="capitalize text-tremor-brand hover:text-tremor-brand-emphasis dark:text-dark-tremor-brand hover:dark:text-dark-tremor-brand-emphasis"
            >
              Terms of Use
            </a>{' '}
            and{' '}
            <a
              href="#"
              className="capitalize text-tremor-brand hover:text-tremor-brand-emphasis dark:text-dark-tremor-brand hover:dark:text-dark-tremor-brand-emphasis"
            >
              Privacy Policy
            </a>
          </p>
        </form>
      </Card>
      <p className="mt-6 text-center text-sm text-gray-600">
        Already have an account?{' '}
        <a href="/login" className="font-medium text-black hover:underline">
          Sign in
        </a>
      </p>
    </div>
  );
}
