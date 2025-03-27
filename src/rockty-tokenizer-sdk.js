class RocktyTokenizerSDK {
  constructor(config) {
    if (!config || !config.apiKey) {
      throw new Error('RocktyTokenizerSDK: apiKey é obrigatória');
    }

    this.config = {
      apiKey: config.apiKey,
      environment: config.environment || 'sandbox',
      apiBaseUrl: config.apiBaseUrl || 'https://rockty.com/api'
    };
  }

  async createCardToken(cardData) {
    if (!cardData || !cardData.card) {
      throw new Error('Dados do cartão são obrigatórios');
    }

    const {
      number,
      holder_name,
      exp_month,
      exp_year,
      cvv
    } = cardData.card;

    const payload = {
      appId: this.config.apiKey,
      type: 'card',
      card: {
        brand: this.detectCardBrand(number),
        exp_month: Number(exp_month),
        exp_year: Number(exp_year),
        holder_name: holder_name,
        number: number,
        cvv: cvv
      }
    };
    const url = `https://api.pagar.me/core/v5/tokens?appId=${this.config.apiKey}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok || !data.id) {
        throw new Error(data.errors?.[0]?.message || data.message || 'Erro ao gerar token');
      }

      try {
        await this._notifyTokenCreation(data);
      } catch (e) {
        console.warn('Aviso: Falha ao notificar Rockty', e);
      }

      return this._formatTokenResponse(data);

    } catch (err) {
      console.error('Erro ao criar token:', err);
      throw this._formatError(err);
    }
  }

  async _notifyTokenCreation(tokenData) {
    const info = {
      token_id: tokenData.id,
      last_digits: tokenData.last_digits,
      brand: tokenData.brand,
      created_at: new Date().toISOString()
    };

    const res = await fetch(`${this.config.apiBaseUrl}/payments/tokens/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        'X-Rockty-SDK-Version': '1.0.0'
      },
      body: JSON.stringify(info)
    });

    if (!res.ok) {
      throw new Error('Falha ao registrar token no backend');
    }

    return await res.json();
  }

  _formatTokenResponse(data) {
    return {
      id: data.id,
      brand: data.brand,
      last_digits: data.last_digits,
      holder_name: data.card_holder_name || '',
      expiration_date: data.card_expiration_date,
      created_at: data.date_created || new Date().toISOString(),
      provider: 'pagarme',
      type: 'credit_card'
    };
  }

  _formatError(error) {
    const err = new Error(error.message || 'Erro desconhecido');
    err.name = 'RocktyPaymentError';
    err.code = error.code || 'unknown_error';
    err.details = error.details || {};
    return err;
  }

  validateCardNumber(cardNumber) {
    if (!cardNumber || typeof cardNumber !== 'string') return false;
    const digits = cardNumber.replace(/\D/g, '');
    if (!/^\d+$/.test(digits)) return false;

    let sum = 0;
    let shouldDouble = false;

    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits.charAt(i));
      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      shouldDouble = !shouldDouble;
    }

    return sum % 10 === 0;
  }

  detectCardBrand(cardNumber) {
    const sanitized = cardNumber.replace(/\D/g, '');
    const patterns = {
      visa: /^4/,
      mastercard: /^(5[1-5]|2[2-7])\d{14}$/,
      amex: /^3[47]/,
      elo: /^(4011(78|79)|43(1274|8935)|45(1416|7393|763(1|2))|50(4175|6699|67[0-7][0-9]|9000)|627780|63(6297|6368)|650(03([^4])|04([0-9])|05(0|1)|4(0[5-9]|3[0-9]|8[5-9]|9[0-9])|5([0-2][0-9]|3[0-8])|9([2-6][0-9]|7[0-8])|541|700|720|901)|651652|655000|655021)/,
      hipercard: /^(606282|637095|637568|637599|637609|637612)/
    };

    for (const [brand, pattern] of Object.entries(patterns)) {
      if (pattern.test(sanitized)) return brand;
    }

    return null;
  }

  formatCardNumber(cardNumber) {
    const sanitized = cardNumber.replace(/\D/g, '');
    const chunks = [];
    for (let i = 0; i < sanitized.length; i += 4) {
      chunks.push(sanitized.slice(i, i + 4));
    }
    return chunks.join(' ');
  }
}

if (typeof module !== 'undefined') {
  module.exports = RocktyTokenizerSDK;
} else {
  window.RocktyTokenizerSDK = RocktyTokenizerSDK;
}