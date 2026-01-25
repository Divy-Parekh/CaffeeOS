import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button, Input } from '../../../components/ui';
import { useAppDispatch } from '../../../hooks/useRedux';
import { setCredentials } from '../../../store/authSlice';
import { authApi } from '../../../services/api';

const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useAppDispatch();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const from = location.state?.from?.pathname || '/';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await authApi.login(email, password);
            const { user, token } = response.data.data;

            dispatch(setCredentials({ user, token }));
            navigate(from, { replace: true });
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid email or password');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
        >
            <h2 className="text-2xl font-bold text-foreground text-center mb-6">Login</h2>

            {error && (
                <div className="bg-danger/20 border border-danger/30 text-danger rounded-lg px-4 py-3 mb-4">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    type="email"
                    label="Email/Username"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    leftIcon={<Mail className="w-5 h-5" />}
                    required
                />

                <Input
                    type={showPassword ? 'text' : 'password'}
                    label="Password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    leftIcon={<Lock className="w-5 h-5" />}
                    rightIcon={
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="focus:outline-none"
                        >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    }
                    required
                />

                <div className="text-right">
                    <Link to="/forgot-password" className="text-sm text-primary hover:text-primary-dark">
                        Forgot password?
                    </Link>
                </div>

                <Button
                    type="submit"
                    fullWidth
                    size="lg"
                    isLoading={isLoading}
                >
                    Login
                </Button>
            </form>

            <p className="text-center text-muted-foreground mt-6">
                Don't have an account?{' '}
                <Link to="/signup" className="text-primary hover:text-primary-dark font-medium">
                    Sign Up here
                </Link>
            </p>
        </motion.div>
    );
};

export default Login;
