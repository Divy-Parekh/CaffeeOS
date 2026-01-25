export const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(amount);
};

export const formatDate = (dateString, options = {}) => {
    const defaultOptions = {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    };
    return new Date(dateString).toLocaleDateString('en-IN', { ...defaultOptions, ...options });
};

export const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};
