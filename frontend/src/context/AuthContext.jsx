import React, { createContext, useState, useEffect, useContext } from 'react';
import { login as apiLogin, logout as apiLogout, registerUser as apiRegisterUser } from '../api/authentication';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session on page load
    const token = localStorage.getItem('near_miss_token');
    const storedUser = localStorage.getItem('near_miss_user');
    
    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    setLoading(true);
    try {
      const response = await apiLogin(username, password);
      const { access_token, user: userData } = response.data;
      
      localStorage.setItem('near_miss_token', access_token);
      localStorage.setItem('near_miss_user', JSON.stringify(userData));
      
      setUser(userData);
      return { success: true };
    } catch (error) {
      console.error("Login failed", error);
      const errMsg = error.response?.data?.message || 'Invalid username or password';
      return { success: false, error: errMsg };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    try {
      apiLogout();
    } catch (err) {
      console.error("Logout request failed", err);
    }
    localStorage.removeItem('near_miss_token');
    localStorage.removeItem('near_miss_user');
    setUser(null);
  };

  const registerUser = async (userData) => {
    try {
      const response = await apiRegisterUser(userData);
      return { success: true, user: response.data.user };
    } catch (error) {
      console.error("Registration failed", error);
      const errMsg = error.response?.data?.message || 'Registration failed';
      return { success: false, error: errMsg };
    }
  };

  const updateUserData = (newUserData) => {
    localStorage.setItem('near_miss_user', JSON.stringify(newUserData));
    setUser(newUserData);
  };

  const value = {
    user,
    loading,
    login,
    logout,
    registerUser,
    updateUserData,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'Admin',
    isSafetyOfficer: user?.role === 'Safety_Officer',
    isHOD: user?.role === 'HOD',
    isEmployee: user?.role === 'Employee',
    isGeneralManager: user?.role === 'General_Manager',
    isPlantHead: user?.role === 'Plant_Head',
    isSeniorManagement: user?.role === 'Senior_Management',
    isManagementUser: ['Admin', 'General_Manager', 'Plant_Head', 'Senior_Management'].includes(user?.role)
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
