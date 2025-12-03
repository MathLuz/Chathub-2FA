# 🚀 Deploy Rápido na Vercel - Opção A (Tudo Junto)

## ✅ Está tudo pronto! Seu projeto já está configurado.

### Passo a Passo:

1. **Acesse** [vercel.com](https://vercel.com) e faça login com GitHub

2. **Clique** em "Add New Project" ou "Import Project"

3. **Selecione** seu repositório: `MathLuz/Chathub-2FA`

4. **Configure** o projeto:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./` (deixa padrão)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

5. **Adicione as Variáveis de Ambiente** (clique em "Environment Variables"):
   ```
   VITE_SUPABASE_URL=https://cegcodttrjdgvanqentc.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlZ2NvZHR0cmpkZ3ZhbnFlbnRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNjIxNjksImV4cCI6MjA3NzkzODE2OX0.o1vTkg9cUlsy2c17YUowpnN9GvD0UQtYjTho4_pq_8A
   GROQ_API_KEY=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
   GEMINI_API_KEY=AIzaSyB0lLpvp0A-pmxsMT_MHuIV3USAIDakLks
   NODE_ENV=production
   ```

6. **Clique** em "Deploy" e aguarde (~2 minutos)

7. **Pronto!** 🎉 Seu site estará no ar em: `https://seu-projeto.vercel.app`

---

## 🧪 Como Testar

Após o deploy, teste:
- ✅ Página inicial carrega
- ✅ Login/Registro funciona
- ✅ Chat funciona (envie uma mensagem)
- ✅ Troca de modelo funciona
- ✅ 2FA funciona (se habilitado)

---

## 🔧 Se der algum erro

1. Vá em **Deployments** → Clique no deploy mais recente
2. Veja os **logs** para identificar o erro
3. Verifique se todas as variáveis de ambiente foram adicionadas
4. Se precisar, faça um novo deploy clicando em "Redeploy"

---

## 🎯 Importante

- **Frontend e Backend** estão juntos na mesma URL
- O backend roda em `/api/*` (ex: `/api/chat/groq`)
- Não precisa configurar CORS ou URLs separadas
- Os dados 2FA ficam em memória (se quiser persistir, configure Vercel KV)

---

## 📱 Compartilhar

Depois do deploy, você pode compartilhar o link:
`https://seu-projeto.vercel.app`

Todo mundo poderá usar o chat com os modelos de IA! 🚀
