/**
 * RocktyTokenizerSDK
 * SDK de pagamentos para integração com a API Rockty
 * 
 * @version 1.0.0
 */
class RocktyTokenizerSDK {
    /**
     * Inicializa o SDK Rockty Payments
     * 
     * @param {Object} config - Configuração do SDK
     * @param {string} config.apiKey - Chave de API do cliente
     * @param {string} config.environment - Ambiente ('sandbox' ou 'production')
     * @param {string} [config.apiBaseUrl] - URL base da API (opcional)
     */
    constructor(config) {
      if (!config || !config.apiKey) {
        throw new Error('RocktyTokenizerSDK: apiKey é obrigatória');
      }
  
      this.config = {
        apiKey: config.apiKey,
        environment: config.environment || 'sandbox',
        apiBaseUrl: config.apiBaseUrl
      };
  
      this._loadPagarmeLibrary();
    }
  
    /**
     * Carrega a biblioteca do Pagar.me dinamicamente
     * @private
     */
    _loadPagarmeLibrary() {
      return new Promise((resolve, reject) => {
        if (window.PagarMe) {
          this.pagarmeClient = this._initPagarmeClient();
          return resolve();
        }
  
        const script = document.createElement('script');
        script.src = 'https://assets.pagar.me/core/pagarme.min.js';
        script.async = true;
        
        script.onload = () => {
          this.pagarmeClient = this._initPagarmeClient();
          resolve();
        };
        
        script.onerror = () => {
          reject(new Error('Falha ao carregar a biblioteca do Pagar.me'));
        };
        
        document.head.appendChild(script);
      });
    }
  
    /**
     * Inicializa o cliente do Pagar.me
     * @private
     */
    _initPagarmeClient() {
      const keys = {
        sandbox: 'pk_test_L6K0QePCoiOP072l',
        production: 'pk_live_SUACHAVEDELIVEAQUI'
      };
  
      return window.PagarMe(keys[this.config.environment]);
    }
  
    /**
     * Garante que a biblioteca do Pagar.me esteja carregada
     * @private
     */
    async _ensureLibraryLoaded() {
      if (!this.pagarmeClient) {
        await this._loadPagarmeLibrary();
      }
      return this.pagarmeClient;
    }
  
    /**
     * Cria um token de cartão de crédito
     * 
     * @param {Object} cardData - Dados do cartão
     * @param {Object} cardData.card - Informações do cartão
     * @param {string} cardData.card.number - Número do cartão
     * @param {string} cardData.card.holder_name - Nome do titular
     * @param {string|number} cardData.card.exp_month - Mês de expiração (1-12)
     * @param {string|number} cardData.card.exp_year - Ano de expiração (YYYY)
     * @param {string} cardData.card.cvv - Código de segurança
     * @returns {Promise<Object>} - Token do cartão
     */
    async createCardToken(cardData) {
      try {
        if (!cardData || !cardData.card) {
          throw new Error('Dados do cartão são obrigatórios');
        }
  
        await this._ensureLibraryLoaded();
 
        const tokenData = {
          card: {
            number: cardData.card.number,
            holder_name: cardData.card.holder_name,
            exp_month: cardData.card.exp_month,
            exp_year: cardData.card.exp_year,
            cvv: cardData.card.cvv
          }
        };
  
        const pagarmeToken = await this.pagarmeClient.tokens.create(tokenData);
        
        if (pagarmeToken && pagarmeToken.id) {
          try {
            await this._notifyTokenCreation(pagarmeToken);
          } catch (notifyError) {
            console.warn('Aviso: Falha ao notificar criação do token', notifyError);
          }
        }
        
        return this._formatTokenResponse(pagarmeToken);
      } catch (error) {
        console.error('Erro ao criar token de cartão:', error);
        throw this._formatError(error);
      }
    }
  
    /**
     * Notifica o backend da Rockty sobre a criação do token
     * @private
     * @param {Object} tokenData - Dados do token criado
     */
    async _notifyTokenCreation(tokenData) {
      const tokenInfo = {
        token_id: tokenData.id,
        last_digits: tokenData.last_digits,
        brand: tokenData.brand,
        created_at: new Date().toISOString()
      };
  
      const response = await fetch(`${this.config.apiBaseUrl}/payments/tokens/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-Rockty-SDK-Version': '1.0.0'
        },
        body: JSON.stringify(tokenInfo)
      });
  
      if (!response.ok) {
        throw new Error(`Falha ao registrar token: ${response.statusText}`);
      }
  
      return await response.json();
    }
  
    /**
     * Formata a resposta do token para o padrão Rockty
     * @private
     * @param {Object} pagarmeToken - Token retornado pelo Pagar.me
     * @returns {Object} - Token formatado no padrão Rockty
     */
    _formatTokenResponse(pagarmeToken) {
      return {
        id: pagarmeToken.id,
        brand: pagarmeToken.brand,
        last_digits: pagarmeToken.last_digits,
        holder_name: pagarmeToken.holder_name,
        expiration_date: `${pagarmeToken.exp_month}/${pagarmeToken.exp_year}`,
        created_at: pagarmeToken.created_at || new Date().toISOString(),
        provider: 'pagarme',
        type: 'credit_card'
      };
    }
  
    /**
     * Formata erros para o padrão Rockty
     * @private
     * @param {Error} error - Erro original
     * @returns {Error} - Erro formatado
     */
    _formatError(error) {
      const rocktyError = new Error(error.message || 'Erro desconhecido ao processar pagamento');
      rocktyError.name = 'RocktyPaymentError';
      rocktyError.code = error.code || 'unknown_error';
      rocktyError.details = error.details || {};
      rocktyError.originalError = error;
      
      return rocktyError;
    }
  
    /**
     * Verifica se um número de cartão é válido (Luhn check)
     * 
     * @param {string} cardNumber - Número do cartão
     * @returns {boolean} - Verdadeiro se o número for válido
     */
    validateCardNumber(cardNumber) {
      if (!cardNumber || typeof cardNumber !== 'string') {
        return false;
      }
  
      const sanitized = cardNumber.replace(/[\s-]/g, '');
      
      if (!/^\d+$/.test(sanitized)) {
        return false;
      }
      
      // Implementação do algoritmo de Luhn
      let sum = 0;
      let shouldDouble = false;
      
      for (let i = sanitized.length - 1; i >= 0; i--) {
        let digit = parseInt(sanitized.charAt(i));
        
        if (shouldDouble) {
          digit *= 2;
          if (digit > 9) {
            digit -= 9;
          }
        }
        
        sum += digit;
        shouldDouble = !shouldDouble;
      }
      
      return sum % 10 === 0;
    }
  
    /**
     * Detecta a bandeira do cartão baseado no número
     * 
     * @param {string} cardNumber - Número do cartão
     * @returns {string|null} - Nome da bandeira ou null se não for reconhecida
     */
    detectCardBrand(cardNumber) {
      if (!cardNumber || typeof cardNumber !== 'string') {
        return null;
      }
 
      const sanitized = cardNumber.replace(/[\s-]/g, '');
      
      const patterns = {
        visa: /^4/,
        mastercard: /^(5[1-5]|2[2-7])\d{14}$/,
        amex: /^3[47]/,
        elo: /^(4011(78|79)|43(1274|8935)|45(1416|7393|763(1|2))|50(4175|6699|67[0-7][0-9]|9000)|627780|63(6297|6368)|650(03([^4])|04([0-9])|05(0|1)|4(0[5-9]|3[0-9]|8[5-9]|9[0-9])|5([0-2][0-9]|3[0-8])|9([2-6][0-9]|7[0-8])|541|700|720|901)|651652|655000|655021)/,
        hipercard: /^(606282|637095|637568|637599|637609|637612)/
      };
      
      for (const [brand, pattern] of Object.entries(patterns)) {
        if (pattern.test(sanitized)) {
          return brand;
        }
      }
      
      return null;
    }
  
    /**
     * Formata o número do cartão com espaços
     * 
     * @param {string} cardNumber - Número do cartão
     * @returns {string} - Número formatado
     */
    formatCardNumber(cardNumber) {
      if (!cardNumber) return '';
      
      const sanitized = cardNumber.replace(/\D/g, '');
      const chunks = [];
      
      for (let i = 0; i < sanitized.length; i += 4) {
        chunks.push(sanitized.substr(i, 4));
      }
      
      return chunks.join(' ');
    }
  }
  
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = RocktyTokenizerSDK;
  } else if (typeof define === 'function' && define.amd) {
    define([], function() {
      return RocktyTokenizerSDK;
    });
  } else {
    window.RocktyTokenizerSDK = RocktyTokenizerSDK;
  }