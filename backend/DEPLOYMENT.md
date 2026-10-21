# MLviz Backend Deployment Guide

> AI generated. Verification to be done later.

This guide covers deploying the FastAPI backend to **Google Cloud Run**.

## 📋 Prerequisites

1. **Google Cloud Project**

    - Create a GCP project at [console.cloud.google.com](https://console.cloud.google.com)
    - Enable billing
    - Note your Project ID

2. **Enable Required APIs**

    ```bash
    gcloud services enable \
      cloudbuild.googleapis.com \
      run.googleapis.com \
      containerregistry.googleapis.com
    ```

3. **Install Tools**
    - [gcloud CLI](https://cloud.google.com/sdk/docs/install)
    - Docker (for local testing)

---

## 🚀 Deployment Options

### Option 1: GitHub Actions (Recommended for Production)

#### Step 1: Set up Workload Identity Federation

This is more secure than using service account keys:

```bash
# Set variables
PROJECT_ID="your-project-id"
REGION="asia-southeast1"  # Or your preferred region
POOL_NAME="github-pool"
PROVIDER_NAME="github-provider"
SERVICE_ACCOUNT="github-actions-sa"
REPO="your-username/your-repo"  # e.g., "kumar2215/mlviz"

# Create service account
gcloud iam service-accounts create ${SERVICE_ACCOUNT} \
  --display-name="GitHub Actions Service Account"

# Grant necessary roles
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Create Workload Identity Pool
gcloud iam workload-identity-pools create ${POOL_NAME} \
  --location="global" \
  --display-name="GitHub Pool"

# Create Workload Identity Provider
gcloud iam workload-identity-pools providers create-oidc ${PROVIDER_NAME} \
  --location="global" \
  --workload-identity-pool=${POOL_NAME} \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
  --attribute-condition="assertion.repository_owner == 'your-github-username'" \
  --issuer-uri="https://token.actions.githubusercontent.com"

# Get the Workload Identity Provider resource name
WORKLOAD_IDENTITY_PROVIDER=$(gcloud iam workload-identity-pools providers describe ${PROVIDER_NAME} \
  --workload-identity-pool=${POOL_NAME} \
  --location="global" \
  --format="value(name)")

# Allow the GitHub repository to authenticate
gcloud iam service-accounts add-iam-policy-binding \
  ${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/${WORKLOAD_IDENTITY_PROVIDER}/attribute.repository/${REPO}"

echo "Workload Identity Provider: ${WORKLOAD_IDENTITY_PROVIDER}"
```

#### Step 2: Add GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:

| Secret Name           | Value                                | Example                                             |
| --------------------- | ------------------------------------ | --------------------------------------------------- |
| `GCP_PROJECT_ID`      | Your GCP project ID                  | `my-mlviz-project`                                  |
| `GCP_REGION`          | Deployment region                    | `asia-southeast1`                                   |
| `WIF_PROVIDER`        | Workload Identity Provider           | `projects/123.../locations/global/...`              |
| `WIF_SERVICE_ACCOUNT` | Service account email                | `github-actions-sa@project.iam.gserviceaccount.com` |
| `FRONTEND_URL`        | Your frontend URL (after deployment) | `https://mlviz-frontend-xyz.run.app`                |

#### Step 3: Deploy

Push to the `main` branch or manually trigger the workflow:

```bash
git add .
git commit -m "Deploy backend to Cloud Run"
git push origin main
```

The GitHub Action will automatically:

1. Build the Docker image
2. Push to Google Container Registry
3. Deploy to Cloud Run
4. Test the deployment

---

### Option 2: Manual Deployment (For Testing)

#### Step 1: Authenticate

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

#### Step 2: Build and Deploy

```bash
cd backend

# Build the image
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/mlviz-backend

# Deploy to Cloud Run
gcloud run deploy mlviz-backend \
  --image gcr.io/YOUR_PROJECT_ID/mlviz-backend \
  --platform managed \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 10 \
  --set-env-vars "DEBUG=false"
```

#### Step 3: Set Frontend URL

After deploying your frontend, update the backend:

```bash
gcloud run services update mlviz-backend \
  --region asia-southeast1 \
  --set-env-vars "FRONTEND_URL=https://your-frontend-url.app"
```

---

## 🧪 Local Testing

### Test with Docker

```bash
cd backend

# Build the image
docker build -t mlviz-backend .

# Run locally
docker run -p 8080:8080 \
  -e DEBUG=true \
  -e FRONTEND_URL=http://localhost:5173 \
  mlviz-backend

# Test
curl http://localhost:8080/health
```

### Test without Docker

```bash
cd backend

# Install dependencies with uv
uv pip install -e .

# Run the app
uvicorn app:app --host 0.0.0.0 --port 8080 --reload
```

---

## 🔧 Environment Variables

Set these in Cloud Run:

| Variable         | Description             | Default | Required              |
| ---------------- | ----------------------- | ------- | --------------------- |
| `DEBUG`          | Enable debug mode       | `true`  | No                    |
| `FRONTEND_URL`   | Production frontend URL | -       | **Yes** (for CORS)    |
| `PORT`           | Server port             | `8080`  | No (set by Cloud Run) |
| `CACHE_ENABLED`  | Enable model caching    | `true`  | No                    |
| `CACHE_MAX_SIZE` | Max cache size          | `100`   | No                    |

---

## 📊 Monitoring

### View Logs

```bash
gcloud run services logs read mlviz-backend \
  --region asia-southeast1 \
  --limit 50
```

### Check Metrics

Visit: [Cloud Run Console](https://console.cloud.google.com/run)

---

## 🔄 Update Deployment

After making changes:

### Via GitHub Actions

```bash
git add .
git commit -m "Update backend"
git push origin main
```

### Manually

```bash
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/mlviz-backend
gcloud run deploy mlviz-backend \
  --image gcr.io/YOUR_PROJECT_ID/mlviz-backend \
  --region asia-southeast1
```

---

## 🐛 Troubleshooting

### CORS Errors

Ensure `FRONTEND_URL` is set correctly:

```bash
gcloud run services describe mlviz-backend --region asia-southeast1
```

### Container Fails to Start

Check logs:

```bash
gcloud run services logs read mlviz-backend --region asia-southeast1
```

### Health Check Fails

Test locally:

```bash
docker run -p 8080:8080 mlviz-backend
curl http://localhost:8080/health
```

---

## 💰 Cost Optimization

Cloud Run pricing is based on:

-   Request count
-   CPU time
-   Memory usage
-   Data egress

Tips:

1. Set `--min-instances 0` (default) to scale to zero when idle
2. Use `--memory 512Mi` for this app (can adjust based on usage)
3. Set `--max-instances` to control costs

**Estimated cost**: ~$5-10/month for low-moderate traffic

---

## 🔐 Security Best Practices

1. ✅ Use Workload Identity Federation (no service account keys)
2. ✅ Set `--no-allow-unauthenticated` if you need auth
3. ✅ Enable Cloud Armor for DDoS protection
4. ✅ Use Secret Manager for sensitive env vars
5. ✅ Keep dependencies updated (`uv pip install --upgrade`)

---

## 📚 Additional Resources

-   [Cloud Run Documentation](https://cloud.google.com/run/docs)
-   [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)
-   [uv Package Manager](https://github.com/astral-sh/uv)
