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

## 🔐 Como Funciona

**🎭 Guest (Visitante)**
- Sem cadastro, acesso instantâneo
- Dados salvos em RAM (perdidos ao sair)

**👤 Usuário Autenticado**
- Registro com email/senha
- Sessão salva no Redis (24h)
- Conversas salvas em localStorage
- 2FA opcional

## 📡 API Endpoints

```http
# Auth
POST /api/auth/guest              # Criar sessão guest
POST /api/auth/register           # Registrar usuário
POST /api/auth/login              # Login
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

**Redis (Upstash)**
- **Usuários**: `user:{email}` - senha hash, 2FA config
- **Sessões**: `session:{id}` - TTL 24h
- **Tokens 2FA**: `temp:{token}` - TTL 5min

**Frontend**
- **localStorage**: Conversas de usuários autenticados
- **RAM**: Conversas de guests (volatil)

## 🌐 Acesse Online

**URL**: [https://chathub-2fa.vercel.app/](https://chathub-2fa.vercel.app/)

## 💡 Motivação do Projeto

Este projeto foi criado com dois objetivos principais:
1. **Aprender a implementar autenticação 2FA** - Explorar o protocolo TOTP, geração de QR codes, backup codes e fluxo completo de segurança
2. **Desenvolver um projeto full stack completo** - Frontend e backend integrados no mesmo repositório, com deploy serverless e banco de dados em nuvem

## 👤 Autor

**Matheus Luz**
