import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '../../../components/ui';
import { useAppDispatch } from '../../../hooks/useRedux';
import { setCredentials } from '../../../store/authSlice';
import { authApi } from '../../../services/api';

const VerifyOTP = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useAppDispatch();
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [resendCooldown, setResendCooldown] = useState(0);
    const inputRefs = useRef([]);

    const email = location.state?.email;
    const isSignup = location.state?.isSignup;
    const isReset = location.state?.isReset;

    useEffect(() => {
        if (!email) {
            navigate('/login');
        }
    }, [email, navigate]);

    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [resendCooldown]);

    const handleChange = (index, value) => {
        if (!/^\d*$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value.slice(-1);
        setOtp(newOtp);

        // Auto-focus next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').slice(0, 6);
        if (!/^\d+$/.test(pastedData)) return;

        const newOtp = [...otp];
        pastedData.split('').forEach((char, i) => {
            if (i < 6) newOtp[i] = char;
        });
        setOtp(newOtp);
        inputRefs.current[Math.min(pastedData.length, 5)]?.focus();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const otpString = otp.join('');

        if (otpString.length !== 6) {
            setError('Please enter the complete 6-digit OTP');
            return;
        }

        setError('');
        setIsLoading(true);

        try {
            if (isSignup) {
                const response = await authApi.verifyOtp(email, otpString);
                const { user, token } = response.data.data;
                dispatch(setCredentials({ user, token }));
                navigate('/', { replace: true });
            } else if (isReset) {
                navigate('/reset-password', { state: { email, otp: otpString } });
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid OTP. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResend = async () => {
        if (resendCooldown > 0) return;

        try {
            if (isSignup) {
                await authApi.signup('', email, ''); // Resend will use cached signup data
            } else {
                await authApi.forgotPassword(email);
            }
            setResendCooldown(60);
        } catch {
            setError('Failed to resend OTP');
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
        >
            <h2 className="text-2xl font-bold text-white text-center mb-2">Verify OTP</h2>
            <p className="text-gray-400 text-center mb-6">
                Enter the 6-digit code sent to<br />
                <span className="text-white">{email}</span>
            </p>

            {error && (
                <div className="bg-danger/20 border border-danger/30 text-danger rounded-lg px-4 py-3 mb-4">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex justify-center gap-3" onPaste={handlePaste}>
                    {otp.map((digit, index) => (
                        <input
                            key={index}
                            ref={(el) => { inputRefs.current[index] = el; }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleChange(index, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(index, e)}
                            className="w-12 h-14 bg-dark-700 border border-dark-600 rounded-lg text-center text-xl font-bold text-white
                focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                    ))}
                </div>

                <Button
                    type="submit"
                    fullWidth
                    size="lg"
                    isLoading={isLoading}
                >
                    Verify
                </Button>
            </form>

            <p className="text-center text-gray-400 mt-6">
                Didn't receive the code?{' '}
                <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendCooldown > 0}
                    className={`font-medium ${resendCooldown > 0 ? 'text-gray-500' : 'text-primary-light hover:text-primary'
                        }`}
                >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                </button>
            </p>
        </motion.div>
    );
};

export default VerifyOTP;
