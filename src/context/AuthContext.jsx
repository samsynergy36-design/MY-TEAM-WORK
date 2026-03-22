import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const AVATAR_COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];
const getRandomColor = () => AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const storedUserData = localStorage.getItem('teamsync_user');
    if (storedUserData) {
      const parsed = JSON.parse(storedUserData);
      setUserData(parsed);
      setUser({ id: parsed.id });
    }
    setLoading(false);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const login = async (username, password) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();

      if (error || !data) {
        toast.error('User not found');
        return { success: false, error: 'User not found' };
      }

      if (data.password !== password) {
        toast.error('Invalid password');
        return { success: false, error: 'Invalid password' };
      }

      const { password: _, ...userWithoutPassword } = data;
      setUserData(userWithoutPassword);
      setUser({ id: data.id });
      localStorage.setItem('teamsync_user', JSON.stringify(userWithoutPassword));

      await supabase
        .from('users')
        .update({ last_active: new Date().toISOString() })
        .eq('id', data.id);

      toast.success('Welcome back!');
      return { success: true };
    } catch (error) {
      toast.error(error.message || 'Login failed');
      return { success: false, error: error.message };
    }
  };

  const register = async (username, displayName, password, role) => {
    try {
      const { data: existing } = await supabase
        .from('users')
        .select('username')
        .eq('username', username)
        .single();

      if (existing) {
        toast.error('Username already exists');
        return { success: false, error: 'Username taken' };
      }

      const { data, error } = await supabase
        .from('users')
        .insert({
          username,
          password,
          display_name: displayName,
          role,
          avatar_color: getRandomColor(),
          yearly_points: 0,
          total_points: 0,
          tasks_completed: 0
        })
        .select()
        .single();

      if (error) {
        toast.error(error.message);
        return { success: false, error: error.message };
      }

      const { password: _, ...userWithoutPassword } = data;
      setUserData(userWithoutPassword);
      setUser({ id: data.id });
      localStorage.setItem('teamsync_user', JSON.stringify(userWithoutPassword));

      toast.success('Account created successfully!');
      return { success: true };
    } catch (error) {
      toast.error(error.message || 'Registration failed');
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    localStorage.removeItem('teamsync_user');
    setUserData(null);
    setUser(null);
    toast.success('Logged out successfully');
  };

  const refreshUserData = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (data) {
      const { password: _, ...userWithoutPassword } = data;
      setUserData(userWithoutPassword);
      localStorage.setItem('teamsync_user', JSON.stringify(userWithoutPassword));
    }
  };

  const value = {
    user,
    userData,
    loading,
    isOnline,
    login,
    register,
    logout,
    refreshUserData
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
