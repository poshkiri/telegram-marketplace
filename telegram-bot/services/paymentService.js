require('dotenv').config();
const TronWeb = require('tronweb');
const axios = require('axios');
const QRCode = require('qrcode');
const Order = require('../../database/models/Order');

// Конфигурация кошельков
const WALLETS = {
  TRC20: process.env.WALLET_TRC20,
  ERC20: process.env.WALLET_ERC20,
  BEP20: process.env.WALLET_BEP20
};

// Адреса контрактов USDT
const USDT_CONTRACTS = {
  TRC20: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', // USDT на Tron
  ERC20: '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT на Ethereum
  BEP20: '0x55d398326f99059ff775485246999027b3197955'  // USDT на BSC
};

// Инициализация TronWeb (для TRC20)
let tronWeb;
if (WALLETS.TRC20) {
  const fullNode = 'https://api.trongrid.io';
  
  tronWeb = new TronWeb({
    fullHost: fullNode,
    headers: process.env.TRONGRID_API_KEY ? { "TRON-PRO-API-KEY": process.env.TRONGRID_API_KEY } : {}
  });
}

/**
 * Генерация QR кода для адреса кошелька
 */
async function generateQRCode(address) {
  try {
    const qrBuffer = await QRCode.toBuffer(address, {
      width: 400,
      margin: 2,
      errorCorrectionLevel: 'H'
    });
    return qrBuffer;
  } catch (error) {
    console.error('❌ Ошибка генерации QR кода:', error);
    return null;
  }
}

/**
 * Создание заказа и генерация платежной информации
 */
async function createPaymentOrder(buyerId, productId, productPrice, network = 'TRC20') {
  try {
    const commissionRate = parseFloat(process.env.COMMISSION_RATE || '0.05');
    const commission = productPrice * commissionRate;
    const totalPrice = productPrice + commission;

    // Генерируем уникальный ID заказа
    const orderId = Order.generateOrderId();
    
    // Получаем адрес кошелька для выбранной сети
    const paymentAddress = WALLETS[network];
    if (!paymentAddress) {
      throw new Error(`Кошелек для сети ${network} не настроен`);
    }

    // Создаем заказ
    const order = new Order({
      order_id: orderId,
      buyer_id: buyerId,
      product_id: productId,
      price: totalPrice,
      commission: commission,
      payment_address: paymentAddress,
      payment_network: network,
      status: 'pending'
    });

    // Устанавливаем эскроу
    const escrowHours = parseInt(process.env.ESCROW_HOURS || '24');
    await order.setEscrow(escrowHours);

    await order.save();

    return {
      order,
      qrCode: await generateQRCode(paymentAddress),
      paymentInfo: {
        orderId,
        amount: totalPrice,
        network,
        address: paymentAddress,
        commission,
        productPrice
      }
    };
  } catch (error) {
    console.error('❌ Ошибка создания заказа:', error);
    throw error;
  }
}

/**
 * Проверка транзакций TRC20 (Tron)
 */
async function checkTronTransaction(address, expectedAmount, orderCreatedAt) {
  try {
    if (!tronWeb) {
      throw new Error('TronWeb не инициализирован');
    }

    const contractAddress = USDT_CONTRACTS.TRC20;
    
    // Получаем транзакции через TronGrid API
    const url = `https://api.trongrid.io/v1/accounts/${address}/transactions/trc20`;
    
    const headers = {};
    if (process.env.TRONGRID_API_KEY) {
      headers['TRON-PRO-API-KEY'] = process.env.TRONGRID_API_KEY;
    }
    
    const response = await axios.get(url, {
      params: {
        limit: 50,
        contract_address: contractAddress,
        only_confirmed: true
      },
      headers: headers,
      timeout: 10000
    });

    if (!response.data || !response.data.data) {
      return null;
    }

    // Фильтруем транзакции по времени (только после создания заказа)
    const orderTime = new Date(orderCreatedAt).getTime();
    const transactions = response.data.data.filter(tx => {
      const txTime = tx.block_timestamp || 0;
      return txTime >= orderTime && 
             tx.to === address.toLowerCase() &&
             tx.token_info?.symbol === 'USDT';
    });

    // Проверяем наличие транзакции с нужной суммой
    for (const tx of transactions) {
      const amount = parseFloat(tx.value) / 1000000; // USDT имеет 6 знаков после запятой
      const expected = parseFloat(expectedAmount);
      
      // Допускаем небольшую погрешность (0.01 USDT)
      if (Math.abs(amount - expected) < 0.01) {
        return {
          txHash: tx.transaction_id,
          amount: amount,
          from: tx.from,
          timestamp: new Date(tx.block_timestamp),
          network: 'TRC20'
        };
      }
    }

    return null;
  } catch (error) {
    console.error('❌ Ошибка проверки TRC20 транзакции:', error.message);
    return null;
  }
}

/**
 * Проверка транзакций ERC20 (Ethereum)
 */
async function checkEthereumTransaction(address, expectedAmount, orderCreatedAt) {
  try {
    const apiKey = process.env.ETHERSCAN_API_KEY || '';
    const contractAddress = USDT_CONTRACTS.ERC20;
    
    // Получаем время блока создания заказа (примерно)
    const orderTime = Math.floor(new Date(orderCreatedAt).getTime() / 1000);
    
    const url = `https://api.etherscan.io/api`;
    const params = {
      module: 'account',
      action: 'tokentx',
      contractaddress: contractAddress,
      address: address,
      startblock: 0,
      endblock: 99999999,
      sort: 'desc',
      apikey: apiKey
    };

    const response = await axios.get(url, { params, timeout: 10000 });

    if (response.data.status !== '1' || !response.data.result) {
      return null;
    }

    // Фильтруем транзакции
    const transactions = response.data.result.filter(tx => {
      const txTime = parseInt(tx.timeStamp);
      return txTime >= orderTime && 
             tx.to.toLowerCase() === address.toLowerCase() &&
             tx.tokenSymbol === 'USDT';
    });

    // Проверяем сумму
    for (const tx of transactions) {
      const amount = parseFloat(tx.value) / 1000000; // USDT имеет 6 знаков
      const expected = parseFloat(expectedAmount);
      
      if (Math.abs(amount - expected) < 0.01) {
        return {
          txHash: tx.hash,
          amount: amount,
          from: tx.from,
          timestamp: new Date(parseInt(tx.timeStamp) * 1000),
          network: 'ERC20'
        };
      }
    }

    return null;
  } catch (error) {
    console.error('❌ Ошибка проверки ERC20 транзакции:', error.message);
    return null;
  }
}

/**
 * Проверка транзакций BEP20 (BSC)
 */
async function checkBSCTransaction(address, expectedAmount, orderCreatedAt) {
  try {
    const apiKey = process.env.BSCSCAN_API_KEY || '';
    const contractAddress = USDT_CONTRACTS.BEP20;
    
    const orderTime = Math.floor(new Date(orderCreatedAt).getTime() / 1000);
    
    const url = `https://api.bscscan.com/api`;
    const params = {
      module: 'account',
      action: 'tokentx',
      contractaddress: contractAddress,
      address: address,
      startblock: 0,
      endblock: 99999999,
      sort: 'desc',
      apikey: apiKey
    };

    const response = await axios.get(url, { params, timeout: 10000 });

    if (response.data.status !== '1' || !response.data.result) {
      return null;
    }

    const transactions = response.data.result.filter(tx => {
      const txTime = parseInt(tx.timeStamp);
      return txTime >= orderTime && 
             tx.to.toLowerCase() === address.toLowerCase() &&
             tx.tokenSymbol === 'USDT';
    });

    for (const tx of transactions) {
      const amount = parseFloat(tx.value) / 1000000;
      const expected = parseFloat(expectedAmount);
      
      if (Math.abs(amount - expected) < 0.01) {
        return {
          txHash: tx.hash,
          amount: amount,
          from: tx.from,
          timestamp: new Date(parseInt(tx.timeStamp) * 1000),
          network: 'BEP20'
        };
      }
    }

    return null;
  } catch (error) {
    console.error('❌ Ошибка проверки BEP20 транзакции:', error.message);
    return null;
  }
}

/**
 * Проверка платежа по заказу
 */
async function checkPayment(order) {
  try {
    if (order.status !== 'pending') {
      return { found: false, reason: 'Order already processed' };
    }

    const network = order.payment_network;
    const address = order.payment_address;
    const expectedAmount = order.price;
    const orderCreatedAt = order.created_at;

    let transaction = null;

    switch (network) {
      case 'TRC20':
        transaction = await checkTronTransaction(address, expectedAmount, orderCreatedAt);
        break;
      case 'ERC20':
        transaction = await checkEthereumTransaction(address, expectedAmount, orderCreatedAt);
        break;
      case 'BEP20':
        transaction = await checkBSCTransaction(address, expectedAmount, orderCreatedAt);
        break;
      default:
        return { found: false, reason: 'Unknown network' };
    }

    if (transaction) {
      // Обновляем заказ
      order.status = 'paid';
      order.tx_hash = transaction.txHash;
      order.paid_at = transaction.timestamp;
      await order.save();

      return {
        found: true,
        transaction,
        order
      };
    }

    return { found: false };
  } catch (error) {
    console.error('❌ Ошибка проверки платежа:', error);
    return { found: false, error: error.message };
  }
}

/**
 * Получение текста для платежной инструкции
 */
function getPaymentInstructionsText(paymentInfo, lang = 'ru') {
  const texts = {
    ru: {
      title: '💳 Информация об оплате',
      product: '📦 Товар',
      amount: '💵 Сумма',
      network: '🌐 Сеть',
      orderId: '🆔 ID заказа',
      address: '📍 Адрес кошелька',
      important: '⚠️ Важно',
      note1: '• Отправьте ТОЧНО',
      note2: '• Используйте ТОЛЬКО сеть',
      note3: '• Платеж будет подтвержден автоматически',
      waiting: '⏱️ Ожидание платежа...',
      commission: '💼 Комиссия',
      total: '💰 Итого к оплате'
    },
    en: {
      title: '💳 Payment Information',
      product: '📦 Product',
      amount: '💵 Amount',
      network: '🌐 Network',
      orderId: '🆔 Order ID',
      address: '📍 Wallet Address',
      important: '⚠️ Important',
      note1: '• Send EXACTLY',
      note2: '• Use ONLY',
      note3: '• Payment will be confirmed automatically',
      waiting: '⏱️ Waiting for payment...',
      commission: '💼 Commission',
      total: '💰 Total to pay'
    },
    uk: {
      title: '💳 Інформація про оплату',
      product: '📦 Товар',
      amount: '💵 Сума',
      network: '🌐 Мережа',
      orderId: '🆔 ID замовлення',
      address: '📍 Адреса гаманця',
      important: '⚠️ Важливо',
      note1: '• Надішліть ТОЧНО',
      note2: '• Використовуйте ТІЛЬКИ мережу',
      note3: '• Платіж буде підтверджено автоматично',
      waiting: '⏱️ Очікування платежу...',
      commission: '💼 Комісія',
      total: '💰 Всього до сплати'
    }
  };

  const t = texts[lang] || texts.ru;

  return `
${t.title}

${t.amount}: **${paymentInfo.amount} USDT**
${t.commission}: ${paymentInfo.commission} USDT
${t.total}: **${paymentInfo.amount} USDT**
${t.network}: ${paymentInfo.network}
${t.orderId}: \`${paymentInfo.orderId}\`

${t.address}:
\`${paymentInfo.address}\`

${t.important}:
${t.note1} ${paymentInfo.amount} USDT
${t.note2} ${paymentInfo.network}
${t.note3}

${t.waiting}
  `.trim();
}

module.exports = {
  createPaymentOrder,
  checkPayment,
  checkTronTransaction,
  checkEthereumTransaction,
  checkBSCTransaction,
  generateQRCode,
  getPaymentInstructionsText,
  USDT_CONTRACTS,
  WALLETS
};

