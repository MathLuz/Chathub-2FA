# 🚀 Guia de Deploy - ChatHub 2FA

## Estrutura do Projeto
- **Frontend**: React + Vite
- **Backend**: Express (Node.js)
- **Banco de Dados**: Supabase (já configurado)

---

## 📦 Opção 1: Deploy Separado (RECOMENDADO)

### Frontend na Vercel
1. Acesse [vercel.com](https://vercel.com)
2. Conecte seu repositório GitHub
3. Configure:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

4. **Variáveis de Ambiente** (Settings → Environment Variables):
   ```
   VITE_SUPABASE_URL=https://cegcodttrjdgvanqentc.supabase.co
   VITE_SUPABASE_ANON_KEY=seu_token_aqui
   VITE_API_URL=https://seu-backend.onrender.com
   ```

### Backend no Render.com (GRÁTIS)
1. Acesse [render.com](https://render.com)
2. Crie um novo **Web Service**
3. Conecte seu repositório
4. Configure:
   - **Name**: `chathub-api`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm run dev:api`
   - **Instance Type**: `Free`

5. **Variáveis de Ambiente**:
   ```
   NODE_ENV=production
   PORT=3001
   GROQ_API_KEY=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
   GEMINI_API_KEY=AIzaSyB0lLpvp0A-pmxsMT_MHuIV3USAIDakLks
   VITE_SUPABASE_URL=https://cegcodttrjdgvanqentc.supabase.co
   VITE_SUPABASE_ANON_KEY=seu_token_aqui
   ```

6. Após deploy, copie a URL do backend (ex: `https://chathub-api.onrender.com`)
7. Volte na Vercel e adicione essa URL na variável `VITE_API_URL`

---

## 📦 Opção 2: Tudo na Vercel (Serverless)

### Configuração
1. Na Vercel, importe o repositório
2. Configure:
   - **Framework**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

3. **Variáveis de Ambiente**:
   ```
   VITE_SUPABASE_URL=https://cegcodttrjdgvanqentc.supabase.co
   VITE_SUPABASE_ANON_KEY=seu_token_aqui
   GROQ_API_KEY=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
   GEMINI_API_KEY=AIzaSyB0lLpvp0A-pmxsMT_MHuIV3USAIDakLks
   NODE_ENV=production
   ```

4. O backend vai rodar automaticamente como função serverless em `/api/*`

### Atualizar URL da API no Frontend
Se usar Vercel serverless, não precisa da variável `VITE_API_URL` porque a API estará na mesma URL:
- Frontend: `https://seu-site.vercel.app`
- API: `https://seu-site.vercel.app/api/*`

---

## 🗄️ Redis/KV (Opcional - para produção)

### Usar Vercel KV (Recomendado)
1. No projeto Vercel, vá em **Storage** → **Create Database** → **KV**
2. Crie um banco KV
3. Copie as credenciais e adicione nas variáveis de ambiente:
   ```
   VITE_KV_REST_API_URL=sua_url_kv
   VITE_KV_REST_API_TOKEN=seu_token_kv
   ```

Se não configurar KV, o sistema vai usar armazenamento em memória (funciona, mas dados são perdidos quando o servidor reinicia).

---

## ✅ Checklist Pós-Deploy

- [ ] Frontend carregando corretamente
- [ ] Backend respondendo em `/api/health`
- [ ] Login/Registro funcionando
- [ ] Chat com modelos IA funcionando
- [ ] 2FA funcionando (se configurou Vercel KV)
- [ ] Variáveis de ambiente todas configuradas

---

## 🐛 Troubleshooting

### Erro: "Failed to fetch API"
- Verifique se `VITE_API_URL` está correto
- Certifique-se que o backend está rodando
- Verifique CORS no backend

### Erro: "GROQ_API_KEY not configured"
- Adicione as variáveis de ambiente no serviço de backend
- Reinicie o serviço após adicionar

### 2FA não funciona
- Configure Vercel KV ou outro Redis
- Sem KV, use apenas em desenvolvimento (dados em memória)

---

## 📝 Comandos Úteis

```bash
# Testar localmente antes do deploy
npm install
npm run dev:all

# Build do frontend
npm run build

# Testar build local
npm run preview

# Deploy manual (se não usar CI/CD)
vercel --prod
```

---

## 🎯 URLs Finais Esperadas

**Opção 1 (Separado):**
- Frontend: `https://seu-projeto.vercel.app`
- Backend: `https://chathub-api.onrender.com`

**Opção 2 (Tudo Vercel):**
- Site completo: `https://seu-projeto.vercel.app`
- API: `https://seu-projeto.vercel.app/api/*`

---

## 💡 Dica

Use **Opção 1** (separado) porque:
- Render.com tem plano grátis generoso para backend
- Vercel é perfeito para frontend Vite
- Mais fácil de debugar
- Backend não hiberna (Render Free pode hibernar após 15min sem uso, mas acorda rápido)
