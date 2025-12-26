# Como Fazer Deploy na Vercel

Seu projeto está pronto para subir! Siga estes passos:

## 1. Configuração na Vercel
Ao importar o projeto na Vercel:

1.  **Framework Preset**: Vite (deve detectar automaticamente).
2.  **Root Directory**: `Anotadordivida` (IMPORTANTE: como você moveu os arquivos, você deve especificar essa pasta).
3.  **Environment Variables**:
    Adicione as seguintes variáveis (copie os valores abaixo):

    - `VITE_SUPABASE_URL`: `https://dfmtoysfvsmcoaosicky.supabase.co`
    - `VITE_SUPABASE_ANON_KEY`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmbXRveXNmdnNtY29hb3NpY2t5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MzAxMTUsImV4cCI6MjA4MjIwNjExNX0.TInj5oUuV_yU1n8AOnqNYbEdOxU6vZr2dPkuhlZuubY`

## 2. Deploy
Clique em **Deploy** e aguarde!

## Notas
- O código foi ajustado para usar essas variáveis de ambiente.
- Se não configurar as v ariáveis, o app ainda funcionará (temos um fallback), mas é **altamente recomendado** configurar para segurança e flexibilidade futura.
