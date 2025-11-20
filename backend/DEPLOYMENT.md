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
GEMINI_API_KEY=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
COOKIE_KEY=...
```

## 2. Construir e publicar a imagem

Da pasta `backend/`:

```bash
gcloud builds submit --config cloudbuild.yaml   --substitutions=_REGION=southamerica-east1,_SERVICE_ACCOUNT=cloud-run-crm@YOUR_PROJECT_ID.iam.gserviceaccount.com,_CLOUD_SQL_CONNECTION=YOUR_PROJECT_ID:southamerica-east1:elitte-crm-db,_SERVICE_NAME=elitte-backend
```

## 3. Implantar no Cloud Run

```bash
gcloud run deploy elitte-backend   --image gcr.io/YOUR_PROJECT_ID/elitte-backend   --region southamerica-east1   --allow-unauthenticated   --service-account cloud-run-crm@YOUR_PROJECT_ID.iam.gserviceaccount.com   --add-cloudsql-instances YOUR_PROJECT_ID:southamerica-east1:elitte-crm-db   --set-env-vars PORT=3000   --update-secrets DATABASE_URL=elitte-backend-env:latest,GEMINI_API_KEY=elitte-backend-env:latest,GOOGLE_CLIENT_ID=elitte-backend-env:latest,GOOGLE_CLIENT_SECRET=elitte-backend-env:latest,COOKIE_KEY=elitte-backend-env:latest,FRONTEND_URLS=elitte-backend-env:latest
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

