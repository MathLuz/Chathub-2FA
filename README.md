# ChatHub - Sistema de Chat Multi-IA com Autenticação 2FA

## 🚀 Visão Geral

Plataforma de chat moderna com múltiplos modelos de IA e autenticação 2FA opcional.

**Stack:**
- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Express.js serverless (Vercel)
- **Database**: Upstash Redis (sessões e dados)
- **IA**: Groq (Llama, Mixtral) + Google Gemini
- **Auth**: TOTP 2FA com backup codes

**Funcionalidades:**
- ✅ Login como guest (sem cadastro, dados em RAM)
- ✅ Login seguro com email/senha
- ✅ 2FA opcional com Google Authenticator
- ✅ Múltiplos modelos de IA
- ✅ Histórico de conversas (localStorage para usuários, RAM para guests)
- ✅ Design responsivo e moderno

## 🔧 Setup Rápido

### 1. Instalar Dependências
```bash
npm install
```

### 2. Configurar `.env`
```env
# Upstash Redis (obrigatório para usuários autenticados)
KV_REST_API_URL=https://your-redis.upstash.io
KV_REST_API_TOKEN=your_token

# APIs de IA (escolha pelo menos uma)
GROQ_API_KEY=gsk_...          # Gratuito - console.groq.com
GEMINI_API_KEY=AIza...        # Gratuito - ai.google.dev
```

**Importante:** 
- Guests não precisam de Redis (dados em RAM)
- Usuários autenticados salvam sessões no Redis
- Conversas ficam em localStorage (ou RAM para guests)

## 🚀 Executar

```bash
# Desenvolvimento (frontend + API)
npm run dev:all

# Produção
npm run build
npm run start:api
```

## 🔐 Como Funciona

### Modos de Acesso

**🎭 Guest (Visitante)**
- Sem cadastro, acesso instantâneo
- Dados salvos em RAM (perdidos ao sair)
- Não salva nada no Redis ou localStorage
- Banner azul identifica modo guest

**👤 Usuário Autenticado**
- Registro com email/senha
- Sessão salva no Redis (24h)
- Conversas salvas em localStorage
- 2FA opcional

### 2FA (Opcional)

1. Login → Sidebar → "Enable 2FA"
2. Escaneia QR code com Google Authenticator
3. Digita código de 6 dígitos
4. Botão "Cancelar" se desistir
5. Salva backup codes
6. Próximo login pede código 2FA

## � API Endpoints

```http
# Auth
POST /api/auth/guest              # Criar sessão guest (sem Redis)
POST /api/auth/register           # Registrar usuário
POST /api/auth/login              # Login (retorna tempToken se 2FA habilitado)
POST /api/auth/verify-2fa         # Verificar código 2FA
POST /api/auth/logout             # Logout

# 2FA Management
POST /api/auth/setup-2fa          # Gerar QR code
POST /api/auth/enable-2fa         # Ativar 2FA
POST /api/auth/disable-2fa        # Desativar 2FA

# Chat
POST /api/chat                    # Enviar mensagem para IA
```

## 🗄️ Arquitetura de Dados

### Redis (Upstash)
- **Usuários**: `user:{email}` - senha hash, 2FA config
- **Sessões**: `session:{id}` - TTL 24h (guests não salvam)
- **Tokens 2FA**: `temp:{token}` - TTL 5min

### Frontend
- **localStorage**: Conversas de usuários autenticados
- **RAM**: Conversas de guests (volatil)
- **Context API**: Estado global de auth

### Segurança
- Senhas: PBKDF2 com 1024 iterações
- 2FA: TOTP (30s window, tolerância de 60s)
- Sessões: Expiração automática no Redis

## 🎨 Features

- **Chat Multi-Modelo**: Alterna entre Llama, Mixtral, Gemini
- **Histórico Persistente**: Conversas salvas automaticamente
- **Sidebar Responsiva**: Lista de conversas com busca
- **Dark Mode**: Design moderno com gradientes
- **Loading States**: Feedback visual em todas as ações
- **Error Handling**: Mensagens de erro claras

## 🧪 Testando

1. **Guest**: "Continue as Guest" → chat funciona, dados em RAM
2. **Registro**: "Sign Up" → pode pular 2FA → conversas em localStorage
3. **2FA**: Login → Enable 2FA → QR code → código → backup codes

## 🐛 Troubleshooting

| Problema | Solução |
|----------|---------|
| 2FA código inválido | Sincronize hora do celular/servidor |
| Redis não conecta | Verifique KV_REST_API_TOKEN no .env |
| Sessão expira rápido | Configure Redis corretamente |

## 🚢 Deploy

Deploy na Vercel em 2 comandos:
```bash
vercel
vercel --prod
```

Configure as env vars no dashboard: `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `GROQ_API_KEY`

---


## 🌐 Demo Online

**URL**: [https://chathub-2fa.vercel.app/](https://chathub-2fa.vercel.app/)

Entre e teste como guest ou registre uma conta para explorar todas as funcionalidades!

## 👤 Autor

**Matheus Luz**

