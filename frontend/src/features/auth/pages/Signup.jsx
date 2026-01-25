import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button, Input } from '../../../components/ui';
import { authApi } from '../../../services/api';

const Signup = () => {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setIsLoading(true);

        try {
            await authApi.signup(name, email, password);
            // Navigate to OTP verification page
            navigate('/verify-otp', { state: { email, isSignup: true } });
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create account');
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
            <h2 className="text-2xl font-bold text-foreground text-center mb-6">Sign Up</h2>

            {error && (
                <div className="bg-danger/20 border border-danger/30 text-danger rounded-lg px-4 py-3 mb-4">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    type="text"
                    label="Name"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    leftIcon={<User className="w-5 h-5" />}
                    required
                />

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
                    placeholder="Create a password"
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

                <Button
                    type="submit"
                    fullWidth
                    size="lg"
                    isLoading={isLoading}
                >
                    Sign Up
                </Button>
            </form>

            <p className="text-center text-muted-foreground mt-6">
                Already have an account?{' '}
                <Link to="/login" className="text-primary-light hover:text-primary font-medium">
                    Login
                </Link>
            </p>
        </motion.div>
    );
};

export default Signup;
