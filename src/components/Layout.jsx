import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { LayoutDashboard, Microscope, Settings, LogOut, BarChart3, Activity, Upload, User, Building2, BadgeCheck } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import LabSelector from '@/components/LabSelector';

const SidebarLink = ({ to, icon: Icon, children }) => {
  const location = useLocation();
  const isActive = location.pathname.startsWith(to);

  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
        ? 'bg-primary/10 text-primary font-medium'
        : 'text-gray-600 hover:bg-gray-100'
        }`}
    >
      <Icon className="w-5 h-5" />
      <span>{children}</span>
    </Link>
  );
};

const Layout = ({ children }) => {
  const { user, signOut } = useAuth();
  const isAdmin = user?.user_metadata?.role === 'admin';

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r fixed h-full z-20 hidden lg:block">
        <div className="p-6 border-b">
          <div className="flex items-center gap-2 text-primary font-bold text-xl">
            <Activity className="w-6 h-6" />
            <span>DIMMA QC</span>
          </div>
        </div>

        <nav className="p-4 space-y-1">
          <SidebarLink to="/" icon={LayoutDashboard}>Tablero</SidebarLink>
          <SidebarLink to="/equipment" icon={Microscope}>Equipos</SidebarLink>
          <SidebarLink to="/load-control" icon={Upload}>Cargar Control</SidebarLink>
          <SidebarLink to="/statistics" icon={BarChart3}>Estadísticas</SidebarLink>
          {isAdmin && (
            <SidebarLink to="/settings" icon={Settings}>Configuración</SidebarLink>
          )}
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t bg-white">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-gray-100 transition-colors text-left focus:outline-none">
                <Avatar>
                  <AvatarImage src={user?.profile?.avatar_url} />
                  <AvatarFallback>{user?.email?.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user?.profile?.full_name || user?.user_metadata?.full_name || 'Usuario'}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.profile?.full_name}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <BadgeCheck className="mr-2 h-4 w-4" />
                <span>Rol: <span className="font-semibold capitalize">{user?.profile?.role === 'admin' ? 'Administrador' : user?.profile?.role === 'biochemist' ? 'Bioquímico' : 'Técnico'}</span></span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Building2 className="mr-2 h-4 w-4" />
                <span>Lab: <span className="font-semibold">{user?.profile?.laboratory?.name || 'N/A'}</span></span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Cerrar Sesión</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        <header className="h-16 bg-white border-b flex items-center justify-between px-6 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <LabSelector />
          </div>

          <div className="flex items-center gap-4">
            {/* Mobile Menu Trigger could go here */}
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;