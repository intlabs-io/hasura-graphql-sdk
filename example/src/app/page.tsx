'use client';

import { useState } from 'react';
import { useSwrWithGraphqlSdk, useGraphqlSdk } from '../lib/hooks';

interface User {
  id: string;
  name: string;
  email: string;
}

export default function Home() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch users using SWR hook
  const { data, error, isLoading, mutate } = useSwrWithGraphqlSdk('GetUsers', {});
  const users: User[] = data?.users || [];

  // Get SDK for mutations
  const sdk = useGraphqlSdk();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sdk || !name.trim() || !email.trim()) return;

    setIsSubmitting(true);
    try {
      await sdk.CreateUser({ name: name.trim(), email: email.trim() });
      // Clear form
      setName('');
      setEmail('');
      // Revalidate the users list
      mutate();
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Error creating user. Please check the console for details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-8 text-gray-800 dark:text-white">
            GraphQL Users Demo
          </h1>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Add User Form */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-white">
                Add New User
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Enter user name"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Enter user email"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting || !sdk}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? 'Adding User...' : 'Add User'}
                </button>
              </form>
            </div>

            {/* Users List */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-white">
                Users List
              </h2>
              
              {isLoading && (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                  Error loading users: {error.message || 'Unknown error'}
                </div>
              )}

              {!isLoading && !error && users.length === 0 && (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  No users found. Add some users to get started!
                </p>
              )}

              {!isLoading && !error && users.length > 0 && (
                <div className="space-y-3">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-gray-800 dark:text-white">
                            {user.name}
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400">
                            {user.email}
                          </p>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-500 font-mono">
                          {user.id.slice(0, 8)}...
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              This demo uses the Hasura GraphQL SDK with SWR for real-time data fetching.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
