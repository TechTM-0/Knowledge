from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv

load_dotenv()  # プロジェクトルートの .env を自動読み込み

from database import init_db
from routers.notes import router as notes_router
from routers.templates import router as templates_router
from routers.generate import router as generate_router
from routers.vector_search import router as vector_search_router, load_cache


# lifespan: アプリ起動時に一度だけ実行される処理を定義する FastAPI の仕組み
@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()  # DB・FTS テーブルをまだ存在しない場合のみ作成
    load_cache()  # ベクトル検索用の埋め込みキャッシュをメモリに読み込む
    yield      # yield より前が起動時処理、後がシャットダウン時処理


app = FastAPI(lifespan=lifespan)
app.mount("/static", StaticFiles(directory="static"), name="static")
app.include_router(notes_router)
app.include_router(templates_router)
app.include_router(generate_router)
app.include_router(vector_search_router)


@app.get("/")
def root():
    # SPA のエントリポイント。すべての画面遷移は index.html + app.js が担う
    return FileResponse("static/index.html")
