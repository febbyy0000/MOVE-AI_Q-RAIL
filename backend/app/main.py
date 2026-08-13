import logging
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from app.core.config import settings
from app.core.database import engine, Base
from app.api.v1.router import router as v1_router
import app.models  # noqa: F401 — 모델 등록

logger = logging.getLogger(__name__)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s | %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(title=settings.APP_NAME, debug=settings.DEBUG, lifespan=lifespan)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    req_id = str(uuid.uuid4())[:8]
    start = time.perf_counter()

    # SSE 스트림은 body를 읽지 않음 (무한 스트림)
    body_bytes = b""
    if request.method in ("POST", "PUT", "PATCH") and "stream" not in request.url.path:
        body_bytes = await request.body()

    logger.info(
        "[req:%s] → %s %s | body=%s",
        req_id, request.method, request.url.path,
        body_bytes.decode("utf-8", errors="replace")[:300] if body_bytes else "(stream or empty)",
    )

    # body를 읽었으면 다시 주입
    if body_bytes:
        async def receive():
            return {"type": "http.request", "body": body_bytes, "more_body": False}
        request = Request(request.scope, receive)

    response: Response = await call_next(request)
    elapsed = (time.perf_counter() - start) * 1000

    logger.info(
        "[req:%s] ← %s %s | status=%d elapsed=%.1fms",
        req_id, request.method, request.url.path,
        response.status_code, elapsed,
    )
    return response


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(v1_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
