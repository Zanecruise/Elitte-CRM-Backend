# Backend Deployment Guide (Cloud Run + Cloud SQL)

## 1. Preparar variaveis de ambiente

Crie um segredo no Secret Manager com o conteudo do seu `.env` de producao:

```bash
gcloud secrets create elitte-backend-env --data-file=.env
```

Mantenha as duas strings para facilitar o desenvolvimento local (`LOCAL_DATABASE_URL`) e a producao (`DATABASE_URL`). Para gerar o segredo de producao, use o formato do Cloud SQL Connector:

```
LOCAL_DATABASE_URL=postgresql://postgres:SUA_SENHA@localhost:5432/postgres
DATABASE_URL=postgresql://postgres:SUA_SENHA@localhost:5432/postgres?host=/cloudsql/YOUR_PROJECT_ID:southamerica-east1:elitte-crm-db&sslmode=disable
PORT=3000
FRONTEND_URLS=https://seu-frontend.vercel.app
API_BASE_PATHS=/api,/
GEMINI_API_KEY=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
COOKIE_KEY=...
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_SAMESITE=none
# Opcional: FORCE_SECURE_COOKIES=true (usa a mesma forca bruta do auto-detect)
```

O `API_BASE_PATHS=/api,/` garante que o backend responda tanto por `/api/...` (uso recomendado) quanto por rotas sem prefixo, facilitando integrações que ainda apontam para `/auth`, `/clients`, etc. Ajuste a lista (separada por vírgula) conforme necessário.

> **Cookies em ambientes hospedados**  
> Alguns provedores (ex.: Cloud Run) não definem `NODE_ENV=production`. O backend agora detecta automaticamente o Cloud Run, mas você ainda pode controlar explicitamente o comportamento com as variáveis `SESSION_COOKIE_SECURE`, `SESSION_COOKIE_SAMESITE` ou `FORCE_SECURE_COOKIES`. Deixe-as vazias em ambiente local (o padrão fica `SameSite=Lax` sem `Secure`) e, em produção, use `SESSION_COOKIE_SECURE=true` + `SESSION_COOKIE_SAMESITE=none` para permitir cookies cross-site.

## 2. Construir e publicar a imagem

Da pasta `backend/`:

```bash
gcloud builds submit --config cloudbuild.yaml   --substitutions=_REGION=southamerica-east1,_SERVICE_ACCOUNT=cloud-run-crm@YOUR_PROJECT_ID.iam.gserviceaccount.com,_CLOUD_SQL_CONNECTION=YOUR_PROJECT_ID:southamerica-east1:elitte-crm-db,_SERVICE_NAME=elitte-backend
```

## 3. Implantar no Cloud Run

> Importante: o Cloud Run exige que o container escute na porta indicada pela plataforma (8080 por padrao). Nao defina manualmente a variavel `PORT`; basta deixar o servico usar o valor que o Cloud Run injeta automaticamente.

```bash
gcloud run deploy elitte-backend   --image gcr.io/YOUR_PROJECT_ID/elitte-backend   --region southamerica-east1   --allow-unauthenticated   --service-account cloud-run-crm@YOUR_PROJECT_ID.iam.gserviceaccount.com   --add-cloudsql-instances YOUR_PROJECT_ID:southamerica-east1:elitte-crm-db   --update-secrets DATABASE_URL=elitte-backend-env:latest,GEMINI_API_KEY=elitte-backend-env:latest,GOOGLE_CLIENT_ID=elitte-backend-env:latest,GOOGLE_CLIENT_SECRET=elitte-backend-env:latest,COOKIE_KEY=elitte-backend-env:latest,FRONTEND_URLS=elitte-backend-env:latest
```

Ajuste os nomes dos segredos conforme necessario.

## 4. Testar

Use a URL do Cloud Run para testar:

```bash
curl https://elitte-backend-xxxxx.run.app/api/health
```

Se precisar atualizar apenas variaveis:

```bash
gcloud run services update elitte-backend   --region southamerica-east1   --set-env-vars FRONTEND_URLS=https://novo-frontend.com
```

