import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button, Input } from '../../../components/ui';
import { authApi } from '../../../services/api';

const ForgotPassword = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await authApi.forgotPassword(email);
            navigate('/verify-otp', { state: { email, isReset: true } });
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send reset code');
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
            <h2 className="text-2xl font-bold text-foreground text-center mb-2">Forgot Password</h2>
            <p className="text-muted-foreground text-center mb-6">
                Enter your email to receive a password reset code
            </p>

            {error && (
                <div className="bg-danger/20 border border-danger/30 text-danger rounded-lg px-4 py-3 mb-4">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    type="email"
                    label="Email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    leftIcon={<Mail className="w-5 h-5" />}
                    required
                />

                <Button
                    type="submit"
                    fullWidth
                    size="lg"
                    isLoading={isLoading}
                >
                    Send Reset Code
                </Button>
            </form>

            <p className="text-center text-muted-foreground mt-6">
                Remember your password?{' '}
                <Link to="/login" className="text-primary-light hover:text-primary font-medium">
                    Login
                </Link>
            </p>
        </motion.div>
    );
};

export default ForgotPassword;
