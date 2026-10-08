import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MapPin, Menu, User, LogOut, LayoutDashboard, FileText, Map } from 'lucide-react';
import { useState, useEffect } from 'react';
import DarkModeToggle from './DarkModeToggle';
import NotificationBell from './NotificationBell';

const Navbar = () => {
  const { currentUser, userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setMobileMenuOpen(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <nav className="civic-nav sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center civic-logo gap-2 font-bold text-xl">
            <MapPin className="h-6 w-6 text-primary" />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              CivicLink
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <NavLink end to="/" className="civic-nav-link text-sm font-medium hover:text-primary transition-colors">
              Home
            </NavLink>
            {currentUser && (
              <>
                <NavLink to="/report" className="civic-nav-link text-sm font-medium hover:text-primary transition-colors">
                  Report Issue
                </NavLink>
                <NavLink to="/map" className="civic-nav-link text-sm font-medium hover:text-primary transition-colors">
                  Map View
                </NavLink>
                <NavLink to="/analytics" className="civic-nav-link text-sm font-medium hover:text-primary transition-colors">
                  Analytics
                </NavLink>
                {userProfile?.role === 'admin' && (
                  <NavLink to="/admin" className="civic-nav-link text-sm font-medium hover:text-primary transition-colors">
                    Admin
                  </NavLink>
                )}
              </>
            )}
          </div>

          {/* Auth Buttons / User Menu */}
          <div className="hidden md:flex items-center gap-2">
            <DarkModeToggle />
            {currentUser && <NotificationBell />}
            {currentUser ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <User className="h-4 w-4" />
                    {userProfile?.displayName || currentUser.email}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    My Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/report')}>
                    <FileText className="mr-2 h-4 w-4" />
                    Report Issue
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/map')}>
                    <Map className="mr-2 h-4 w-4" />
                    Map View
                  </DropdownMenuItem>
                  {userProfile?.role === 'admin' && (
                    <DropdownMenuItem onClick={() => navigate('/admin')}>
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Admin Dashboard
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate('/auth')}>
                  Login
                </Button>
                <Button size="sm" onClick={() => navigate('/auth?mode=signup')}>
                  Sign Up
                </Button>
              </>
            )}
          </div>

          <div className="md:hidden"><DarkModeToggle /></div>
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            aria-label="Toggle navigation"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div id="mobile-navigation" className="civic-mobile-menu md:hidden py-4 space-y-2 border-t">
            <Link
              to="/"
              className="block px-4 py-2 hover:bg-accent rounded-md transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </Link>
            {currentUser && (
              <>
                <Link
                  to="/report"
                  className="block px-4 py-2 hover:bg-accent rounded-md transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Report Issue
                </Link>
                <Link
                  to="/map"
                  className="block px-4 py-2 hover:bg-accent rounded-md transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Map View
                </Link>
                <Link
                  to="/analytics"
                  className="block px-4 py-2 hover:bg-accent rounded-md transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Analytics
                </Link>
                {userProfile?.role === 'admin' && (
                  <Link
                    to="/admin"
                    className="block px-4 py-2 hover:bg-accent rounded-md transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Admin Dashboard
                  </Link>
                )}
              </>
            )}
            {currentUser && <Link to="/profile" className="block px-4 py-2 rounded-md hover:bg-primary/10" onClick={() => setMobileMenuOpen(false)}>My Profile</Link>}
            {currentUser ? (
              <button
                onClick={() => {
                  handleLogout();
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-accent rounded-md transition-colors"
              >
                Logout
              </button>
            ) : (
              <Button
                className="w-full"
                onClick={() => {
                  navigate('/auth');
                  setMobileMenuOpen(false);
                }}
              >
                Login / Sign Up
              </Button>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
