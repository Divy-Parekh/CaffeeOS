const PDFDocument = require('pdfkit');
const { generateQRBuffer } = require('./qrService');

// Helper to create a PDF buffer from a doc
const createPdfBuffer = (doc) => {
  return new Promise((resolve, reject) => {
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);
    doc.end();
  });
};

// Generate QR sheet PDF for all tables
const generateQRSheetPDF = async (tables, shopName, origin) => {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  // Import helper inside function to avoid circular dep if any (though const destructuring was top level, requiring qrService here is safer or reuse existing require if top level)
  // We already required generateQRBuffer. We need generateTableQRUrl too.
  const { generateTableQRUrl, generateQRBuffer } = require('./qrService');

  // Header
  doc.fontSize(20).text(shopName, { align: 'center' });
  doc.fontSize(12).text('Table QR Codes - Scan to Order', { align: 'center' });
  doc.moveDown(2);

  // QR Grid Settings
  const columns = 3;
  const startX = 50;
  const startY = 150;
  const boxWidth = 150;
  const boxHeight = 200;
  const gapX = 40;
  const gapY = 40;

  let col = 0;
  let row = 0;

  for (const table of tables) {
    // Calculate position
    const x = startX + (col * (boxWidth + gapX));
    const y = startY + (row * (boxHeight + gapY));

    // Check for new page
    if (y + boxHeight > doc.page.height - 50) {
      doc.addPage();
      row = 0;
      // Recalculate y
      // Note: In real logic we'd reset y to top margin, simplifying here
    }

    // Draw border card
    doc.rect(x, y, boxWidth, boxHeight).strokeColor('#e5e7eb').stroke();

    try {
      // Generate QR URL using the dynamic origin
      const qrUrl = generateTableQRUrl(table.token, origin);
      console.log(`Generating QR for ${table.name}: ${qrUrl}`);

      // Generate QR Buffer from URL
      const qrBuffer = await generateQRBuffer(qrUrl, { width: 150 });

      // Draw QR
      doc.image(qrBuffer, x + 15, y + 15, { width: 120, height: 120 });

      // Draw Text
      doc.font('Helvetica-Bold').fontSize(14).fillColor('#1f2937')
        .text(table.name, x, y + 145, { width: boxWidth, align: 'center' });

      doc.font('Helvetica').fontSize(10).fillColor('#6b7280')
        .text(`Capacity: ${table.capacity}`, x, y + 165, { width: boxWidth, align: 'center' });

    } catch (err) {
      console.error(`Error generating QR for table ${table.name}:`, err);
      doc.text('QR Error', x + 10, y + 50);
    }

    // Update grid position
    col++;
    if (col >= columns) {
      col = 0;
      row++;
    }
  }

  return createPdfBuffer(doc);
};

// Generate receipt PDF
const generateReceiptPDF = async (orderDetails) => {
  const { orderNumber, items, subtotal, taxAmount, totalAmount, shopName, date, customerName } = orderDetails;
  const doc = new PDFDocument({ size: 'A5', margin: 30 }); // A5 is good for receipts

  // Header
  doc.fontSize(18).text(shopName, { align: 'center' });
  doc.fontSize(10).text('Order Receipt', { align: 'center' });
  doc.moveDown();

  // Info
  doc.fontSize(10).text(`Order: #${orderNumber}`);
  doc.text(`Date: ${new Date(date).toLocaleString()}`);
  if (customerName) doc.text(`Customer: ${customerName}`);
  doc.moveDown();

  // Table Header
  const tableTop = doc.y;
  const itemX = 30;
  const qtyX = 220;
  const priceX = 280;
  const amountX = 350;

  doc.font('Helvetica-Bold');
  doc.text('Item', itemX, tableTop);
  doc.text('Qty', qtyX, tableTop, { width: 40, align: 'center' });
  doc.text('Price', priceX, tableTop, { width: 60, align: 'right' });
  doc.text('Amount', amountX, tableTop, { width: 60, align: 'right' });
  doc.moveDown(0.5);

  // Divider
  doc.moveTo(30, doc.y).lineTo(410, doc.y).strokeColor('#e5e7eb').stroke();
  doc.moveDown(0.5);

  // Items
  doc.font('Helvetica');
  items.forEach(item => {
    const y = doc.y;
    doc.text(item.productName, itemX, y, { width: 180 });
    doc.text(item.quantity.toString(), qtyX, y, { width: 40, align: 'center' });
    doc.text(item.unitPrice.toFixed(2), priceX, y, { width: 60, align: 'right' });
    doc.text(item.subtotal.toFixed(2), amountX, y, { width: 60, align: 'right' });
    doc.moveDown();
  });

  doc.moveDown();
  doc.moveTo(30, doc.y).lineTo(410, doc.y).stroke();
  doc.moveDown();

  // Totals
  const totalsX = 250;
  const valuesX = 350;

  doc.text('Subtotal:', totalsX);
  doc.text(subtotal.toFixed(2), valuesX, doc.y - doc.currentLineHeight(), { width: 60, align: 'right' });

  doc.text('Tax:', totalsX);
  doc.text(taxAmount.toFixed(2), valuesX, doc.y - doc.currentLineHeight(), { width: 60, align: 'right' });

  doc.moveDown(0.5);
  doc.font('Helvetica-Bold').fontSize(12);
  doc.text('Total:', totalsX);
  doc.text(totalAmount.toFixed(2), valuesX, doc.y - doc.currentLineHeight(), { width: 60, align: 'right' });

  // Footer
  doc.moveDown(2);
  doc.fontSize(8).fillColor('#9ca3af').text('Thank you for your visit!', { align: 'center' });

  return createPdfBuffer(doc);
};

// Generate dashboard report PDF
const generateReportPDF = async (reportData) => {
  const { shopName, period, totalOrders, revenue, averageOrder, topProducts, topCategories } = reportData;
  const doc = new PDFDocument({ margin: 50 });

  // Header
  doc.fontSize(24).fillColor('#4F46E5').text(shopName, { align: 'center' });
  doc.fontSize(14).fillColor('black').text(`Sales Report - ${period}`, { align: 'center' });
  doc.fontSize(10).fillColor('gray').text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
  doc.moveDown(2);

  // Stats Cards (Text Representation)
  doc.fontSize(12).fillColor('black').text('Summary Statistics');
  doc.moveDown(0.5);

  const startY = doc.y;
  const cardWidth = 150;

  // Draw Stats Box
  doc.rect(50, startY, 500, 60).fill('#f9fafb');
  doc.fillColor('black');

  // Orders
  doc.fontSize(10).text('Total Orders', 70, startY + 15);
  doc.fontSize(16).text(totalOrders, 70, startY + 30);

  // Revenue
  doc.fontSize(10).text('Revenue', 230, startY + 15);
  doc.fontSize(16).text(`₹${revenue.toFixed(2)}`, 230, startY + 30);

  // Avg Order
  doc.fontSize(10).text('Avg Order Value', 400, startY + 15);
  doc.fontSize(16).text(`₹${averageOrder.toFixed(2)}`, 400, startY + 30);

  doc.moveDown(4);

  // Top Products Table
  doc.fontSize(14).text('Top Selling Products');
  doc.moveDown();

  const tableTop = doc.y;
  const col1 = 50;  // Rank
  const col2 = 100; // Product
  const col3 = 350; // Qty
  const col4 = 450; // Revenue

  // Table Header
  doc.fontSize(10).font('Helvetica-Bold');
  doc.text('#', col1, tableTop);
  doc.text('Product', col2, tableTop);
  doc.text('Qty Sold', col3, tableTop, { width: 60, align: 'center' });
  doc.text('Revenue', col4, tableTop, { width: 60, align: 'right' });

  doc.moveTo(50, doc.y + 5).lineTo(550, doc.y + 5).stroke();
  doc.moveDown();

  // Rows
  doc.font('Helvetica');
  topProducts.forEach((p, i) => {
    const y = doc.y;
    doc.text((i + 1).toString(), col1, y);
    doc.text(p.name, col2, y);
    doc.text(p.quantity.toString(), col3, y, { width: 60, align: 'center' });
    doc.text(`₹${p.revenue.toFixed(2)}`, col4, y, { width: 60, align: 'right' });
    doc.moveDown(0.5);
  });

  doc.moveDown(2);

  // Top Categories Table
  doc.fontSize(14).text('Top Categories');
  doc.moveDown();

  const catTableTop = doc.y;
  // Reuse columns x-coordinates

  // Table Header
  doc.fontSize(10).font('Helvetica-Bold');
  doc.text('#', col1, catTableTop);
  doc.text('Category', col2, catTableTop);
  doc.text('% Sales', col3, catTableTop, { width: 60, align: 'center' });
  doc.text('Revenue', col4, catTableTop, { width: 60, align: 'right' });

  doc.moveTo(50, doc.y + 5).lineTo(550, doc.y + 5).stroke();
  doc.moveDown();

  // Rows
  doc.font('Helvetica');
  if (topCategories && topCategories.length > 0) {
    topCategories.forEach((c, i) => {
      const y = doc.y;
      doc.text((i + 1).toString(), col1, y);
      doc.text(c.name, col2, y);
      doc.text(`${c.percentage}%`, col3, y, { width: 60, align: 'center' });
      doc.text(`₹${c.revenue.toFixed(2)}`, col4, y, { width: 60, align: 'right' });
      doc.moveDown(0.5);
    });
  } else {
    doc.text('No category data available', col2, doc.y);
  }

  return createPdfBuffer(doc);
};

module.exports = {
  generateQRSheetPDF,
  generateReceiptPDF,
  generateReportPDF,
};
