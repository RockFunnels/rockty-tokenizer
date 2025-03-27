# Rockty Tokenizer SDK

O SDK Rockty Tokenizer oferece uma solução para tokenização segura de cartões de crédito, permitindo que você processe pagamentos com facilidade mantendo conformidade com padrões de segurança PCI-DSS.

## Características

- Tokenização segura de cartões diretamente do navegador
- Validação de cartões (algoritmo Luhn)
- Detecção automática de bandeiras
- Formatação de números de cartão
- Compatível com ambientes de sandbox e produção
- Compatível com principais navegadores modernos

## Instalação

### Via CDN (recomendado)

```html
<script src="https://cdn.rockty.com/payments-sdk/v1/rockty-tokenizer-sdk.min.js"></script>
```

### Download direto

Baixe o arquivo `rockty-tokenizer-sdk.js` e inclua-o em seu projeto:

```html
<script src="path/to/rockty-tokenizer-sdk.js"></script>
```

### NPM

```bash
npm install rockty-tokenizer-sdk --save
```

E então importe:

```javascript
import RocktyPaymentsSDK from 'rockty-tokenizer-sdk';
```

## Início Rápido

```javascript
// Inicializar o SDK
const rocktyTokenizer = new RocktyPaymentsSDK({
    apiKey: 'SUA_API_KEY', // Obtenha no dashboard Rockty
});

// Criar token de cartão
rocktyTokenizer.createCardToken({
    card: {
        number: '4111111111111111',
        holder_name: 'NOME DO TITULAR',
        exp_month: '12',
        exp_year: '2028',
        cvv: '123'
    }
})
.then(token => {
    console.log('Token gerado:', token.id);
    // Envie este token para seu servidor para processamento
})
.catch(error => {
    console.error('Erro:', error.message);
});
```

## Guia de Implementação

### 1. Obtenha suas credenciais

Acesse seu [Dashboard Rockty](https://dashboard.rockty.com) e navegue até a seção de Integrações para obter sua chave de API.

### 2. Inicialize o SDK

```javascript
const rocktyTokenizer = new RocktyPaymentsSDK({
    apiKey: 'SUA_API_KEY',
    environment: 'sandbox' // Use 'production' para ambiente de produção
});
```

### 3. Implemente o formulário de pagamento

Crie um formulário para coletar os dados do cartão. Veja um exemplo:

```html
<form id="payment-form">
    <div>
        <label for="card-number">Número do Cartão</label>
        <input type="text" id="card-number">
    </div>
    
    <div>
        <label for="card-holder">Nome do Titular</label>
        <input type="text" id="card-holder">
    </div>
    
    <div>
        <label for="card-expiry-month">Mês de Expiração</label>
        <input type="text" id="card-expiry-month">
    </div>
    
    <div>
        <label for="card-expiry-year">Ano de Expiração</label>
        <input type="text" id="card-expiry-year">
    </div>
    
    <div>
        <label for="card-cvv">CVV</label>
        <input type="text" id="card-cvv">
    </div>
    
    <button type="submit">Pagar</button>
</form>
```

### 4. Tokenize o cartão

```javascript
document.getElementById('payment-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    try {
        // Coletar dados do formulário
        const cardData = {
            card: {
                number: document.getElementById('card-number').value.replace(/\D/g, ''),
                holder_name: document.getElementById('card-holder').value,
                exp_month: document.getElementById('card-expiry-month').value,
                exp_year: document.getElementById('card-expiry-year').value,
                cvv: document.getElementById('card-cvv').value
            }
        };
        
        // Criar token do cartão
        const token = await rocktyTokenizer.createCardToken(cardData);
        
        // Enviar o token para seu servidor
        const response = await fetch('/api/process-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                token: token.id,
                amount: 1000, // Valor em centavos
                // outros dados da transação...
            })
        });
        
        const result = await response.json();
        // Tratar resultado
        
    } catch (error) {
        console.error('Erro:', error.message);
        // Tratar erro
    }
});
```

### 5. Processar o pagamento no seu backend

No seu servidor, utilize o token para processar o pagamento através da API Rockty:

```javascript
// Exemplo em Node.js
const axios = require('axios');

app.post('/api/process-payment', async (req, res) => {
    try {
        const { token, amount } = req.body;
        
        // Chamar API Rockty para processar o pagamento
        const response = await axios.post('https://api.rockty.com/payments/v1/card', {
            token: token,
            amount: amount,
            currency: 'BRL',
            description: 'Compra em sua loja'
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.ROCKTY_SECRET_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        res.json(response.data);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});
```

## Referência da API

### Inicialização

```javascript
const rocktyTokenizer = new RocktyPaymentsSDK(config);
```

#### Parâmetros de configuração

| Parâmetro    | Tipo     | Obrigatório | Descrição                                        |
|--------------|----------|-------------|--------------------------------------------------|
| apiKey       | string   | Sim         | Sua chave de API Rockty                          |
| apiBaseUrl   | string   | Não         | URL base da API. Normalmente não precisa alterar |

### Métodos

#### createCardToken(cardData)

Cria um token para o cartão informado.

```javascript
const token = await rocktyTokenizer.createCardToken({
    card: {
        number: '4111111111111111',
        holder_name: 'NOME DO TITULAR',
        exp_month: '12',
        exp_year: '2028',
        cvv: '123'
    }
});
```

#### validateCardNumber(cardNumber)

Valida se um número de cartão é válido usando o algoritmo de Luhn.

```javascript
const isValid = rocktyTokenizer.validateCardNumber('4111111111111111');
// retorna: true
```

#### detectCardBrand(cardNumber)

Detecta a bandeira do cartão baseado no número.

```javascript
const brand = rocktyTokenizer.detectCardBrand('4111111111111111');
// retorna: 'visa'
```

#### formatCardNumber(cardNumber)

Formata o número do cartão com espaços para melhor visualização.

```javascript
const formatted = rocktyTokenizer.formatCardNumber('4111111111111111');
// retorna: '4111 1111 1111 1111'
```

## Segurança

O SDK Rockty Tokenizer segue as melhores práticas de segurança:

1. **Tokenização**: Dados sensíveis do cartão nunca são armazenados no seu servidor
2. **TLS**: Todas as comunicações são feitas via HTTPS
3. **PCI-DSS**: O SDK atende aos requisitos de conformidade PCI-DSS
4. **Sem armazenamento**: Dados de cartão são enviados diretamente para servidores seguros da Rockty/Pagar.me

## Suporte

Se você tiver dúvidas ou precisar de ajuda:

- Documentação completa: [https://docs.rockty.com/payments-sdk](https://docs.rockty.com/payments-sdk)
- Email de suporte: suporte@rockty.com
- Portal do desenvolvedor: [https://developers.rockty.com](https://developers.rockty.com)

## Licença

MIT