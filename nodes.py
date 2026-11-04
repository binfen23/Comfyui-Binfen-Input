import os
import json
import math
import logging

import torch
import numpy as np

import folder_paths

from PIL import Image, ImageOps


LOGGER = logging.getLogger("Comfyui-Binfen-Input")


MAX_IMAGE_OUTPUTS = 16
MAX_VIDEO_OUTPUTS = 16
MAX_AUDIO_OUTPUTS = 16

MAX_OUTPUTS = (
    MAX_IMAGE_OUTPUTS
    + MAX_VIDEO_OUTPUTS
    + MAX_AUDIO_OUTPUTS
    + 3
)


# 与官方 ResolutionSelector 一致的比例预设。
# 前端只显示比例本身，不带官方括号里的英文说明。
RESOLUTION_RATIOS = {
    "1:1": (1, 1),
    "2:3": (2, 3),
    "3:2": (3, 2),
    "3:4": (3, 4),
    "4:3": (4, 3),
    "9:16": (9, 16),
    "16:9": (16, 9),
    "21:9": (21, 9),
}


def calculate_resolution(aspect_ratio, megapixels, multiple):
    width_ratio, height_ratio = RESOLUTION_RATIOS.get(
        str(aspect_ratio),
        RESOLUTION_RATIOS["1:1"]
    )

    try:
        megapixels = float(megapixels)
    except (ValueError, TypeError):
        megapixels = 1.0

    megapixels = max(0.1, min(megapixels, 16.0))

    try:
        multiple = int(multiple)
    except (ValueError, TypeError):
        multiple = 8

    multiple = max(8, min(multiple, 128))

    total_pixels = megapixels * 1024 * 1024

    scale = math.sqrt(
        total_pixels / (width_ratio * height_ratio)
    )

    width = round(
        width_ratio * scale / multiple
    ) * multiple

    height = round(
        height_ratio * scale / multiple
    ) * multiple

    return int(width), int(height)


def clamp_count(value, maximum):
    try:
        value = int(value)
    except (ValueError, TypeError):
        value = 0

    return max(0, min(value, maximum))


def get_asset_path(filename):

    if not isinstance(filename, str):
        raise ValueError("素材文件名无效")

    filename = os.path.basename(filename)

    if not filename:
        raise ValueError("素材文件名为空")

    input_dir = os.path.realpath(
        folder_paths.get_input_directory()
    )

    asset_dir = os.path.realpath(
        os.path.join(
            input_dir,
            "binfen_input"
        )
    )

    filepath = os.path.realpath(
        os.path.join(
            asset_dir,
            filename
        )
    )

    if os.path.commonpath(
        [asset_dir, filepath]
    ) != asset_dir:
        raise ValueError("非法素材路径")

    if not os.path.isfile(filepath):
        raise FileNotFoundError(
            f"素材文件不存在：{filename}"
        )

    return filepath


def load_image(filepath):

    with Image.open(filepath) as source:

        image = ImageOps.exif_transpose(source)

        # 动态图片只读取第一帧。
        if getattr(image, "is_animated", False):
            image.seek(0)

        image = image.convert("RGB")

        image_array = np.asarray(
            image,
            dtype=np.float32
        ) / 255.0

    tensor = torch.from_numpy(
        image_array.copy()
    )

    return tensor.unsqueeze(0)


def load_video(filepath):

    # 使用 ComfyUI 官方视频输入对象。
    from comfy_api.latest import VideoFromFile

    return VideoFromFile(filepath)


def load_video_frames(filepath):

    # 官方视频模型的参考视频输入（ref_videos / control_video /
    # pose_video / start_image 等）全部使用 IMAGE 帧批次，
    # 而不是 VIDEO 容器类型。
    #
    # 这里复用官方的 GetVideoComponents 解码路径，
    # 把视频文件转换为 [frames, H, W, C] 张量。
    video = load_video(filepath)

    get_components = getattr(video, "get_components", None)

    if get_components is None:

        raise RuntimeError(
            "当前 ComfyUI 版本不支持将视频转换为 IMAGE 帧，"
            "请升级 ComfyUI 或把视频输出类型改为 VIDEO。"
        )

    return get_components().images


def load_audio(filepath):

    # 使用 ComfyUI 官方音频解码器。
    from comfy_extras.nodes_audio import load as audio_load

    waveform, sample_rate = audio_load(filepath)

    return {
        "waveform": waveform.unsqueeze(0).float(),
        "sample_rate": int(sample_rate)
    }


class BinfenInput:

    @classmethod
    def INPUT_TYPES(cls):

        return {
            "required": {

                "assets_json": (
                    "STRING",
                    {
                        "default": "[]",
                        "multiline": False
                    }
                ),

                "prompt": (
                    "STRING",
                    {
                        "default": "",
                        "multiline": True,
                        "dynamicPrompts": False
                    }
                ),

                "image_count": (
                    "INT",
                    {
                        "default": 5,
                        "min": 0,
                        "max": MAX_IMAGE_OUTPUTS,
                        "step": 1
                    }
                ),

                "video_count": (
                    "INT",
                    {
                        "default": 5,
                        "min": 0,
                        "max": MAX_VIDEO_OUTPUTS,
                        "step": 1
                    }
                ),

                "audio_count": (
                    "INT",
                    {
                        "default": 2,
                        "min": 0,
                        "max": MAX_AUDIO_OUTPUTS,
                        "step": 1
                    }
                ),

                "clear_assets_after_run": (
                    "BOOLEAN",
                    {
                        "default": False
                    }
                ),

                "clear_prompt_after_run": (
                    "BOOLEAN",
                    {
                        "default": False
                    }
                ),

                # 追加在最后，避免旧工作流的 widgets_values
                # 按位置恢复时发生错位。
                #
                # IMAGE：输出视频帧批次，可连接官方视频模型的
                #         参考视频输入（ref_videos / control_video 等）。
                # VIDEO：输出官方 VIDEO 容器，可连接 SaveVideo 等。
                "video_output_type": (
                    ["IMAGE", "VIDEO"],
                    {
                        "default": "IMAGE"
                    }
                ),

                # 分辨率选择器。追加在最后，旧工作流按位置
                # 恢复 widgets_values 时不会错位。
                "resolution_ratio": (
                    list(RESOLUTION_RATIOS.keys()),
                    {
                        "default": "1:1"
                    }
                ),

                "resolution_megapixels": (
                    "FLOAT",
                    {
                        "default": 1.0,
                        "min": 0.1,
                        "max": 16.0,
                        "step": 0.1
                    }
                ),

                "resolution_multiple": (
                    "INT",
                    {
                        "default": 8,
                        "min": 8,
                        "max": 128,
                        "step": 4
                    }
                )
            }
        }

    # 后端固定预留 51 个通用输出槽位。
    # 前端负责根据设置显示实际的 IMAGE / VIDEO / AUDIO / STRING / INT 类型。
    RETURN_TYPES = ("*",) * MAX_OUTPUTS

    RETURN_NAMES = tuple(
        f"slot_{i + 1}"
        for i in range(MAX_OUTPUTS)
    )

    FUNCTION = "execute"

    CATEGORY = "utils/input"

    DESCRIPTION = "Modern image, video, audio and prompt input composer."

    @classmethod
    def IS_CHANGED(cls, **kwargs):

        # 关键修复：
        # 每次运行都强制重新计算这个轻量输入节点。
        #
        # 防止素材删除后，ComfyUI 继续使用以前缓存的输出。
        #
        # NaN 每次比较都不相等，因此节点不会被缓存命中。
        return float("nan")

    def execute(
        self,
        assets_json,
        prompt,
        image_count,
        video_count,
        audio_count,
        clear_assets_after_run=False,
        clear_prompt_after_run=False,
        video_output_type="IMAGE",
        resolution_ratio="1:1",
        resolution_megapixels=1.0,
        resolution_multiple=8
    ):

        output_width, output_height = calculate_resolution(
            resolution_ratio,
            resolution_megapixels,
            resolution_multiple
        )

        image_count = clamp_count(
            image_count,
            MAX_IMAGE_OUTPUTS
        )

        video_count = clamp_count(
            video_count,
            MAX_VIDEO_OUTPUTS
        )

        audio_count = clamp_count(
            audio_count,
            MAX_AUDIO_OUTPUTS
        )

        # -------------------------------------------------
        # 解析素材
        # -------------------------------------------------

        try:

            assets = json.loads(
                assets_json or "[]"
            )

        except Exception as error:

            raise ValueError(
                f"素材列表解析失败：{error}"
            )

        if not isinstance(assets, list):
            raise ValueError("素材列表必须为 JSON 数组")

        images = []
        videos = []
        audios = []

        for asset in assets:

            if not isinstance(asset, dict):
                continue

            asset_type = asset.get("type")

            if asset_type == "image":
                images.append(asset)

            elif asset_type == "video":
                videos.append(asset)

            elif asset_type == "audio":
                audios.append(asset)

        # -------------------------------------------------
        # 输出列表
        #
        # 顺序必须与前端动态端口完全一致。
        #
        # IMAGE -> VIDEO -> AUDIO -> PROMPT -> WIDTH -> HEIGHT
        # -------------------------------------------------

        outputs = []

        # ---------------- IMAGE ----------------

        for index in range(image_count):

            if index < len(images):

                filepath = get_asset_path(
                    images[index].get("filename")
                )

                outputs.append(
                    load_image(filepath)
                )

            else:

                # 空端口输出 None，而不是 ExecutionBlocker。
                #
                # ComfyUI 的 ExecutionBlocker 会阻断整个下游节点：
                # 只要下游任意一个输入是 blocker，该节点就完全不执行。
                # 这会导致“连了 N 个端口但本次只上传部分素材”时，
                # 文本编码等下游节点被整体跳过，表现为瞬间结束且无输出。
                #
                # 输出 None 则让下游把它当成“空值/未连接”，
                # 从而正常走文生图分支。
                outputs.append(None)

        # ---------------- VIDEO ----------------

        for index in range(video_count):

            if index < len(videos):

                filepath = get_asset_path(
                    videos[index].get("filename")
                )

                if str(video_output_type).upper() == "VIDEO":

                    outputs.append(
                        load_video(filepath)
                    )

                else:

                    outputs.append(
                        load_video_frames(filepath)
                    )

            else:

                # 空端口输出 None，而不是 ExecutionBlocker。
                #
                # ComfyUI 的 ExecutionBlocker 会阻断整个下游节点：
                # 只要下游任意一个输入是 blocker，该节点就完全不执行。
                # 这会导致“连了 N 个端口但本次只上传部分素材”时，
                # 文本编码等下游节点被整体跳过，表现为瞬间结束且无输出。
                #
                # 输出 None 则让下游把它当成“空值/未连接”，
                # 从而正常走文生图分支。
                outputs.append(None)

        # ---------------- AUDIO ----------------

        for index in range(audio_count):

            if index < len(audios):

                filepath = get_asset_path(
                    audios[index].get("filename")
                )

                outputs.append(
                    load_audio(filepath)
                )

            else:

                # 空端口输出 None，而不是 ExecutionBlocker。
                #
                # ComfyUI 的 ExecutionBlocker 会阻断整个下游节点：
                # 只要下游任意一个输入是 blocker，该节点就完全不执行。
                # 这会导致“连了 N 个端口但本次只上传部分素材”时，
                # 文本编码等下游节点被整体跳过，表现为瞬间结束且无输出。
                #
                # 输出 None 则让下游把它当成“空值/未连接”，
                # 从而正常走文生图分支。
                outputs.append(None)

        # ---------------- PROMPT ----------------

        outputs.append(
            str(prompt or "")
        )

        # ---------------- WIDTH / HEIGHT ----------------

        outputs.append(int(output_width))

        outputs.append(int(output_height))

        # -------------------------------------------------
        # 填充剩余的预留端口
        # -------------------------------------------------

        if len(outputs) > MAX_OUTPUTS:
            raise RuntimeError("输出端口数量超过最大限制")

        # 尾部预留端口同样使用 None，避免任何潜在的下游阻断。
        outputs.extend(
            [None] * (MAX_OUTPUTS - len(outputs))
        )

        # -------------------------------------------------
        # 发送空 UI 数据
        #
        # 目的：
        # 让 ComfyUI 正常发送 executed WebSocket 消息，
        # 使前端能够准确知道这个节点已经执行过。
        #
        # 不显示额外的文字输出。
        # -------------------------------------------------

        return {
            "ui": {
                "text": []
            },

            "result": tuple(outputs)
        }


NODE_CLASS_MAPPINGS = {
    "BinfenInput": BinfenInput
}


NODE_DISPLAY_NAME_MAPPINGS = {
    "BinfenInput": "Binfen Input"
}