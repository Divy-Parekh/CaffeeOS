import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
    ShoppingBag,
    Package,
    BarChart3,
    LogOut,
    Menu,
    X,
    ChevronDown,
    User
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppSelector, useAppDispatch } from '../hooks/useRedux';
import { logout } from '../store/authSlice';
import ThemeToggle from '../components/ui/ThemeToggle';

const navItems = [
    {
        label: 'Orders & Delivery',
        icon: ShoppingBag,
        path: '/orders',
        children: [
            { label: 'Orders', path: '/orders' },
            { label: 'Payment', path: '/orders/payments' },
            { label: 'Customer', path: '/orders/customers' },
        ],
    },
    {
        label: 'Products',
        icon: Package,
        path: '/products',
        children: [
            { label: 'Products', path: '/products' },
            { label: 'Category', path: '/products/categories' },
        ],
    },
    {
        label: 'Reporting',
        icon: BarChart3,
        path: '/reporting',
        children: [
            { label: 'Dashboard', path: '/reporting' },
        ],
    },
];

export const DashboardLayout = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const user = useAppSelector((state) => state.auth.user);
    const isSessionActive = useAppSelector((state) => state.session.isSessionActive);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [expandedMenu, setExpandedMenu] = useState(null);

    const handleLogout = () => {
        dispatch(logout());
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Top Navigation */}
            <header className="bg-background/80 backdrop-blur-md border-b border-border sticky top-0 z-40">
                <div className="flex items-center justify-between px-4 lg:px-6 h-16">
                    {/* Logo */}
                    <NavLink to="/" className="flex items-center gap-2">
                        <span className="text-xl font-bold text-foreground">
                            <span className="text-primary">Caffee</span>OS
                        </span>
                    </NavLink>

                    {/* Desktop Navigation */}
                    <nav className="hidden lg:flex items-center gap-1">
                        {navItems.map((item) => (
                            <div key={item.label} className="relative group">
                                <button
                                    className="flex items-center gap-2 px-4 py-2 text-foreground/80 hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                                    onClick={() => setExpandedMenu(expandedMenu === item.label ? null : item.label)}
                                >
                                    <item.icon className="w-4 h-4" />
                                    {item.label}
                                    <ChevronDown className="w-4 h-4" />
                                </button>

                                {/* Dropdown */}
                                <AnimatePresence>
                                    {expandedMenu === item.label && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-xl min-w-[160px] overflow-hidden"
                                        >
                                            {item.children.map((child) => (
                                                <NavLink
                                                    key={child.path}
                                                    to={child.path}
                                                    onClick={() => setExpandedMenu(null)}
                                                    className={({ isActive }) => `
                            block px-4 py-3 hover:bg-muted transition-colors
                            ${isActive ? 'text-primary bg-primary/10' : 'text-foreground/80'}
                          `}
                                                >
                                                    {child.label}
                                                </NavLink>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))}
                    </nav>

                    {/* User Menu */}
                    <div className="flex items-center gap-2 lg:gap-4">
                        <ThemeToggle />

                        <div className="hidden md:flex items-center gap-2 text-muted-foreground">
                            <User className="w-5 h-5" />
                            <span>{user?.name}</span>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                        >
                            <LogOut className="w-5 h-5" />
                            <span className="hidden md:inline">Logout</span>
                        </button>

                        {/* Mobile menu button */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="lg:hidden p-2 text-muted-foreground hover:text-foreground"
                        >
                            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>

                {/* Mobile Navigation */}
                <AnimatePresence>
                    {mobileMenuOpen && (
                        <motion.nav
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="lg:hidden border-t border-dark-600 overflow-hidden"
                        >
                            {navItems.map((item) => (
                                <div key={item.label}>
                                    <button
                                        onClick={() => setExpandedMenu(expandedMenu === item.label ? null : item.label)}
                                        className="w-full flex items-center justify-between px-4 py-3 text-muted-foreground hover:bg-muted"
                                    >
                                        <span className="flex items-center gap-2">
                                            <item.icon className="w-4 h-4" />
                                            {item.label}
                                        </span>
                                        <ChevronDown className={`w-4 h-4 transition-transform ${expandedMenu === item.label ? 'rotate-180' : ''}`} />
                                    </button>
                                    <AnimatePresence>
                                        {expandedMenu === item.label && (
                                            <motion.div
                                                initial={{ height: 0 }}
                                                animate={{ height: 'auto' }}
                                                exit={{ height: 0 }}
                                                className="overflow-hidden bg-muted/30"
                                            >
                                                {item.children.map((child) => (
                                                    <NavLink
                                                        key={child.path}
                                                        to={child.path}
                                                        onClick={() => setMobileMenuOpen(false)}
                                                        className={({ isActive }) => `
                              block pl-12 pr-4 py-3 hover:bg-muted transition-colors
                              ${isActive ? 'text-primary' : 'text-muted-foreground'}
                            `}
                                                    >
                                                        {child.label}
                                                    </NavLink>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            ))}
                        </motion.nav>
                    )}
                </AnimatePresence>
            </header>

            {/* Main Content */}
            <main className="p-4 lg:p-6">
                <Outlet />
            </main>
        </div>
    );
};

export default DashboardLayout;
