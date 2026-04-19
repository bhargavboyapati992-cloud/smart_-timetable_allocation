#!/bin/bash
# Google Cloud Run Deployment Script

echo "1. Building Python Backend Container..."
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/timetable-backend backend/

echo "2. Deploying Backend to Cloud Run..."
gcloud run deploy timetable-backend \
  --image gcr.io/YOUR_PROJECT_ID/timetable-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated # We use IAP for firewall

echo "3. Building React Frontend Container..."
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/timetable-frontend frontend/

echo "4. Deploying Frontend to Cloud Run..."
gcloud run deploy timetable-frontend \
  --image gcr.io/YOUR_PROJECT_ID/timetable-frontend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated # We use IAP for firewall

echo "Done! To enable the Firewall, go to GCP Console -> Security -> Identity-Aware Proxy."
echo "Turn on IAP for these Cloud Run services and grant the 'IAP-secured Web App User' role solely to your '@college.edu' domain!"
