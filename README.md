# ChatHub - Sistema de Chat Multi-IA com Autenticação 2FA

## 🚀 Visão Geral

ChatHub é uma plataforma de chat moderna com múltiplos modelos de IA, autenticação segura e 2FA opcional. Este projeto demonstra:

- ✅ **Login Opcional**: Use como guest ou crie uma conta
- ✅ **2FA Opcional**: Habilite/desabilite autenticação de dois fatores quando quiser
- ✅ **Redis/Vercel KV**: Sistema de armazenamento distribuído
- ✅ **Segurança**: Senhas hash com bcrypt, sessões seguras
- ✅ **Multi-IA**: Suporte para Groq, Gemini e OpenAI
- ✅ **TypeScript**: Type-safe em todo o projeto

## 📁 Estrutura do Projeto

```
project/
├── api/
│   ├── server.ts              # API Express com endpoints de auth
│   └── auth/                  # Endpoints de autenticação
├── src/
│   ├── components/            # Componentes React
│   │   ├── Auth.tsx          # Login/Registro com opção Guest
│   │   ├── Verify2FA.tsx     # Verificação de código 2FA
│   │   ├── TwoFASetup.tsx    # Setup de 2FA (opcional)
│   │   ├── Chat.tsx          # Interface principal
│   │   └── Sidebar.tsx       # Menu lateral com gerenciamento 2FA
│   ├── services/             # Serviços backend
│   │   ├── redis.ts          # Cliente Redis/Vercel KV
│   │   └── auth.ts           # Lógica de autenticação
│   ├── hooks/                # React Hooks customizados
│   │   └── useAuth.ts        # Hook de autenticação
│   ├── types/                # TypeScript types
│   │   └── auth.ts           # Tipos de autenticação
│   ├── utils/                # Utilitários
│   │   ├── bcrypt.ts         # Hash de senhas (Web Crypto API)
│   │   └── totp.ts           # TOTP para 2FA
│   └── lib/                  # Bibliotecas auxiliares
├── .env.example              # Variáveis de ambiente exemplo
├── package.json              # Dependências
├── tsconfig.json             # Config TypeScript frontend
├── tsconfig.api.json         # Config TypeScript API
└── README.md                 # Este arquivo
```

## 🔧 Setup Inicial

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env`:

```bash
copy .env.example .env
```

### 3. Configurar Redis/Vercel KV

Você tem 3 opções:

#### Opção A: Vercel KV (Recomendado para produção)

1. Acesse [Vercel Dashboard](https://vercel.com/dashboard)
2. Crie um novo KV Storage
3. Copie as credenciais para o `.env`:

```env
VITE_KV_REST_API_URL=https://your-kv.vercel-storage.com
VITE_KV_REST_API_TOKEN=your_token_here
VITE_KV_REST_API_READ_ONLY_TOKEN=your_readonly_token
```

#### Opção B: Redis Cloud (Upstash, Redis Labs, etc.)

```env
VITE_REDIS_URL=redis://default:password@host:port
```

#### Opção C: Desenvolvimento Local (Fallback)

Se nenhuma configuração Redis for fornecida, o sistema usa `localStorage` automaticamente como fallback.

### 4. Configurar APIs de IA (Opcional)

Para usar o chat com IA, adicione as chaves das APIs ao `.env`:

```env
# API Server
VITE_API_URL=http://localhost:3001

# Groq (Gratuito) - https://console.groq.com/keys
GROQ_API_KEY=gsk_...

# Google Gemini - https://ai.google.dev
GEMINI_API_KEY=AIza...

# OpenAI - https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-...
```

## 🚀 Executar o Projeto

### Desenvolvimento

Execute frontend e API simultaneamente:

```bash
npm run dev:all
```

Ou execute separadamente:

```bash
# Terminal 1 - Frontend (Vite)
npm run dev

# Terminal 2 - API (Express)
npm run dev:api
```

### Produção

```bash
# Build frontend
npm run build

# Build API
npm run build:api

# Start API
npm run start:api
```

## 🔐 Fluxo de Autenticação

### 1. Opções de Acesso

- **Guest**: Acesso imediato sem conta
- **Registro**: Criar conta com email/senha
- **Login**: Entrar com credenciais existentes

### 2. Login com 2FA (Opcional)

```
1. Usuário faz login
2. Sistema verifica se 2FA está habilitado
3. Se SIM: Solicita código do app authenticator
4. Se NÃO: Login direto
```

### 3. Setup de 2FA

```
1. Usuário acessa Sidebar → "Enable 2FA"
2. Sistema gera secret e QR code
3. Usuário escaneia com Google Authenticator/Authy
4. Usuário verifica código de 6 dígitos
5. Sistema salva backup codes
```

### 4. Gerenciamento de 2FA

- **Habilitar**: Sidebar → "Enable 2FA" → Escanear QR → Verificar
- **Desabilitar**: Sidebar → "Disable 2FA" → Confirmar

## 📊 Endpoints da API

### Autenticação

```http
POST /api/auth/guest
# Criar sessão guest
Response: { success, user, session }

POST /api/auth/register
Body: { email, password }
# Registrar novo usuário
Response: { success, user, session }

POST /api/auth/login
Body: { email, password }
# Login (pode retornar tempToken se 2FA habilitado)
Response: { success, user, session, requires2FA?, tempToken? }

POST /api/auth/verify-2fa
Body: { tempToken, code }
# Verificar código 2FA
Response: { success, user, session }

POST /api/auth/logout
Body: { sessionId }
# Logout
Response: { success }
```

### 2FA Management

```http
POST /api/auth/setup-2fa
Body: { email }
# Gerar secret e QR code
Response: { success, secret, qrCode, backupCodes }

POST /api/auth/enable-2fa
Body: { email, code }
# Habilitar 2FA após verificação
Response: { success }

POST /api/auth/disable-2fa
Body: { email }
# Desabilitar 2FA
Response: { success }
```

## � API Endpoints

### Chat com IA

```http
POST /api/chat
Body: { messages: [{role, content}], model: string }
# Proxy para APIs de IA (Groq, Gemini, OpenAI)
Response: { response: string }
```

## �🗄️ Estrutura de Dados no Redis

### Usuários

```
Key: user:{email}
Value: {
  email: string
  passwordHash: string
  secret2FA?: string
  has2FAEnabled: boolean
  backupCodes?: string[]
  createdAt: number
  lastLogin?: number
}
```

### Sessões

```
Key: session:{sessionId}
Value: {
  userId: string
  email: string
  isGuest: boolean
  has2FAEnabled: boolean
  expiresAt: number
}
TTL: 24 horas
```

### Tokens Temporários (2FA)

```
Key: temp:{token}
Value: {
  email: string
  userId: string
}
TTL: 5 minutos
```

## 🔒 Segurança

### Hash de Senhas

- Utiliza PBKDF2 com 1024 iterações (2^10)
- Salt aleatório de 16 bytes
- Formato: `$2a$10$salt$hash`

### Sessões

- Expiram em 24 horas
- Armazenadas no Redis com TTL
- Validadas a cada requisição

### 2FA

- TOTP (Time-based One-Time Password)
- Secret de 20 bytes (160 bits)
- Janela de tempo: 30 segundos
- Backup codes: 10 códigos de 8 caracteres

## 🎨 Funcionalidades do Frontend

### Modo Guest

- Acesso imediato sem cadastro
- Histórico local (localStorage)
- Banner identificando como guest
- Opção de criar conta depois

### Modo Autenticado

- Histórico sincronizado
- Perfil com email
- Gerenciamento de 2FA
- Múltiplas sessões

### Interface

- Design moderno com Tailwind CSS
- Responsivo (mobile-friendly)
- Dark mode
- Animações suaves
- Feedback visual de loading/erro

## 🧪 Testando o Sistema

### 1. Teste Guest

```
1. Abra o app
2. Clique em "Continue as Guest"
3. Use o chat normalmente
```

### 2. Teste Registro

```
1. Clique em "Sign Up"
2. Digite email e senha
3. Login automático após registro
4. Sistema oferece setup de 2FA (pode pular)
```

### 3. Teste 2FA

```
1. Faça login
2. Sidebar → "Enable 2FA"
3. Escaneie QR code com app authenticator
4. Digite código de 6 dígitos
5. Salve backup codes
6. Logout e login novamente
7. Sistema solicita código 2FA
```

## 📱 Apps Authenticator Recomendados

- **Google Authenticator**: iOS / Android
- **Authy**: iOS / Android / Desktop
- **Microsoft Authenticator**: iOS / Android
- **1Password**: Premium

## 🐛 Troubleshooting

### Redis não conecta

- **Problema**: `Redis error: 401 Unauthorized`
- **Solução**: Verifique VITE_KV_REST_API_TOKEN no .env
- **Fallback**: Sistema usa localStorage automaticamente

### 2FA código inválido

- **Problema**: "Invalid 2FA code"
- **Causa**: Hora do sistema dessincronizada
- **Solução**: Sincronize a hora do sistema/dispositivo

### Sessão expira rapidamente

- **Problema**: Logout automático
- **Causa**: Redis não configurado (localStorage não persiste expiração)
- **Solução**: Configure Redis ou ajuste SESSION_EXPIRY

## 🚢 Deploy

### Vercel (Recomendado)

```bash
# Deploy frontend
vercel

# Deploy API
vercel --prod
```

Configure as variáveis de ambiente no dashboard da Vercel.

### Docker

```dockerfile
# Dockerfile exemplo
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "run", "start:api"]
```

## 📈 Próximos Passos

- [ ] Rate limiting nos endpoints de auth
- [ ] Email verification no registro
- [ ] Password reset com email
- [ ] OAuth (Google, GitHub)
- [ ] Logs de atividade
- [ ] Admin dashboard
- [ ] API rate limits
- [ ] Websockets para chat real-time

## 🤝 Contribuindo

Este é um projeto de portfólio, mas sugestões são bem-vindas!

## 📝 Licença

MIT License - Use como quiser!

## 👨‍💻 Autor

Desenvolvido para demonstrar habilidades em:
- React + TypeScript
- Node.js + Express
- Redis/Vercel KV
- Autenticação segura
- 2FA/TOTP
- Clean Architecture
- Modern UI/UX

---

## 🎯 Comandos Rápidos

```bash
# Desenvolvimento
npm run dev:all

# Apenas frontend
npm run dev

# Apenas API
npm run dev:api

# Build
npm run build
npm run build:api

# Type checking
npm run typecheck

# Lint
npm run lint
```

## 📞 Suporte

Problemas? Abra uma issue no GitHub ou entre em contato!
