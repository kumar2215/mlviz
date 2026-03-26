from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
import uvicorn

from core.config import settings
from api import decision_tree, dataset, knn, kmeans, linear_regression, svm

app = FastAPI(
    title="MLviz",
    description="API documentation including ML model training and data analysis.",
    version="1.0.0",
    contact={
        "name": "zaidan sani",
        "url": "https://mzaidanbs.github.io",
        "email": "mzaidanbs@gmail.com"
    },
    license_info={
        "name": "Apache 2.0",
        "url": "http://www.apache.org/licenses/LICENSE-2.0.html"
    },
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_all_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

app.include_router(decision_tree.router, prefix="/api/dt",
                   tags=["Decision Tree"])
app.include_router(dataset.router,
                   prefix="/api/dataset", tags=["Dataset"])
app.include_router(knn.router, prefix="/api/knn",
                   tags=["K-Nearest Neighbors"])
app.include_router(kmeans.router, prefix="/api/kmeans",
                   tags=["K-Means"])
app.include_router(linear_regression.router, prefix="/api/linear",
                   tags=["Linear Regression"])
app.include_router(svm.router, prefix="/api/svm",
                   tags=["Support Vector Machine"])


@app.get("/", include_in_schema=False)
async def root():
    """Redirect root to API documentation."""
    return RedirectResponse(url="/docs")


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "MLviz"}

if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
