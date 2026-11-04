import os
import re
import uuid
import hashlib
import logging
from pathlib import Path

from aiohttp import web
from server import PromptServer
import folder_paths

from .nodes import NODE_CLASS_MAPPINGS, NODE_DISPLAY_NAME_MAPPINGS


WEB_DIRECTORY = "./web"

LOGGER = logging.getLogger("Comfyui-Binfen-Input")

ASSET_DIRNAME = "binfen_input"

MAX_UPLOAD_SIZE = 2 * 1024 * 1024 * 1024  # 2GB

EXTENSION_TYPES = {
    ".png": "image",
    ".jpg": "image",
    ".jpeg": "image",
    ".webp": "image",
    ".bmp": "image",
    ".gif": "image",
    ".tif": "image",
    ".tiff": "image",

    ".mp4": "video",
    ".webm": "video",
    ".mov": "video",
    ".mkv": "video",
    ".avi": "video",
    ".m4v": "video",

    ".wav": "audio",
    ".mp3": "audio",
    ".flac": "audio",
    ".ogg": "audio",
    ".opus": "audio",
    ".m4a": "audio",
    ".aac": "audio",
    ".wma": "audio",
}


def get_asset_directory():
    input_dir = folder_paths.get_input_directory()

    asset_dir = os.path.join(
        input_dir,
        ASSET_DIRNAME
    )

    os.makedirs(asset_dir, exist_ok=True)

    return asset_dir


def find_existing_asset_by_md5(asset_dir, digest):
    """
    查找已经存在的相同内容的文件。

    新文件名以完整 MD5 开头，因此按前缀即可定位，
    无需重复遍历文件重新计算哈希。
    """

    prefix = digest + "_"

    try:
        names = os.listdir(asset_dir)
    except OSError:
        return None

    for name in names:

        if not name.startswith(prefix):
            continue

        if os.path.isfile(
            os.path.join(asset_dir, name)
        ):
            return name

    return None


@PromptServer.instance.routes.post("/binfen_input/upload")
async def upload_asset(request):
    """
    接收前端上传的图片、视频和音频。

    返回：
    {
        "success": true,
        "filename": "xxxxxxxx.png",
        "subfolder": "binfen_input",
        "type": "image"
    }
    """

    temp_path = None

    try:
        reader = await request.multipart()

        field = await reader.next()

        if field is None or field.name != "file":
            return web.json_response(
                {
                    "success": False,
                    "error": "没有收到上传文件"
                },
                status=400
            )

        original_name = os.path.basename(
            field.filename or "uploaded_file"
        )

        extension = Path(original_name).suffix.lower()

        asset_type = EXTENSION_TYPES.get(extension)

        if asset_type is None:
            return web.json_response(
                {
                    "success": False,
                    "error": "不支持的文件格式"
                },
                status=400
            )

        stem = Path(original_name).stem

        stem = re.sub(
            r"[^a-zA-Z0-9_\-\u4e00-\u9fff]+",
            "_",
            stem
        )

        stem = stem.strip("._")[:60] or "asset"

        asset_dir = get_asset_directory()

        # 先写入临时文件，同时增量计算 MD5。
        temp_path = os.path.join(
            asset_dir,
            ".apc_tmp_" + uuid.uuid4().hex + extension
        )

        total_size = 0

        digest = hashlib.md5()

        with open(temp_path, "wb") as output_file:

            while True:

                chunk = await field.read_chunk(
                    size=1024 * 1024
                )

                if not chunk:
                    break

                total_size += len(chunk)

                if total_size > MAX_UPLOAD_SIZE:
                    raise ValueError(
                        "文件超过 2GB 上传限制"
                    )

                digest.update(chunk)

                output_file.write(chunk)

        if total_size == 0:
            raise ValueError("上传文件为空")

        md5 = digest.hexdigest()

        # 相同内容只保存一份，重复上传直接复用已有文件。
        existing = find_existing_asset_by_md5(
            asset_dir,
            md5
        )

        if existing is not None:

            os.remove(temp_path)

            temp_path = None

            return web.json_response(
                {
                    "success": True,
                    "filename": existing,
                    "original_name": original_name,
                    "subfolder": ASSET_DIRNAME,
                    "type": asset_type,
                    "size": total_size,
                    "md5": md5,
                    "duplicate": True
                }
            )

        filename = (
            md5
            + "_"
            + stem
            + extension
        )

        target_path = os.path.join(
            asset_dir,
            filename
        )

        os.replace(temp_path, target_path)

        temp_path = None

        return web.json_response(
            {
                "success": True,
                "filename": filename,
                "original_name": original_name,
                "subfolder": ASSET_DIRNAME,
                "type": asset_type,
                "size": total_size,
                "md5": md5,
                "duplicate": False
            }
        )

    except ValueError as error:

        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)

        return web.json_response(
            {
                "success": False,
                "error": str(error)
            },
            status=400
        )

    except Exception as error:

        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)

        LOGGER.exception(
            "Comfyui-Binfen-Input 上传失败"
        )

        return web.json_response(
            {
                "success": False,
                "error": str(error)
            },
            status=500
        )


__all__ = [
    "NODE_CLASS_MAPPINGS",
    "NODE_DISPLAY_NAME_MAPPINGS",
    "WEB_DIRECTORY"
]