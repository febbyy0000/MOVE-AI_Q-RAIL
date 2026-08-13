from fastapi import APIRouter
from app.api.v1.routes import admin, ai, auth, quotes, settlements

router = APIRouter(prefix="/api/v1")

router.include_router(auth.router)
router.include_router(quotes.router)
router.include_router(settlements.router)
router.include_router(ai.router)
router.include_router(admin.router)
