import React, { createContext, useContext, useState } from 'react';

type MenuDrawerContextType = {
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
};

const MenuDrawerContext = createContext<MenuDrawerContextType | undefined>(undefined);

export function MenuDrawerProvider({ children }: { children: React.ReactNode }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const openDrawer = () => setIsDrawerOpen(true);
  const closeDrawer = () => setIsDrawerOpen(false);
  const toggleDrawer = () => setIsDrawerOpen((prev) => !prev);

  return (
    <MenuDrawerContext.Provider value={{ isDrawerOpen, openDrawer, closeDrawer, toggleDrawer }}>
      {children}
    </MenuDrawerContext.Provider>
  );
}

export function useMenuDrawer() {
  const context = useContext(MenuDrawerContext);
  if (context === undefined) {
    throw new Error('useMenuDrawer must be used within a MenuDrawerProvider');
  }
  return context;
}
