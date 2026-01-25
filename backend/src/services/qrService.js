const QRCode = require('qrcode');

// Helper: Ensure URL has protocol
const ensureProtocol = (url) => {
    if (!url) return '';
    if (!/^https?:\/\//i.test(url)) {
        return `https://${url}`;
    }
    return url;
};

// Get base URL (ngrok or localhost)
const getBaseUrl = () => {
    // 1. Check Ngrok
    if (process.env.NGROK_URL) {
        return ensureProtocol(process.env.NGROK_URL);
    }

    // 2. Fallback to Localhost (Warning: Phones cannot access 'localhost')
    // Ideally, replace 'localhost' with your machine's LAN IP (e.g., 192.168.x.x) for local testing
    const port = process.env.PORT || 3000;
    return `http://localhost:${port}`;
};

// Generate QR code as base64 data URL
const generateQRDataUrl = async (data, options = {}) => {
    // DEBUG: Print what is actually being encoded
    console.log(`[QR Service] Generating QR for data: ${data}`);

    const defaultOptions = {
        width: 256,
        margin: 2,
        color: {
            dark: '#000000',
            light: '#ffffff',
        },
        errorCorrectionLevel: 'M' // Better readability
    };

    try {
        const qrDataUrl = await QRCode.toDataURL(data, { ...defaultOptions, ...options });
        return qrDataUrl;
    } catch (error) {
        console.error('[QR Service] Generation error:', error);
        throw error;
    }
};

// Generate QR code as buffer (for PDF generation)
const generateQRBuffer = async (data, options = {}) => {
    console.log(`[QR Service] Generating Buffer for: ${data}`);

    const defaultOptions = {
        width: 256,
        margin: 2,
    };

    try {
        const buffer = await QRCode.toBuffer(data, { ...defaultOptions, ...options });
        return buffer;
    } catch (error) {
        console.error('[QR Service] Buffer error:', error);
        throw error;
    }
};

// Generate table QR code URL
const generateTableQRUrl = (tableToken, origin) => {
    // If origin is provided, use it (remove trailing slash)
    // Otherwise fall back to getBaseUrl()
    const baseUrl = (origin || getBaseUrl()).replace(/\/$/, '');
    return `${baseUrl}/m/${tableToken}`;
};

// Generate table QR as data URL
const generateTableQR = async (tableToken, origin) => {
    const url = generateTableQRUrl(tableToken, origin);
    return generateQRDataUrl(url);
};

// Generate UPI string (for frontend or QR generation)
const generateUPIString = (upiId, amount, orderId, shopName) => {
    if (!upiId) throw new Error("UPI ID is required");

    const formattedAmount = parseFloat(amount).toFixed(2);
    const validUpiId = upiId.trim();
    const cleanShopName = shopName.replace(/[^\w\s]/gi, '');
    const note = `Order ${orderId}`;

    return `upi://pay?pa=${validUpiId}&pn=${encodeURIComponent(cleanShopName)}&tr=${orderId}&tn=${encodeURIComponent(note)}&am=${formattedAmount}&cu=INR`;
};

// Generate UPI payment QR (image)
const generateUPIQR = async (upiId, amount, orderId, shopName) => {
    const upiString = generateUPIString(upiId, amount, orderId, shopName);
    return generateQRDataUrl(upiString, { width: 300 });
};

module.exports = {
    getBaseUrl,
    generateQRDataUrl,
    generateQRBuffer,
    generateTableQRUrl,
    generateTableQR,
    generateUPIQR,
    generateUPIString,
};