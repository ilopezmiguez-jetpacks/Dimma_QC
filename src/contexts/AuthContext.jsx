import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }
  return context;
};

const initialDemoUsers = [
  {
    id: 1,
    username: 'Cynthia Disogra',
    password: 'Joaq2008',
    name: 'Dra. Cynthia Disogra',
    role: 'admin',
    email: 'admin@qclab.com',
    matricula: 'MP 12345'
  },
  {
    id: 2,
    username: 'tecnico',
    password: 'tecnico123',
    name: 'Téc. Carlos Rodríguez',
    role: 'technician',
    email: 'tecnico@qclab.com',
    matricula: 'TL 67890'
  },
  {
    id: 3,
    username: 'bioquimico',
    password: 'bio123',
    name: 'Bioq. Ana Martínez',
    role: 'biochemist',
    email: 'bioquimico@qclab.com',
    matricula: 'BQ 54321'
  }
];

const getRoleForDisplay = (role) => {
    switch (role) {
      case 'admin': return 'Super Usuario';
      case 'technician': return 'Técnico';
      case 'biochemist': return 'Bioquímico';
      default: return role;
    }
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [demoUsers, setDemoUsers] = useState(() => {
    const savedUsers = localStorage.getItem('qclab_users');
    return savedUsers ? JSON.parse(savedUsers) : initialDemoUsers;
  });

  const demoUsersForDisplay = demoUsers.map(u => ({...u, role: getRoleForDisplay(u.role)}));

  useEffect(() => {
    const savedUser = localStorage.getItem('qclab_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const saveUsers = (users) => {
    setDemoUsers(users);
    localStorage.setItem('qclab_users', JSON.stringify(users));
  };
  
  const findUser = (username, password) => {
    if (password) {
      return demoUsers.find(u => u.username === username && u.password === password);
    }
    return demoUsers.find(u => u.username === username);
  };

  const login = (credentials) => {
    const foundUser = findUser(credentials.username, credentials.password);

    if (foundUser) {
      const userToSave = { ...foundUser };
      delete userToSave.password;
      setUser(userToSave);
      localStorage.setItem('qclab_user', JSON.stringify(userToSave));
      return { success: true };
    }

    return { success: false, error: 'Credenciales incorrectas' };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('qclab_user');
  };

  const switchUser = (username) => {
    const foundUser = findUser(username);
    if (foundUser) {
      const userToSave = { ...foundUser };
      delete userToSave.password;
      setUser(userToSave);
      localStorage.setItem('qclab_user', JSON.stringify(userToSave));
    }
  };
  
  const updateUserPassword = (userId, currentPassword, newPassword) => {
    const userIndex = demoUsers.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return { success: false, error: 'Usuario no encontrado.' };
    }

    const userToUpdate = demoUsers[userIndex];
    if (userToUpdate.password !== currentPassword) {
      return { success: false, error: 'La contraseña actual es incorrecta.' };
    }

    const updatedUsers = [...demoUsers];
    updatedUsers[userIndex] = { ...userToUpdate, password: newPassword };
    saveUsers(updatedUsers);

    return { success: true };
  };

  const value = {
    user,
    login,
    logout,
    switchUser,
    loading,
    demoUsersForDisplay,
    updateUserPassword
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};