"""
Script para ejecutar el servidor FastAPI
Soporta variable PORT de Railway/Render
"""

import os
import uvicorn

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    reload = os.getenv("RAILWAY_ENVIRONMENT") is None  # reload solo en local
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=reload,
        log_level="info",
        loop="asyncio",
        proxy_headers=True,          # Lee X-Forwarded-Proto del proxy de Railway
        forwarded_allow_ips="*",     # Confía en los headers del proxy
    )
