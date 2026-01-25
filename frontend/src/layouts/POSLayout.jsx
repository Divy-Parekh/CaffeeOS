import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Wifi, WifiOff, Play, Clock } from 'lucide-react';
import { Tabs } from '../components/ui';
import { useAppSelector } from '../hooks/useRedux';
import { getSocket, connectSocket, SOCKET_EVENTS } from '../services/socket';

const posTabs = [
    { id: 'table', label: 'Table' },
    { id: 'register', label: 'Register' },
    { id: 'orders', label: 'Orders' },
];

export const POSLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { shopId, sessionId } = useParams();
    const currentShop = useAppSelector((state) => state.session.currentShop);
    const currentSession = useAppSelector((state) => state.session.currentSession);
    const [isConnected, setIsConnected] = useState(false);
    const [activeTab, setActiveTab] = useState('table');

    // Sync activeTab with current URL
    useEffect(() => {
        const pathParts = location.pathname.split('/');
        const lastPart = pathParts[pathParts.length - 1];
        if (['table', 'register', 'orders'].includes(lastPart)) {
            setActiveTab(lastPart);
        } else {
            setActiveTab('table');
        }
    }, [location.pathname]);

    // Socket connection
    useEffect(() => {
        if (shopId) {
            const socket = connectSocket(shopId);

            socket.on('connect', () => setIsConnected(true));
            socket.on('disconnect', () => setIsConnected(false));

            return () => {
                socket.off('connect');
                socket.off('disconnect');
            };
        }
    }, [shopId]);

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        navigate(`/pos/${shopId}/${sessionId}/${tabId}`);
    };

    const handleBack = () => {
        navigate('/');
    };

    // Format session duration
    const getSessionDuration = () => {
        if (!currentSession?.openedAt) return '';
        const start = new Date(currentSession.openedAt);
        const now = new Date();
        const diffMs = now - start;
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    };

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Header - Fixed */}
            <header className="fixed top-0 left-0 right-0 z-40 bg-card border-b border-border px-4 h-14 flex items-center justify-between">
                {/* Left: Back button & Shop name */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleBack}
                        className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="font-semibold text-foreground">{currentShop?.name || 'POS Terminal'}</h1>
                    </div>
                </div>

                {/* Center: Tabs */}
                <div className="absolute left-1/2 -translate-x-1/2">
                    <Tabs
                        tabs={posTabs}
                        activeTab={activeTab}
                        onChange={handleTabChange}
                        variant="boxed"
                    />
                </div>

                {/* Right: Session Status & Connection */}
                <div className="flex items-center gap-3">
                    {/* Session Status */}
                    {currentSession && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm bg-primary/20 text-primary-light">
                            <Play className="w-4 h-4 fill-current" />
                            <span className="hidden sm:inline">Session Active</span>
                            <span className="flex items-center gap-1 text-xs opacity-75">
                                <Clock className="w-3 h-3" />
                                {getSessionDuration()}
                            </span>
                        </div>
                    )}

                    {/* Connection Status - Always Connected as per request */}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm bg-success/20 text-success">
                        <Wifi className="w-4 h-4" />
                        <span className="hidden sm:inline">Connected</span>
                    </div>
                </div>
            </header>

            {/* Main POS Content - With top padding for fixed header */}
            <main className="flex-1 overflow-hidden pt-14">
                <Outlet context={{ activeTab, shopId, sessionId }} />
            </main>
        </div>
    );
};

export default POSLayout;
