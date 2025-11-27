#!/bin/bash

# Script de despliegue para Google Cloud Run
# Este script automatiza el proceso de despliegue

set -e

echo "🚀 Iniciando despliegue en Google Cloud Run..."

# Verificar que gcloud está instalado
if ! command -v gcloud &> /dev/null; then
    echo "❌ Error: Google Cloud SDK no está instalado"
    echo "Descárgalo desde: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Leer configuración
echo ""
read -p "Ingresa tu PROJECT_ID de Google Cloud: " PROJECT_ID
read -p "Ingresa la región (default: us-central1): " REGION
REGION=${REGION:-us-central1}

echo ""
echo "📝 Configuración:"
echo "  - Project: $PROJECT_ID"
echo "  - Region: $REGION"
echo ""

# Configurar proyecto
echo "🔧 Configurando proyecto..."
gcloud config set project $PROJECT_ID
gcloud config set run/region $REGION

# Construir imagen
echo ""
echo "🏗️  Construyendo imagen de Docker..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/formulario-pagos

# Obtener variables de entorno
echo ""
echo "📋 Configurando variables de entorno..."
echo "Por favor ingresa la siguiente información:"
echo ""
read -p "Supabase DATABASE_URL: " DATABASE_URL
read -p "Resend API Key: " RESEND_API_KEY
read -p "Email FROM (default: onboarding@resend.dev): " EMAIL_FROM
EMAIL_FROM=${EMAIL_FROM:-onboarding@resend.dev}
read -p "Email TO: " EMAIL_TO
read -p "Email CC (opcional): " EMAIL_CC

# Generar SESSION_SECRET
SESSION_SECRET=$(openssl rand -hex 32)

# Desplegar
echo ""
echo "🚢 Desplegando en Cloud Run..."
gcloud run deploy formulario-pagos \
  --image gcr.io/$PROJECT_ID/formulario-pagos \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production \
  --set-env-vars DATABASE_URL="$DATABASE_URL" \
  --set-env-vars SESSION_SECRET="$SESSION_SECRET" \
  --set-env-vars RESEND_API_KEY="$RESEND_API_KEY" \
  --set-env-vars EMAIL_FROM="$EMAIL_FROM" \
  --set-env-vars EMAIL_TO="$EMAIL_TO" \
  --set-env-vars EMAIL_TO_CC="$EMAIL_CC" \
  --max-instances=10 \
  --min-instances=0 \
  --memory=512Mi \
  --cpu=1 \
  --timeout=60

echo ""
echo "✅ Despliegue completado!"
echo ""
echo "🌐 Tu aplicación está disponible en:"
gcloud run services describe formulario-pagos --format="value(status.url)"
echo ""
