import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

/* =========================================================
   CONFIG
========================================================= */

const NODE_NAME = "BinfenInput";

const MAX_IMAGES = 16;
const MAX_VIDEOS = 16;
const MAX_AUDIOS = 16;

const ASSET_FOLDER = "binfen_input";

/*
   只作为“新建节点”的初始值种子。
   真正的分辨率设置按节点保存在 widget 里，随工作流序列化。
*/
const RESOLUTION_STORAGE_KEY = "apc.resolution";

const RESOLUTION_RATIOS = [
    { id: "1:1", width: 1, height: 1 },
    { id: "2:3", width: 2, height: 3 },
    { id: "3:2", width: 3, height: 2 },
    { id: "3:4", width: 3, height: 4 },
    { id: "4:3", width: 4, height: 3 },
    { id: "9:16", width: 9, height: 16 },
    { id: "16:9", width: 16, height: 9 },
    { id: "21:9", width: 21, height: 9 }
];

const DEFAULT_RESOLUTION = {
    ratio: "1:1",
    megapixels: 1.0,
    multiple: 8,
    visible: true
};

const composerNodes = new Set();

/* =========================================================
   SVG ICONS
========================================================= */

const ICONS = {

    upload: `
    <svg viewBox="0 0 24 24">
        <path d="M12 16V4"/>
        <path d="M7 9l5-5 5 5"/>
        <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>
    </svg>`,

    clear: `
    <svg viewBox="0 0 24 24">
        <path d="M3 6h18"/>
        <path d="M8 6V4h8v2"/>
        <path d="M19 6l-1 14H6L5 6"/>
        <path d="M10 11v5"/>
        <path d="M14 11v5"/>
    </svg>`,

    play: `
    <svg viewBox="0 0 24 24">
        <path
            d="M8 5.5v13l11-6.5z"
            fill="currentColor"
            stroke="none"
        />
    </svg>`,

    settings: `
    <svg viewBox="0 0 24 24">
        <path d="
            M9.5 2.9
            L14.5 2.9
            L15.1 5.1
            L17.1 6.1
            L19.3 5.4
            L21.8 9.7
            L20.1 11.3
            L20.1 13.5
            L21.8 15.2
            L19.3 19.5
            L17.1 18.8
            L15.1 19.8
            L14.5 22
            L9.5 22
            L8.9 19.8
            L6.9 18.8
            L4.7 19.5
            L2.2 15.2
            L3.9 13.5
            L3.9 11.3
            L2.2 9.7
            L4.7 5.4
            L6.9 6.1
            L8.9 5.1
            Z
        "/>
        <circle cx="12" cy="12.4" r="3.3"/>
    </svg>`,

    image: `
    <svg viewBox="0 0 24 24">
        <rect x="3" y="3" width="18" height="18" rx="3"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <path d="m21 15-5-5L5 21"/>
    </svg>`,

    video: `
    <svg viewBox="0 0 24 24">
        <rect x="3" y="5" width="13" height="14" rx="2"/>
        <path d="m16 10 5-3v10l-5-3z"/>
    </svg>`,

    audio: `
    <svg viewBox="0 0 24 24">
        <path d="M3 10v4"/>
        <path d="M7 7v10"/>
        <path d="M11 4v16"/>
        <path d="M15 8v8"/>
        <path d="M19 6v12"/>
        <path d="M22 10v4"/>
    </svg>`,

    close: `
    <svg viewBox="0 0 24 24">
        <path d="M18 6 6 18"/>
        <path d="m6 6 12 12"/>
    </svg>`,

    grip: `
    <svg viewBox="0 0 24 24">
        <circle cx="9" cy="6" r="1"/>
        <circle cx="15" cy="6" r="1"/>
        <circle cx="9" cy="12" r="1"/>
        <circle cx="15" cy="12" r="1"/>
        <circle cx="9" cy="18" r="1"/>
        <circle cx="15" cy="18" r="1"/>
    </svg>`,

    audioPlay: `
    <svg viewBox="0 0 24 24">
        <path
            d="M9 5v14l11-7z"
            fill="currentColor"
            stroke="none"
        />
    </svg>`,

    audioPause: `
    <svg viewBox="0 0 24 24">
        <path
            d="M7 5h4v14H7zM15 5h4v14h-4z"
            fill="currentColor"
            stroke="none"
        />
    </svg>`
};


function icon(name) {
    return `
        <span class="apc-icon">
            ${ICONS[name] || ""}
        </span>
    `;
}


/* =========================================================
   CSS
========================================================= */

const CSS = `

/* ================================================
   DOM WIDGET HOST
================================================ */

/*
   只让当前 APC 节点对应的 DOM Widget 宿主穿透鼠标。
   不修改其他节点的 DOM Widget。
*/

.dom-widget:has(.apc-root),
.lg-node-widget:has(.apc-root) {
    pointer-events: none !important;
}

.apc-dom-widget-host {
    pointer-events: none !important;
}


/* ================================================
   ROOT
================================================ */

.apc-root {
    display: flex;
    flex-direction: column;

    width: 100%;
    min-width: 0;
    max-width: 100%;

    height: 100%;
    min-height: 0;

    box-sizing: border-box;

    padding: 5px 8px 9px;

    color: #f5f5f5;

    font-family: Arial, Helvetica, sans-serif;

    overflow: visible;

    user-select: none;

    pointer-events: none;
}

.apc-root *,
.apc-root *::before,
.apc-root *::after {
    box-sizing: border-box;
}

/*
   关键：原生节点正在缩放时，彻底释放 DOM 鼠标命中。
   包括内部按钮、文字框和素材卡片。
*/

.apc-root.apc-resizing,
.apc-root.apc-resizing * {
    pointer-events: none !important;
}

.apc-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;

    flex-shrink: 0;
}

.apc-icon svg {
    display: block;

    width: 19px;
    height: 19px;

    fill: none;

    stroke: currentColor;
    stroke-width: 1.7;

    stroke-linecap: round;
    stroke-linejoin: round;
}


/* ================================================
   MAIN COMPOSER
================================================ */

.apc-composer {
    position: relative;

    display: flex;
    flex-direction: column;

    flex: 1 1 auto;

    width: 100%;
    max-width: 100%;
    min-width: 0;
    min-height: 0;

    border-radius: 16px;

    transition: outline .15s ease;

    pointer-events: none;
}

.apc-composer.apc-drop {
    outline: 1px dashed #ffffff;
    outline-offset: 3px;
}


/* ================================================
   ASSET PANEL
================================================ */

.apc-assets {
    position: relative;
    z-index: 1;

    flex: 0 0 auto;

    width: calc(100% - 24px);
    max-width: calc(100% - 24px);

    margin: 9px 12px -13px;

    padding: 10px 9px 15px;

    border: 1px solid #414148;
    border-bottom: 0;

    border-radius: 13px 13px 0 0;

    background: #2b2b2b;

    pointer-events: auto;
}

.apc-assets[hidden] {
    display: none !important;
}


/* ================================================
   ASSET GROUP
================================================ */

.apc-asset-group {
    display: flex;
    align-items: flex-start;

    width: 100%;
    min-width: 0;
    max-width: 100%;

    gap: 5px;
}

.apc-asset-group + .apc-asset-group {
    margin-top: 9px;
}

.apc-group-label {
    display: flex;
    align-items: center;

    flex: 0 0 60px;

    height: 64px;

    gap: 4px;

    color: #929299;

    font-size: 9px;
    font-weight: 700;
    letter-spacing: .2px;

    white-space: nowrap;
}

.apc-group-label .apc-icon svg {
    width: 14px;
    height: 14px;
}

.apc-group-items {
    display: flex;

    flex: 1;

    flex-wrap: wrap;
    align-items: flex-start;

    gap: 8px;

    min-width: 0;
    max-width: calc(100% - 65px);
}


/* ================================================
   IMAGE / VIDEO CARD
================================================ */

.apc-asset-card {
    position: relative;

    flex: 0 0 64px;

    width: 64px;
    height: 64px;

    max-width: 100%;

    overflow: hidden;

    border: 1px solid #424249;
    border-radius: 8px;

    background: #09090b;

    cursor: grab;

    pointer-events: auto;

    transition:
        border-color .15s ease,
        opacity .15s ease;
}

.apc-asset-card:hover {
    border-color: #a6a6ac;
}

.apc-asset-card:active {
    cursor: grabbing;
}

.apc-asset-card.apc-dragging {
    opacity: .35;
}

.apc-asset-card.apc-drag-target {
    border: 2px dashed #ffffff;
}

.apc-asset-card img {
    display: block;

    width: 100%;
    height: 100%;

    object-fit: contain;

    background: #09090b;
}

.apc-asset-card video {
    display: block;

    width: 100%;
    height: 100%;

    object-fit: contain;

    background: #09090b;
}

.apc-asset-index {
    position: absolute;

    left: 4px;
    bottom: 4px;

    padding: 2px 5px;

    border-radius: 4px;

    color: #fff;
    background: rgba(0,0,0,.76);

    font-size: 10px;

    pointer-events: none;
}

.apc-drag-handle {
    position: absolute;

    top: 3px;
    left: 3px;

    width: 20px;
    height: 20px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 5px;

    color: #fff;
    background: rgba(0,0,0,.65);

    opacity: 0;

    transition: opacity .15s;

    pointer-events: none;
}

.apc-asset-card:hover .apc-drag-handle {
    opacity: 1;
}

.apc-drag-handle svg {
    width: 14px;
    height: 14px;

    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
}

.apc-asset-remove {
    position: absolute;

    top: 3px;
    right: 3px;

    width: 20px;
    height: 20px;

    display: flex;
    align-items: center;
    justify-content: center;

    padding: 0;

    border: none;
    border-radius: 5px;

    color: #fff;
    background: rgba(0,0,0,.75);

    opacity: 0;

    cursor: pointer;

    pointer-events: auto;
}

.apc-asset-card:hover .apc-asset-remove {
    opacity: 1;
}

.apc-asset-remove svg {
    width: 12px;
    height: 12px;

    fill: none;
    stroke: currentColor;
    stroke-width: 2;
}


/* ================================================
   AUDIO CARD
================================================ */

.apc-audio-card {
    flex: 0 0 155px;

    width: 155px;
    height: 56px;

    padding: 6px 8px;

    display: flex;
    align-items: center;

    gap: 8px;

    border: 1px solid #424249;
    border-radius: 8px;

    background: #19191d;
}

.apc-audio-play {
    width: 29px;
    height: 29px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    padding: 0;

    border: 1px solid #47474f;
    border-radius: 50%;

    color: #fff;
    background: #303036;

    cursor: pointer;
}

.apc-audio-play:hover {
    background: #45454c;
}

.apc-audio-play svg {
    width: 14px;
    height: 14px;
}

.apc-audio-info {
    flex: 1;

    min-width: 0;

    overflow: hidden;
}

.apc-audio-name {
    overflow: hidden;

    color: #eee;

    font-size: 10px;

    white-space: nowrap;
    text-overflow: ellipsis;
}

.apc-audio-type {
    margin-top: 3px;

    color: #898991;

    font-size: 9px;
}

.apc-audio-remove {
    position: static;

    flex: 0 0 18px;

    width: 18px;
    height: 18px;

    opacity: .55;

    background: transparent;
}

.apc-audio-card:hover .apc-audio-remove {
    opacity: 1;
}


/* ================================================
   INPUT SHELL
================================================ */

.apc-input-shell {
    position: relative;
    z-index: 2;

    display: flex;
    flex-direction: column;

    flex: 1 1 auto;

    width: 100%;
    max-width: 100%;
    min-width: 0;

    min-height: 220px;

    padding: 33px 13px 12px;

    border: 1px solid #38383f;
    border-radius: 16px;

    background: #1f1f1f;

    transition: border-color .15s ease;

    pointer-events: auto;
}

.apc-input-shell:focus-within {
    border-color: #73737c;
}

.apc-root:not(.apc-has-assets) .apc-input-shell {
    padding-top: 15px;
}


/* ================================================
   CLEAR BUTTON
================================================ */

.apc-clear {
    position: absolute;

    top: 8px;
    right: 10px;

    width: 32px;
    height: 32px;

    display: flex;
    align-items: center;
    justify-content: center;

    padding: 0;

    border: none;
    border-radius: 8px;

    color: #9999a0;
    background: transparent;

    cursor: pointer;
}

.apc-clear:hover {
    color: #fff;
    background: #333339;
}

.apc-clear svg {
    width: 17px;
    height: 17px;
}


/* ================================================
   TEXTAREA
================================================ */

.apc-textarea {
    display: block;

    flex: 1 1 0;

    width: 100%;
    min-width: 0;

    min-height: 150px;
    height: auto;
    max-height: none;

    padding: 7px 2px 14px;

    border: none;
    outline: none;

    resize: none;

    overflow-x: hidden;
    overflow-y: auto;

    color: #f5f5f5;
    caret-color: #fff;

    background: transparent;

    font-family: inherit;
    font-size: 14px;
    line-height: 1.65;

    user-select: text;
}

.apc-textarea::placeholder {
    color: #77777f;
}

.apc-textarea::-webkit-scrollbar {
    width: 5px;
}

.apc-textarea::-webkit-scrollbar-thumb {
    border-radius: 10px;
    background: #45454c;
}


/* ================================================
   TOOLBAR
================================================ */

.apc-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;

    flex: 0 0 auto;

    width: 100%;
    min-width: 0;

    min-height: 46px;

    pointer-events: none;
}

.apc-upload {
    width: 32px;
    height: 32px;

    display: flex;
    align-items: center;
    justify-content: center;

    padding: 0;

    border: 1px solid #424249;
    border-radius: 9px;

    color: #e7e7e7;
    background: #28282d;

    cursor: pointer;

    transition: all .15s ease;

    pointer-events: auto;
}

.apc-upload:hover {
    color: #fff;
    background: #3b3b42;
    border-color: #66666f;
}

.apc-upload svg {
    width: 16px;
    height: 16px;
}


/* RUN BUTTON */

.apc-run {
    width: 48px;
    height: 48px;

    display: flex;
    align-items: center;
    justify-content: center;

    padding: 0;

    border: none;
    border-radius: 14px;

    color: #141416;
    background: #f5f5f5;

    box-shadow: 0 3px 12px rgba(0,0,0,.22);

    cursor: pointer;

    transition: all .15s ease;

    pointer-events: auto;
}

.apc-run:hover {
    background: #fff;
    transform: translateY(-1px);
}

.apc-run:active {
    transform: scale(.94);
}

.apc-run:disabled {
    opacity: .45;
    cursor: wait;
}

.apc-run svg {
    width: 21px;
    height: 21px;
}


/* ================================================
   META
================================================ */

.apc-meta {
    position: relative;

    display: flex;
    align-items: center;
    flex-wrap: wrap;

    flex: 0 0 auto;

    gap: 12px;

    width: 100%;
    max-width: 100%;

    padding: 12px 5px 2px;

    pointer-events: none;
}


/* SETTINGS BUTTON */

.apc-settings-button {
    width: 34px;
    height: 34px;

    display: flex;
    align-items: center;
    justify-content: center;

    flex-shrink: 0;

    padding: 0;

    border: 1px solid #404047;
    border-radius: 9px;

    color: #bdbdc3;
    background: #222226;

    cursor: pointer;

    pointer-events: auto;
}

.apc-settings-button:hover,
.apc-settings-button.apc-active {
    color: #fff;
    background: #35353b;
}

.apc-settings-button svg {
    width: 18px;
    height: 18px;
}


/* ================================================
   SWITCH
================================================ */

.apc-switch {
    display: inline-flex;
    align-items: center;

    gap: 7px;

    cursor: pointer;

    color: #b7b7be;
    font-size: 11px;

    white-space: nowrap;

    pointer-events: auto;
}

.apc-switch:hover {
    color: #fff;
}

.apc-switch input {
    display: none;
}

.apc-switch-track {
    position: relative;

    width: 30px;
    height: 17px;

    display: inline-block;

    flex-shrink: 0;

    border-radius: 20px;

    background: #424249;

    transition: background .15s ease;
}

.apc-switch-track::after {
    content: "";

    position: absolute;

    left: 2px;
    top: 2px;

    width: 13px;
    height: 13px;

    border-radius: 50%;

    background: #bdbdc3;

    transition: transform .15s ease;
}

.apc-switch input:checked + .apc-switch-track {
    background: #c5c5cc;
}

.apc-switch input:checked + .apc-switch-track::after {
    transform: translateX(13px);
    background: #151518;
}


/* ================================================
   SETTINGS PANEL
================================================ */

.apc-settings {
    position: absolute;

    left: 0;
    bottom: 43px;

    z-index: 100;

    width: 270px;
    max-width: 100%;

    padding: 15px;

    border: 1px solid #484850;
    border-radius: 13px;

    color: #f0f0f0;

    background: #232323;

    box-shadow: 0 10px 30px rgba(0,0,0,.48);

    pointer-events: auto;
}

.apc-settings[hidden] {
    display: none !important;
}

.apc-settings-title {
    margin-bottom: 13px;

    font-size: 13px;
    font-weight: 700;
}

.apc-setting-row {
    display: flex;
    align-items: center;
    justify-content: space-between;

    gap: 12px;

    margin-top: 11px;

    color: #c6c6cc;
    font-size: 12px;
}

.apc-setting-row input {
    width: 64px;
    height: 30px;

    padding: 0 8px;

    border: 1px solid #4a4a52;
    border-radius: 7px;

    outline: none;

    color: #fff;

    text-align: center;

    background: #1f1f1f;
}

.apc-setting-row input:focus {
    border-color: #b8b8c0;
}

.apc-setting-row select {
    min-width: 138px;
    height: 30px;

    padding: 0 8px;

    border: 1px solid #4a4a52;
    border-radius: 7px;

    outline: none;

    color: #fff;

    background: #1f1f1f;
}

.apc-setting-row select:focus {
    border-color: #b8b8c0;
}

.apc-select-trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;

    gap: 8px;

    min-width: 138px;
    height: 32px;

    padding: 0 10px;

    border: 1px solid #424249;
    border-radius: 9px;

    outline: none;

    color: #e7e7e7;

    background: #1f1f1f;

    font-family: inherit;
    font-size: 12px;

    cursor: pointer;
}

.apc-select-trigger:hover,
.apc-select-trigger.apc-active {
    border-color: #66666f;

    color: #fff;

    background: #2f2f2f;
}

.apc-select-trigger svg {
    width: 12px;
    height: 12px;

    flex: 0 0 12px;

    opacity: .7;
}

.apc-select-value {
    white-space: nowrap;
}

.apc-video-type-popover {
    position: fixed;

    z-index: 10020;

    width: 186px;

    padding: 10px;

    border: 1px solid #484850;
    border-radius: 13px;

    color: #f0f0f0;

    background: #1f1f1f;

    box-shadow: 0 12px 32px rgba(0,0,0,.5);

    pointer-events: auto;
}

.apc-video-type-popover[hidden] {
    display: none !important;
}

.apc-video-type-options {
    display: flex;
    flex-direction: column;

    gap: 4px;
}

.apc-video-type-option {
    display: flex;
    align-items: center;
    justify-content: center;

    gap: 6px;

    width: 100%;
    height: 36px;

    padding: 0 10px;

    border: 1px solid transparent;
    border-radius: 9px;

    color: inherit;

    background: transparent;

    font-family: inherit;
    font-size: 12px;
    text-align: center;

    cursor: pointer;
}

.apc-video-type-option:hover {
    background: rgba(255,255,255,.07);
}

.apc-video-type-option.apc-active {
    border-color: #5a5a64;

    background: rgba(255,255,255,.1);
}

.apc-video-type-option small {
    opacity: .6;

    font-size: 10px;
}

.apc-settings-note {
    margin-top: 14px;

    color: #85858c;

    font-size: 10px;
    line-height: 1.55;
}


/* ================================================
   RESOLUTION SELECTOR
   ================================================ */

.apc-settings-section {
    margin-top: 14px;
    margin-bottom: 2px;
    padding-top: 11px;

    border-top: 1px solid #3a3a41;

    color: #8f8f97;

    font-size: 10px;
    font-weight: 700;
    letter-spacing: .06em;
    text-transform: uppercase;
}

.apc-resolution-capsule {
    position: relative;
    z-index: 2;

    display: inline-flex;
    align-items: center;
    justify-content: center;

    flex: 0 0 auto;

    gap: 6px;

    width: 100px;
    height: 36px;

    margin-left: auto;
    margin-right: 10px;

    padding: 0 10px;

    border: 1px solid #424249;
    border-radius: 11px;

    color: #e7e7e7;

    background: #28282d;

    font-size: 12px;
    font-weight: 500;
    line-height: 1;

    white-space: nowrap;

    cursor: pointer;
    user-select: none;

    pointer-events: auto;

    transition:
        background .12s ease,
        border-color .12s ease,
        color .12s ease;
}

.apc-resolution-capsule:hover,
.apc-resolution-capsule.apc-active {
    border-color: #66666f;

    color: #fff;

    background: #3b3b42;
}

.apc-resolution-capsule svg {
    width: 16px;
    height: 16px;

    flex: 0 0 16px;
}

.apc-resolution-capsule .apc-resolution-capsule-chevron {
    width: 12px;
    height: 12px;

    flex: 0 0 12px;

    opacity: .55;
}

.apc-resolution-capsule-label {
    width: 32px;
    flex: 0 0 32px;

    text-align: center;

    font-variant-numeric: tabular-nums;
}

.apc-resolution-popover {
    position: fixed;

    z-index: 10020;

    width: 248px;

    padding: 12px;

    border: 1px solid var(--border-color, #484850);
    border-radius: 13px;

    color: var(--fg-color, #f0f0f0);

    background: #1f1f1f;

    box-shadow: 0 12px 32px rgba(0,0,0,.5);

    pointer-events: auto;
}

.apc-resolution-popover[hidden] {
    display: none !important;
}

.apc-resolution-title {
    margin: 0 2px 10px;

    color: inherit;

    font-size: 11px;
    font-weight: 600;
    letter-spacing: .02em;

    opacity: .68;
}

.apc-resolution-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));

    gap: 6px;
}

.apc-resolution-option {
    display: flex;
    align-items: center;
    justify-content: center;

    gap: 8px;

    height: 36px;

    padding: 0 10px;

    border: 1px solid transparent;
    border-radius: 9px;

    color: inherit;

    background: transparent;

    font-size: 12px;

    text-align: center;

    cursor: pointer;
}

.apc-resolution-option:hover {
    background: rgba(255,255,255,.07);
}

.apc-resolution-option.apc-active {
    border-color: var(--border-color, #5a5a64);

    background: rgba(255,255,255,.1);
}

.apc-resolution-option svg {
    width: 18px;
    height: 18px;

    flex: 0 0 auto;

    opacity: .92;
}

.apc-resolution-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;

    gap: 8px;

    margin-top: 11px;
    padding-top: 10px;

    border-top: 1px solid rgba(255,255,255,.09);

    font-size: 11px;
}

.apc-resolution-size {
    font-weight: 600;
    font-variant-numeric: tabular-nums;
}

.apc-resolution-hint {
    opacity: .58;

    white-space: nowrap;
}


/* ================================================
   STATUS
================================================ */

.apc-status {
    display: block;

    flex: 0 0 20px;

    width: 100%;

    height: 20px;
    min-height: 20px;
    max-height: 20px;

    padding: 3px 24px 0;

    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;

    color: #898991;

    font-size: 10px;

    pointer-events: none;
}

.apc-status.apc-error {
    color: #ff9d9d;
}

.apc-status.apc-success {
    color: #d6d6d6;
}

`;


/* =========================================================
   CSS INJECTION
========================================================= */

function injectCSS() {

    if (document.getElementById("asset-prompt-composer-css")) {
        return;
    }

    const style = document.createElement("style");

    style.id = "asset-prompt-composer-css";

    style.textContent = CSS;

    document.head.appendChild(style);
}


/* =========================================================
   BASIC HELPERS
========================================================= */

function clamp(value, min, max) {

    value = Number.parseInt(value, 10);

    if (!Number.isFinite(value)) {
        value = min;
    }

    return Math.max(
        min,
        Math.min(max, value)
    );
}


function clampFloat(value, min, max) {

    value = Number(value);

    if (!Number.isFinite(value)) {
        value = min;
    }

    return Math.max(
        min,
        Math.min(max, value)
    );
}


function createId() {

    if (crypto.randomUUID) {
        return crypto.randomUUID();
    }

    return (
        Date.now().toString(36)
        + Math.random().toString(36).slice(2)
    );
}


function getWidget(node, name) {

    return node.widgets?.find(
        widget => widget.name === name
    );
}


function getWidgetValue(node, name, fallback = "") {

    const widget = getWidget(node, name);

    if (
        !widget ||
        widget.value === undefined ||
        widget.value === null
    ) {
        return fallback;
    }

    return widget.value;
}


function setWidgetValue(node, name, value) {

    const widget = getWidget(node, name);

    if (!widget) {
        return;
    }

    widget.value = value;

    if (typeof widget.callback === "function") {
        widget.callback(value);
    }
}


function readCounts(node) {

    return {

        images: clamp(
            getWidgetValue(node, "image_count", 5),
            0,
            MAX_IMAGES
        ),

        videos: clamp(
            getWidgetValue(node, "video_count", 5),
            0,
            MAX_VIDEOS
        ),

        audios: clamp(
            getWidgetValue(node, "audio_count", 2),
            0,
            MAX_AUDIOS
        )
    };
}


function readVideoOutputType(node) {

    const value = String(
        getWidgetValue(node, "video_output_type", "IMAGE")
    ).toUpperCase();

    return value === "VIDEO" ? "VIDEO" : "IMAGE";
}


function readSerializedVideoOutputType(outputs) {

    if (!Array.isArray(outputs)) {
        return null;
    }

    for (const output of outputs) {

        if (!output || !/^VIDEO\b/i.test(String(output.name || ""))) {
            continue;
        }

        const type = String(output.type || "").toUpperCase();

        if (type === "VIDEO" || type === "IMAGE") {
            return type;
        }

        return null;
    }

    return null;
}


function parseAssets(node) {

    try {

        const result = JSON.parse(
            getWidgetValue(node, "assets_json", "[]")
        );

        return Array.isArray(result) ? result : [];

    } catch (error) {

        console.warn(
            "[Comfyui-Binfen-Input] JSON parse error",
            error
        );

        return [];
    }
}


function getAssetURL(asset) {

    const url =
        "/view"
        + "?filename=" + encodeURIComponent(asset.filename)
        + "&type=input"
        + "&subfolder=" + encodeURIComponent(
            asset.subfolder || ASSET_FOLDER
        );

    return typeof api.apiURL === "function"
        ? api.apiURL(url)
        : url;
}


/* =========================================================
   NATIVE NODE RESIZE PASSTHROUGH

   这是本次左下角、右下角缩放失效的核心修复。

   LiteGraph Classic 在命中节点时，可能先检查 Widget，
   再判断节点是否处于 resize 区域。

   当鼠标落在原生缩放角时：
   getWidgetOnPos() 必须主动让出命中，
   不能让 DOM Widget 占用原生 resize 的鼠标命中区域。

   节点真正进入 resize 状态后：
   给 DOM 根元素添加 apc-resizing，
   完全释放全部内部控件的鼠标事件。

   pointerup / pointercancel 后自动恢复。
========================================================= */

function beginResizePassthrough(node) {

    if (node._apcResizeCleanup) {
        return;
    }

    const root = node._apcRoot;

    root?.classList.add("apc-resizing");

    const cleanup = () => {

        document.removeEventListener(
            "pointerup",
            cleanup,
            true
        );

        document.removeEventListener(
            "pointercancel",
            cleanup,
            true
        );

        document.removeEventListener(
            "mouseup",
            cleanup,
            true
        );

        root?.classList.remove("apc-resizing");

        node._apcResizeCleanup = null;
    };

    node._apcResizeCleanup = cleanup;

    document.addEventListener(
        "pointerup",
        cleanup,
        true
    );

    document.addEventListener(
        "pointercancel",
        cleanup,
        true
    );

    document.addEventListener(
        "mouseup",
        cleanup,
        true
    );
}


function installDomWidgetResizePassthrough(node) {

    if (node._apcResizePatched) {
        return;
    }

    node._apcResizePatched = true;

    /*
       保存 ComfyUI 原始的 Widget 命中检测。
    */

    const originalGetWidgetOnPos = node.getWidgetOnPos;

    const patchedGetWidgetOnPos = function(x, y) {

        /*
           原生缩放区域优先。

           这里必须保持纯命中检测：
           不监听事件、不改变状态、不操作 DOM。
        */

        if (this.findResizeDirection?.(x, y)) {
            return undefined;
        }

        return originalGetWidgetOnPos?.apply(
            this,
            arguments
        );
    };

    node._apcOriginalGetWidgetOnPos = originalGetWidgetOnPos;

    node._apcPatchedGetWidgetOnPos = patchedGetWidgetOnPos;

    node.getWidgetOnPos = patchedGetWidgetOnPos;


    /*
       保存原始 onResize。

       addDOMWidget 已经链入 ComfyUI 自身的 DOM Widget
       生命周期，下面继续链式包装，不覆盖原有回调。
    */

    const originalOnResize = node.onResize;

    const patchedOnResize = function() {

        /*
           只有 ComfyUI 已将当前节点设置为正在缩放节点，
           才释放 DOM 的全部指针命中。
        */

        if (app.canvas?.resizing_node === this) {
            beginResizePassthrough(this);
        }

        return originalOnResize?.apply(
            this,
            arguments
        );
    };

    node._apcOriginalOnResize = originalOnResize;

    node._apcPatchedOnResize = patchedOnResize;

    node.onResize = patchedOnResize;
}


function cleanupDomWidgetResizePassthrough(node) {

    if (!node) {
        return;
    }

    node._apcResizeCleanup?.();

    /*
       只在仍然是本插件安装的包装函数时恢复。
       避免覆盖其他插件之后安装的合法回调。
    */

    if (
        node.getWidgetOnPos === node._apcPatchedGetWidgetOnPos
    ) {
        node.getWidgetOnPos =
            node._apcOriginalGetWidgetOnPos;
    }

    if (
        node.onResize === node._apcPatchedOnResize
    ) {
        node.onResize =
            node._apcOriginalOnResize;
    }

    node._apcResizePatched = false;

    node._apcOriginalGetWidgetOnPos = null;
    node._apcPatchedGetWidgetOnPos = null;

    node._apcOriginalOnResize = null;
    node._apcPatchedOnResize = null;
}


/* =========================================================
   DOM HOST POINTER PASSTHROUGH
========================================================= */

function applyDOMHostPointerPassthrough(node) {

    const root = node._apcRoot;

    if (!root?.isConnected) {
        return false;
    }

    /*
       只针对专属 DOM Widget 容器。
       不修改整个 ComfyUI canvas 或共享父容器。
    */

    const host = root.closest(
        ".dom-widget, .lg-node-widget"
    );

    if (!host) {
        return false;
    }

    if (
        node._apcDOMHost &&
        node._apcDOMHost !== host
    ) {
        node._apcDOMHost.classList.remove(
            "apc-dom-widget-host"
        );
    }

    host.classList.add("apc-dom-widget-host");

    node._apcDOMHost = host;

    return true;
}


function restoreDOMHostPointerPassthrough(node) {

    node._apcDOMHost?.classList.remove(
        "apc-dom-widget-host"
    );

    node._apcDOMHost = null;
}


/* =========================================================
   WIDGET VISIBILITY
========================================================= */

function hideInternalWidgets(node) {

    const names = [
        "assets_json",
        "prompt",
        "image_count",
        "video_count",
        "audio_count",
        "video_output_type",
        "resolution_ratio",
        "resolution_megapixels",
        "resolution_multiple",
        "resolution_visible",
        "clear_assets_after_run",
        "clear_prompt_after_run"
    ];

    for (const widget of node.widgets || []) {

        if (!names.includes(widget.name)) {
            continue;
        }

        widget.type = "hidden";
        widget.hidden = true;

        widget.computeSize = () => [0, 0];

        widget.draw = () => {};
    }
}


/* =========================================================
   DETERMINISTIC HEIGHT CALCULATION
========================================================= */

function calculateWidgetMinHeight(node) {

    const state = node._apcState;

    const assets = state?.assets || [];

    const nodeWidth = Math.max(
        620,
        Number(node.size?.[0]) || 620
    );

    const availableWidth = Math.max(
        72,
        nodeWidth - 125
    );

    const groups = [
        {
            type: "image",
            cardWidth: 64,
            cardHeight: 64
        },
        {
            type: "video",
            cardWidth: 64,
            cardHeight: 64
        },
        {
            type: "audio",
            cardWidth: 155,
            cardHeight: 56
        }
    ];

    let groupHeightTotal = 0;
    let activeGroups = 0;

    for (const group of groups) {

        const count = assets.filter(
            asset => asset.type === group.type
        ).length;

        if (count <= 0) {
            continue;
        }

        const gap = 8;

        const perRow = Math.max(
            1,
            Math.floor(
                (availableWidth + gap) /
                (group.cardWidth + gap)
            )
        );

        const rows = Math.ceil(
            count / perRow
        );

        const itemsHeight =
            rows * group.cardHeight
            + Math.max(0, rows - 1) * gap;

        const currentGroupHeight = Math.max(
            64,
            itemsHeight
        );

        groupHeightTotal += currentGroupHeight;

        activeGroups++;
    }

    const rootPadding = 14;

    const inputShellHeight = assets.length > 0
        ? 243
        : 225;

    const metaHeight = 48;

    const statusHeight = 20;

    let assetContribution = 0;

    if (activeGroups > 0) {

        assetContribution =
            22
            + groupHeightTotal
            + (activeGroups - 1) * 9;
    }

    return Math.ceil(
        rootPadding
        + inputShellHeight
        + metaHeight
        + statusHeight
        + assetContribution
    );
}


/* =========================================================
   UPDATE NODE LAYOUT
========================================================= */

function refreshNodeLayout(node) {

    if (!node._apcRoot) {
        return;
    }

    const widget = node._apcDOMWidget;

    if (widget?.options) {

        widget.options.getMinHeight = () => {
            return calculateWidgetMinHeight(node);
        };

        /*
           不锁定 DOM Widget 最大高度。
           保留节点自由增高能力。
        */

        delete widget.options.getMaxHeight;
    }

    node._apcRoot.style.height = "100%";

    node._apcRoot.style.minHeight =
        `${calculateWidgetMinHeight(node)}px`;

    node._apcRoot.style.maxHeight = "none";

    applyDOMHostPointerPassthrough(node);

    node.setDirtyCanvas?.(true, true);
}


/* =========================================================
   OUTPUT SOCKET DEFINITIONS
========================================================= */

function buildOutputDefinitions(counts, videoOutputType = "IMAGE") {

    const outputs = [];

    const videoType = String(videoOutputType).toUpperCase() === "VIDEO"
        ? "VIDEO"
        : "IMAGE";

    for (let i = 0; i < counts.images; i++) {

        outputs.push({
            name: `IMAGE ${i + 1}`,
            type: "IMAGE"
        });
    }

    for (let i = 0; i < counts.videos; i++) {

        outputs.push({
            name: `VIDEO ${i + 1}`,
            type: videoType
        });
    }

    for (let i = 0; i < counts.audios; i++) {

        outputs.push({
            name: `AUDIO ${i + 1}`,
            type: "AUDIO"
        });
    }

    outputs.push({
        name: "PROMPT",
        type: "STRING"
    });

    outputs.push({
        name: "WIDTH",
        type: "INT"
    });

    outputs.push({
        name: "HEIGHT",
        type: "INT"
    });

    return outputs;
}


function getGraphLink(graph, linkId) {

    if (!graph) {
        return null;
    }

    if (typeof graph.getLink === "function") {

        const link = graph.getLink(linkId);

        if (link) {
            return link;
        }
    }

    if (graph.links instanceof Map) {
        return graph.links.get(linkId) || null;
    }

    return graph.links?.[linkId] || null;
}


/* =========================================================
   OUTPUT LINK COLLECTION
========================================================= */

/*
   直接从 graph.links 读取本节点所有出线，并按 origin_slot 分组。

   不依赖 output.links 镜像：新版 ComfyUI 前端里它可能只是
   由 link store 生成的只读视图，或尚未同步。
*/

function collectOutputLinksBySlot(node) {

    const result = new Map();

    const graph = node.graph;

    if (!graph?.links) {
        return result;
    }

    const links = graph.links instanceof Map
        ? Array.from(graph.links.values())
        : Object.values(graph.links);

    for (const link of links) {

        if (!link || link.origin_id !== node.id) {
            continue;
        }

        if (!result.has(link.origin_slot)) {
            result.set(link.origin_slot, []);
        }

        result.get(link.origin_slot).push(link);
    }

    return result;
}


/* =========================================================
   SYNC OUTPUT SOCKETS
========================================================= */

function syncOutputSockets(node, counts) {

    const definitions = buildOutputDefinitions(
        counts,
        readVideoOutputType(node)
    );

    const oldOutputs = node.outputs || [];

    const graph = node.graph;

    const newIndexByName = new Map();

    definitions.forEach((definition, index) => {

        newIndexByName.set(
            definition.name,
            index
        );
    });

    const connections = [];

    for (const [slot, links] of collectOutputLinksBySlot(node)) {

        const oldOutput = oldOutputs[slot];

        const targetIndex = oldOutput
            ? newIndexByName.get(oldOutput.name)
            : undefined;

        for (const link of links) {

            if (targetIndex === undefined) {

                if (graph?.removeLink) {
                    graph.removeLink(link.id);
                }

                continue;
            }

            connections.push({
                linkId: link.id,
                link,
                targetIndex
            });
        }
    }

    const newOutputs = definitions.map(definition => {

        return {
            name: definition.name,
            type: definition.type,
            links: []
        };

    });

    for (const connection of connections) {

        const {
            linkId,
            link,
            targetIndex
        } = connection;

        link.origin_slot = targetIndex;

        newOutputs[targetIndex].links.push(linkId);
    }

    node.outputs = newOutputs;

    node.setDirtyCanvas?.(true, true);
}


/*
   按索引恢复输出端口布局，不移动任何连线。

   仅用于工作流加载/粘贴场景：此时连线在序列化数据里的
   origin_slot 已经和保存时的端口布局一致，不能再按名字重映射，
   否则在端口数量尚未恢复的瞬间会被错误地重新定向。

   连线列表直接从 graph.links 按 origin_slot 归位，保证
   每个端口拿到的是它真正对应的连线，而不是靠旧端口名字猜。
*/

function applyOutputLayout(node, counts) {

    const definitions = buildOutputDefinitions(
        counts,
        readVideoOutputType(node)
    );

    const linksBySlot = collectOutputLinksBySlot(node);

    node.outputs = definitions.map((definition, index) => {

        const links = linksBySlot.get(index) || [];

        return {
            name: definition.name,
            type: definition.type,
            links: links.map(link => link.id)
        };
    });

    node.setDirtyCanvas?.(true, true);
}


/* =========================================================
   EMPTY OUTPUT PORT PRUNING
========================================================= */

/*
   计算一个节点本次“没有素材”的输出槽位索引。

   后端执行顺序固定为：
       IMAGE -> VIDEO -> AUDIO -> PROMPT -> WIDTH -> HEIGHT

   与 buildOutputDefinitions() 完全一致。
*/

function getUnusedOutputSlots(node) {

    const state = node._apcState;

    if (!state) {
        return null;
    }

    const counts = state.counts || {};

    const typeInfo = [
        { type: "image", total: counts.images || 0 },
        { type: "video", total: counts.videos || 0 },
        { type: "audio", total: counts.audios || 0 }
    ];

    const provided = {
        image: 0,
        video: 0,
        audio: 0
    };

    for (const asset of state.assets || []) {

        if (provided[asset.type] !== undefined) {
            provided[asset.type] += 1;
        }
    }

    const unused = new Set();

    let offset = 0;

    for (const info of typeInfo) {

        const used = Math.min(
            provided[info.type],
            info.total
        );

        for (let i = used; i < info.total; i++) {
            unused.add(offset + i);
        }

        offset += info.total;
    }

    return unused;
}


/*
   从本次提交的 API Prompt 中移除“已连线但无素材”的引用。

   只修改临时序列化结果，不修改画布上的连线，
   也不修改保存的工作流。

   这样下游节点会把这些端口视为“未连接”，
   而不是收到 ExecutionBlocker 导致整个节点被跳过。
*/

function pruneUnusedComposerLinks(promptOutput) {

    if (!promptOutput || typeof promptOutput !== "object") {
        return;
    }

    const unusedByNodeId = new Map();

    for (const node of composerNodes) {

        if (node?.id === undefined || node?.id === null) {
            continue;
        }

        const unused = getUnusedOutputSlots(node);

        if (unused && unused.size > 0) {
            unusedByNodeId.set(
                String(node.id),
                unused
            );
        }
    }

    if (unusedByNodeId.size === 0) {
        return;
    }

    for (const nodeInfo of Object.values(promptOutput)) {

        const inputs = nodeInfo?.inputs;

        if (!inputs) {
            continue;
        }

        for (const [inputName, value] of Object.entries(inputs)) {

            if (!Array.isArray(value) || value.length !== 2) {
                continue;
            }

            const unused = unusedByNodeId.get(
                String(value[0])
            );

            if (!unused || !unused.has(Number(value[1]))) {
                continue;
            }

            delete inputs[inputName];
        }
    }
}


let queuePruningInstalled = false;

let queuePruningActive = false;


function installQueuePruning() {

    if (queuePruningInstalled) {
        return;
    }

    if (
        typeof app?.graphToPrompt !== "function" ||
        typeof app?.queuePrompt !== "function"
    ) {
        return;
    }

    queuePruningInstalled = true;

    /*
       只在真正提交队列时裁剪。
       Export / Save 等其它调用 graphToPrompt 的场景不受影响，
       避免把模板里完整的连线导出丢失。
    */

    const originalGraphToPrompt =
        app.graphToPrompt.bind(app);

    app.graphToPrompt = async function(...args) {

        const result = await originalGraphToPrompt(...args);

        if (queuePruningActive && result?.output) {

            try {
                pruneUnusedComposerLinks(result.output);
            } catch (error) {

                console.warn(
                    "[Comfyui-Binfen-Input] 空端口连线清理失败",
                    error
                );
            }
        }

        return result;
    };

    const originalQueuePrompt =
        app.queuePrompt.bind(app);

    app.queuePrompt = async function(...args) {

        queuePruningActive = true;

        try {
            return await originalQueuePrompt(...args);
        } finally {
            queuePruningActive = false;
        }
    };
}


/* =========================================================
   SAVE STATE
========================================================= */

function saveAssets(node) {

    const state = node._apcState;

    if (!state) {
        return;
    }

    setWidgetValue(
        node,
        "assets_json",
        JSON.stringify(state.assets)
    );
}


function savePrompt(node) {

    if (!node._apcUI) {
        return;
    }

    setWidgetValue(
        node,
        "prompt",
        node._apcUI.textarea.value
    );
}


function saveCounts(node) {

    const state = node._apcState;

    if (!state) {
        return;
    }

    setWidgetValue(
        node,
        "image_count",
        state.counts.images
    );

    setWidgetValue(
        node,
        "video_count",
        state.counts.videos
    );

    setWidgetValue(
        node,
        "audio_count",
        state.counts.audios
    );

    trimAssetsToLimits(node);

    syncOutputSockets(
        node,
        state.counts
    );

    saveAssets(node);

    renderAssets(node);
}


/* =========================================================
   TRIM ASSETS
========================================================= */

function trimAssetsToLimits(node) {

    const state = node._apcState;

    const limits = {
        image: state.counts.images,
        video: state.counts.videos,
        audio: state.counts.audios
    };

    const used = {
        image: 0,
        video: 0,
        audio: 0
    };

    state.assets = state.assets.filter(asset => {

        const type = asset.type;

        if (!Object.prototype.hasOwnProperty.call(
            limits,
            type
        )) {
            return false;
        }

        if (used[type] >= limits[type]) {
            return false;
        }

        used[type]++;

        return true;
    });
}


/* =========================================================
   FILE CLASSIFICATION
========================================================= */

function classifyFile(file) {

    const mime = (file.type || "").toLowerCase();

    const name = (file.name || "").toLowerCase();

    const extension = name.includes(".")
        ? name.split(".").pop()
        : "";

    if (
        mime.startsWith("image/")
        || [
            "png",
            "jpg",
            "jpeg",
            "webp",
            "bmp",
            "gif",
            "tif",
            "tiff"
        ].includes(extension)
    ) {
        return "image";
    }

    if (
        mime.startsWith("video/")
        || [
            "mp4",
            "webm",
            "mov",
            "mkv",
            "avi",
            "m4v"
        ].includes(extension)
    ) {
        return "video";
    }

    if (
        mime.startsWith("audio/")
        || [
            "wav",
            "mp3",
            "flac",
            "ogg",
            "opus",
            "m4a",
            "aac",
            "wma"
        ].includes(extension)
    ) {
        return "audio";
    }

    return null;
}


/* =========================================================
   UPLOAD FILES
========================================================= */

async function uploadFiles(node, files) {

    const state = node._apcState;

    if (!state || !files.length) {
        return;
    }

    const status = node._apcUI.status;

    const limits = {
        image: state.counts.images,
        video: state.counts.videos,
        audio: state.counts.audios
    };

    const used = {
        image: state.assets.filter(
            item => item.type === "image"
        ).length,

        video: state.assets.filter(
            item => item.type === "video"
        ).length,

        audio: state.assets.filter(
            item => item.type === "audio"
        ).length
    };

    const newAssets = [];

    let rejected = 0;
    let failed = 0;
    let duplicated = 0;

    status.textContent = "正在上传素材...";
    status.className = "apc-status";

    for (const file of files) {

        const type = classifyFile(file);

        if (!type) {

            rejected++;

            continue;
        }

        if (used[type] >= limits[type]) {

            rejected++;

            continue;
        }

        used[type]++;

        try {

            const form = new FormData();

            const fallbackExtension = {
                image: "png",
                video: "mp4",
                audio: "wav"
            }[type];

            const filename = file.name || (
                `pasted_${Date.now()}.${fallbackExtension}`
            );

            form.append(
                "file",
                file,
                filename
            );

            const response = await api.fetchApi(
                "/binfen_input/upload",
                {
                    method: "POST",
                    body: form
                }
            );

            const result = await response.json();

            if (!response.ok || !result.success) {

                throw new Error(
                    result.error || response.statusText
                );
            }

            /*
               后端按 MD5 复用同一份文件。
               前端同样跳过已经存在的文件，
               避免重复上传不断往素材列表里追加。
            */

            const isDuplicate = (
                state.assets.some(
                    item => item.filename === result.filename
                )
                || newAssets.some(
                    item => item.filename === result.filename
                )
            );

            if (isDuplicate) {

                duplicated++;

                used[type]--;

                continue;
            }

            newAssets.push({

                id: createId(),

                type: result.type,

                filename: result.filename,

                original_name: result.original_name,

                subfolder: result.subfolder,

                size: result.size

            });

        } catch (error) {

            failed++;

            used[type]--;

            console.error(
                "[Comfyui-Binfen-Input] Upload failed",
                error
            );
        }
    }

    if (newAssets.length > 0) {

        state.assets.push(...newAssets);

        saveAssets(node);

        renderAssets(node);
    }

    const messages = [];

    if (newAssets.length) {
        messages.push(`成功上传 ${newAssets.length} 个`);
    }

    if (rejected) {
        messages.push(`跳过 ${rejected} 个文件`);
    }

    if (duplicated) {
        messages.push(`跳过 ${duplicated} 个重复文件`);
    }

    if (failed) {
        messages.push(`${failed} 个上传失败`);
    }

    if (messages.length) {

        status.textContent = messages.join("，");

        status.className = failed
            ? "apc-status apc-error"
            : "apc-status apc-success";
    }
}


/* =========================================================
   REORDER ASSETS
========================================================= */

function reorderAssets(
    node,
    type,
    sourceId,
    targetId
) {

    if (sourceId === targetId) {
        return;
    }

    const state = node._apcState;

    const indexes = [];

    const group = [];

    state.assets.forEach((asset, index) => {

        if (asset.type === type) {

            indexes.push(index);

            group.push(asset);
        }
    });

    const sourceIndex = group.findIndex(
        item => item.id === sourceId
    );

    const targetIndex = group.findIndex(
        item => item.id === targetId
    );

    if (sourceIndex < 0 || targetIndex < 0) {
        return;
    }

    const [moved] = group.splice(
        sourceIndex,
        1
    );

    group.splice(
        targetIndex,
        0,
        moved
    );

    for (let i = 0; i < indexes.length; i++) {
        state.assets[indexes[i]] = group[i];
    }

    saveAssets(node);

    renderAssets(node);
}


/* =========================================================
   REMOVE ASSET
========================================================= */

function removeAsset(node, id) {

    const state = node._apcState;

    state.assets = state.assets.filter(
        asset => asset.id !== id
    );

    saveAssets(node);

    renderAssets(node);
}


/* =========================================================
   DRAG SORTING
========================================================= */

function bindDragSorting(node, card, asset) {

    card.draggable = true;

    card.dataset.id = asset.id;

    card.dataset.type = asset.type;

    card.addEventListener("dragstart", event => {

        node._apcDraggingAsset = asset.id;

        node._apcDraggingType = asset.type;

        card.classList.add("apc-dragging");

        event.dataTransfer.effectAllowed = "move";

        event.dataTransfer.setData(
            "text/plain",
            asset.id
        );
    });

    card.addEventListener("dragend", () => {

        node._apcDraggingAsset = null;

        node._apcDraggingType = null;

        card.classList.remove("apc-dragging");

        node._apcUI.assets
            .querySelectorAll(".apc-drag-target")
            .forEach(element => {
                element.classList.remove("apc-drag-target");
            });
    });

    card.addEventListener("dragover", event => {

        const sourceId = node._apcDraggingAsset;

        if (!sourceId || sourceId === asset.id) {
            return;
        }

        if (node._apcDraggingType !== asset.type) {
            return;
        }

        event.preventDefault();

        event.dataTransfer.dropEffect = "move";

        card.classList.add("apc-drag-target");
    });

    card.addEventListener("dragleave", () => {

        card.classList.remove("apc-drag-target");
    });

    card.addEventListener("drop", event => {

        event.preventDefault();

        event.stopPropagation();

        card.classList.remove("apc-drag-target");

        const sourceId =
            event.dataTransfer.getData("text/plain")
            || node._apcDraggingAsset;

        if (!sourceId) {
            return;
        }

        reorderAssets(
            node,
            asset.type,
            sourceId,
            asset.id
        );
    });
}


/* =========================================================
   IMAGE / VIDEO CARD
========================================================= */

function createAssetCard(node, asset, index) {

    const card = document.createElement("div");

    card.className = "apc-asset-card";

    if (asset.type === "image") {

        const image = document.createElement("img");

        image.src = getAssetURL(asset);

        image.alt = asset.original_name || "Image";

        image.loading = "lazy";

        image.decoding = "async";

        image.draggable = false;

        card.appendChild(image);

    } else {

        const video = document.createElement("video");

        video.src = getAssetURL(asset);

        video.muted = true;

        video.playsInline = true;

        video.preload = "metadata";

        video.draggable = false;

        card.appendChild(video);
    }

    const handle = document.createElement("div");

    handle.className = "apc-drag-handle";

    handle.innerHTML = ICONS.grip;

    card.appendChild(handle);

    const indexLabel = document.createElement("span");

    indexLabel.className = "apc-asset-index";

    indexLabel.textContent = String(index + 1);

    card.appendChild(indexLabel);

    const remove = document.createElement("button");

    remove.type = "button";

    remove.className = "apc-asset-remove";

    remove.innerHTML = ICONS.close;

    remove.title = "移除素材";

    remove.addEventListener("click", event => {

        event.preventDefault();

        event.stopPropagation();

        removeAsset(
            node,
            asset.id
        );
    });

    card.appendChild(remove);

    bindDragSorting(
        node,
        card,
        asset
    );

    return card;
}


/* =========================================================
   AUDIO CARD
========================================================= */

function createAudioCard(node, asset, index) {

    const card = document.createElement("div");

    card.className = "apc-asset-card apc-audio-card";

    const audio = document.createElement("audio");

    audio.preload = "none";

    let audioLoaded = false;

    const playButton = document.createElement("button");

    playButton.type = "button";

    playButton.className = "apc-audio-play";

    playButton.innerHTML = ICONS.audioPlay;

    playButton.addEventListener("click", async event => {

        event.stopPropagation();

        try {

            if (!audioLoaded) {

                audio.src = getAssetURL(asset);

                audioLoaded = true;
            }

            if (audio.paused) {

                node._apcUI.assets
                    .querySelectorAll("audio")
                    .forEach(other => {

                        if (other !== audio) {
                            other.pause();
                            other.currentTime = 0;
                        }
                    });

                await audio.play();

            } else {

                audio.pause();
            }

        } catch (error) {

            console.warn(
                "[Comfyui-Binfen-Input] Audio playback error",
                error
            );
        }
    });

    audio.addEventListener("play", () => {
        playButton.innerHTML = ICONS.audioPause;
    });

    audio.addEventListener("pause", () => {
        playButton.innerHTML = ICONS.audioPlay;
    });

    audio.addEventListener("ended", () => {
        playButton.innerHTML = ICONS.audioPlay;
    });

    const info = document.createElement("div");

    info.className = "apc-audio-info";

    const name = document.createElement("div");

    name.className = "apc-audio-name";

    name.textContent = asset.original_name || "Audio";

    const label = document.createElement("div");

    label.className = "apc-audio-type";

    label.textContent = `AUDIO ${index + 1}`;

    info.appendChild(name);

    info.appendChild(label);

    const remove = document.createElement("button");

    remove.type = "button";

    remove.className = "apc-asset-remove apc-audio-remove";

    remove.innerHTML = ICONS.close;

    remove.title = "移除音频";

    remove.addEventListener("click", event => {

        event.stopPropagation();

        audio.pause();

        removeAsset(
            node,
            asset.id
        );
    });

    card.appendChild(playButton);

    card.appendChild(info);

    card.appendChild(remove);

    card.appendChild(audio);

    bindDragSorting(
        node,
        card,
        asset
    );

    return card;
}


/* =========================================================
   RENDER ASSETS
========================================================= */

function renderAssets(node) {

    const state = node._apcState;

    const container = node._apcUI.assets;

    container.querySelectorAll("audio").forEach(audio => {
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
    });

    const fragment = document.createDocumentFragment();

    const groups = [
        {
            type: "image",
            label: "IMAGES",
            icon: "image"
        },
        {
            type: "video",
            label: "VIDEOS",
            icon: "video"
        },
        {
            type: "audio",
            label: "AUDIO",
            icon: "audio"
        }
    ];

    let total = 0;

    for (const group of groups) {

        const items = state.assets.filter(
            asset => asset.type === group.type
        );

        if (!items.length) {
            continue;
        }

        total += items.length;

        const row = document.createElement("div");

        row.className = "apc-asset-group";

        const label = document.createElement("div");

        label.className = "apc-group-label";

        label.innerHTML =
            icon(group.icon)
            + `<span>${group.label}</span>`;

        const list = document.createElement("div");

        list.className = "apc-group-items";

        items.forEach((asset, index) => {

            const card = group.type === "audio"
                ? createAudioCard(node, asset, index)
                : createAssetCard(node, asset, index);

            list.appendChild(card);
        });

        row.appendChild(label);

        row.appendChild(list);

        fragment.appendChild(row);
    }

    container.replaceChildren(fragment);

    container.hidden = total === 0;

    node._apcRoot.classList.toggle(
        "apc-has-assets",
        total > 0
    );

    refreshNodeLayout(node);
}


/* =========================================================
   CLEAR ALL
========================================================= */

function clearAll(node) {

    node._apcState.assets = [];

    clearPromptUndoable(node);

    saveAssets(node);

    savePrompt(node);

    renderAssets(node);

    setStatus(
        node,
        "素材和提示词已清空",
        "success"
    );
}


/* =========================================================
   STATUS
========================================================= */

function setStatus(node, message, type = "") {

    const status = node._apcUI?.status;

    if (!status) {
        return;
    }

    status.textContent = message;

    status.className = "apc-status";

    if (type === "error") {

        status.classList.add("apc-error");

    } else if (type === "success") {

        status.classList.add("apc-success");
    }
}


/* =========================================================
   SETTINGS
   点击面板外部自动关闭
========================================================= */

function closeSettings(node) {

    const ui = node._apcUI;

    if (!ui) {
        return;
    }

    if (ui.settings) {
        ui.settings.hidden = true;
    }

    closeVideoTypePopover();

    ui.settingsButton?.classList.remove("apc-active");

    if (ui.outsidePointerHandler) {

        document.removeEventListener(
            "pointerdown",
            ui.outsidePointerHandler,
            true
        );
    }
}


function toggleSettings(node) {

    const ui = node._apcUI;

    if (!ui) {
        return;
    }

    const shouldOpen = ui.settings.hidden;

    if (!shouldOpen) {

        closeSettings(node);

        return;
    }

    ui.settings.hidden = false;

    ui.settingsButton.classList.add("apc-active");

    if (!ui.outsidePointerHandler) {

        ui.outsidePointerHandler = event => {

            const target = event.target;

            if (ui.settingsButton.contains(target)) {
                return;
            }

            if (ui.settings.contains(target)) {
                return;
            }

            if (videoTypePopover?.contains(target)) {
                return;
            }

            closeSettings(node);
        };
    }

    document.addEventListener(
        "pointerdown",
        ui.outsidePointerHandler,
        true
    );
}


function updateSetting(node, type, input) {

    const state = node._apcState;

    const keys = {
        image: "images",
        video: "videos",
        audio: "audios"
    };

    const maximums = {
        image: MAX_IMAGES,
        video: MAX_VIDEOS,
        audio: MAX_AUDIOS
    };

    const key = keys[type];

    if (!key) {
        return;
    }

    const value = clamp(
        input.value,
        0,
        maximums[type]
    );

    input.value = value;

    state.counts[key] = value;

    saveCounts(node);
}


function updateVideoOutputType(node, value) {

    const state = node._apcState;

    if (!state) {
        return;
    }

    const type = String(value).toUpperCase() === "VIDEO"
        ? "VIDEO"
        : "IMAGE";

    state.videoOutputType = type;

    setWidgetValue(
        node,
        "video_output_type",
        type
    );

    syncOutputSockets(
        node,
        state.counts
    );

    syncVideoTypeTrigger(node);
}


/* =========================================================
   VIDEO OUTPUT TYPE DROPDOWN
========================================================= */

let videoTypePopover = null;

let videoTypeAnchor = null;

let videoTypeNode = null;

let videoTypeOutsideHandler = null;

let videoTypeKeyHandler = null;

let videoTypePositionHandler = null;


function videoOutputTypeLabel(type) {

    return String(type).toUpperCase() === "VIDEO"
        ? "视频文件 (VIDEO)"
        : "视频帧 (IMAGE)";
}


function syncVideoTypeTrigger(node) {

    const trigger = node?._apcUI?.root?.querySelector(
        "[data-output-type-trigger='video']"
    );

    if (!trigger) {
        return;
    }

    const value = trigger.querySelector(
        ".apc-select-value"
    );

    if (value) {

        value.textContent = videoOutputTypeLabel(
            node._apcState?.videoOutputType
        );
    }
}


function createVideoTypePopover() {

    const panel = document.createElement("div");

    panel.className = "apc-video-type-popover";

    panel.hidden = true;

    panel.innerHTML = `
        <div class="apc-resolution-title">视频输出类型</div>
        <div class="apc-video-type-options">
            <button
                type="button"
                class="apc-video-type-option"
                data-video-type="IMAGE"
            >
                视频帧 <small>IMAGE</small>
            </button>
            <button
                type="button"
                class="apc-video-type-option"
                data-video-type="VIDEO"
            >
                视频文件 <small>VIDEO</small>
            </button>
        </div>`;

    panel.addEventListener("pointerdown", event => {
        event.stopPropagation();
    });

    panel.querySelectorAll("[data-video-type]").forEach(button => {

        button.addEventListener("click", () => {

            const node = videoTypeNode;

            const value = button.dataset.videoType;

            closeVideoTypePopover();

            if (node) {
                updateVideoOutputType(node, value);
            }
        });
    });

    return panel;
}


function updateVideoTypePopover() {

    if (!videoTypePopover) {
        return;
    }

    const type = videoTypeNode?._apcState?.videoOutputType;

    videoTypePopover.querySelectorAll(
        "[data-video-type]"
    ).forEach(button => {

        const active =
            button.dataset.videoType === type;

        button.classList.toggle("apc-active", active);

        button.setAttribute(
            "aria-pressed",
            String(active)
        );
    });
}


function positionVideoTypePopover() {

    if (!videoTypeAnchor || !videoTypePopover) {
        return;
    }

    const rect = videoTypeAnchor.getBoundingClientRect();

    videoTypePopover.style.visibility = "hidden";

    videoTypePopover.hidden = false;

    const menuRect = videoTypePopover.getBoundingClientRect();

    const left = clamp(
        rect.right - menuRect.width,
        8,
        Math.max(8, window.innerWidth - menuRect.width - 8)
    );

    let top = rect.bottom + 6;

    if (top + menuRect.height > window.innerHeight - 8) {
        top = rect.top - menuRect.height - 6;
    }

    videoTypePopover.style.left = `${left}px`;

    videoTypePopover.style.top = `${top}px`;

    videoTypePopover.style.visibility = "";
}


function openVideoTypePopover(node, trigger) {

    videoTypeNode = node;

    videoTypeAnchor = trigger;

    if (!videoTypePopover) {

        videoTypePopover = createVideoTypePopover();

        document.body.appendChild(videoTypePopover);
    }

    updateVideoTypePopover();

    positionVideoTypePopover();

    trigger.classList.add("apc-active");

    trigger.setAttribute("aria-expanded", "true");

    if (!videoTypeOutsideHandler) {

        videoTypeOutsideHandler = event => {

            const target = event.target;

            if (videoTypeAnchor?.contains(target)) {
                return;
            }

            if (videoTypePopover?.contains(target)) {
                return;
            }

            closeVideoTypePopover();
        };
    }

    document.addEventListener(
        "pointerdown",
        videoTypeOutsideHandler,
        true
    );

    if (!videoTypeKeyHandler) {

        videoTypeKeyHandler = event => {

            if (event.key === "Escape") {
                closeVideoTypePopover();
            }
        };
    }

    document.addEventListener(
        "keydown",
        videoTypeKeyHandler,
        true
    );

    if (!videoTypePositionHandler) {

        videoTypePositionHandler = () => {

            if (
                videoTypePopover &&
                !videoTypePopover.hidden
            ) {
                positionVideoTypePopover();
            }
        };
    }

    window.addEventListener(
        "resize",
        videoTypePositionHandler
    );

    window.addEventListener(
        "scroll",
        videoTypePositionHandler,
        true
    );
}


function closeVideoTypePopover() {

    if (videoTypePopover) {
        videoTypePopover.hidden = true;
    }

    videoTypeAnchor?.classList.remove("apc-active");

    videoTypeAnchor?.setAttribute("aria-expanded", "false");

    if (videoTypeOutsideHandler) {

        document.removeEventListener(
            "pointerdown",
            videoTypeOutsideHandler,
            true
        );

        videoTypeOutsideHandler = null;
    }

    if (videoTypeKeyHandler) {

        document.removeEventListener(
            "keydown",
            videoTypeKeyHandler,
            true
        );

        videoTypeKeyHandler = null;
    }

    if (videoTypePositionHandler) {

        window.removeEventListener(
            "resize",
            videoTypePositionHandler
        );

        window.removeEventListener(
            "scroll",
            videoTypePositionHandler,
            true
        );

        videoTypePositionHandler = null;
    }

    videoTypeAnchor = null;

    videoTypeNode = null;
}


/* =========================================================
   RESOLUTION SELECTOR

   分辨率设置按节点独立保存在 widget 里，
   随工作流一起序列化，不同工作流之间互不影响。

   localStorage 只保留“上一次使用的设置”，
   仅作为新建节点的初始值种子。
========================================================= */

const resolutionCapsules = new Map();

let activeResolutionCapsule = null;

let resolutionPopover = null;

let resolutionOutsideHandler = null;

let resolutionKeyHandler = null;

let resolutionPositionHandler = null;


function normalizeResolutionState(value) {

    const ratio = RESOLUTION_RATIOS.some(
        item => item.id === value?.ratio
    )
        ? value.ratio
        : DEFAULT_RESOLUTION.ratio;

    const megapixels = Number(value?.megapixels);

    const multiple = Number(value?.multiple);

    return {

        ratio,

        megapixels: Number.isFinite(megapixels)
            ? clampFloat(megapixels, 0.1, 16)
            : DEFAULT_RESOLUTION.megapixels,

        multiple: Number.isFinite(multiple)
            ? clamp(
                Math.round(multiple / 4) * 4,
                8,
                128
            )
            : DEFAULT_RESOLUTION.multiple,

        visible: value?.visible === undefined
            ? DEFAULT_RESOLUTION.visible
            : Boolean(value.visible)
    };
}


function readResolutionSeed() {

    try {

        return JSON.parse(
            localStorage.getItem(
                RESOLUTION_STORAGE_KEY
            ) || "null"
        );

    } catch (error) {

        return null;
    }
}


function saveResolutionSeed(state) {

    try {

        localStorage.setItem(
            RESOLUTION_STORAGE_KEY,
            JSON.stringify(state)
        );

    } catch (error) {

        console.warn(
            "[Comfyui-Binfen-Input] 无法保存分辨率设置",
            error
        );
    }
}


/*
   读取某个节点自己的分辨率设置。
   全部来自 widget，因此随工作流保存和恢复。
*/

function getNodeResolutionState(node) {

    return normalizeResolutionState({

        ratio: getWidgetValue(
            node,
            "resolution_ratio",
            DEFAULT_RESOLUTION.ratio
        ),

        megapixels: getWidgetValue(
            node,
            "resolution_megapixels",
            DEFAULT_RESOLUTION.megapixels
        ),

        multiple: getWidgetValue(
            node,
            "resolution_multiple",
            DEFAULT_RESOLUTION.multiple
        ),

        visible: getWidgetValue(
            node,
            "resolution_visible",
            DEFAULT_RESOLUTION.visible
        )
    });
}


function getResolutionRatio(id) {

    return RESOLUTION_RATIOS.find(
        item => item.id === id
    ) || RESOLUTION_RATIOS[0];
}


/*
   与 Python 的 round() 保持一致：
   正好落在 .5 时向偶数舍入，避免预览尺寸和后端实际输出差一档。
*/

function roundHalfEven(value) {

    const floor = Math.floor(value);

    const fraction = value - floor;

    if (fraction > 0.5) {
        return floor + 1;
    }

    if (fraction < 0.5) {
        return floor;
    }

    return floor % 2 === 0 ? floor : floor + 1;
}


function calculateResolution(state) {

    const ratio = getResolutionRatio(state.ratio);

    const totalPixels = state.megapixels * 1024 * 1024;

    const scale = Math.sqrt(
        totalPixels / (ratio.width * ratio.height)
    );

    return {

        width: roundHalfEven(
            ratio.width * scale / state.multiple
        ) * state.multiple,

        height: roundHalfEven(
            ratio.height * scale / state.multiple
        ) * state.multiple
    };
}


function ratioIcon(id, size = 16) {

    const ratio = getResolutionRatio(id);

    const maxSide = 18;

    let width = maxSide;
    let height = maxSide;

    if (ratio.width >= ratio.height) {

        height = Math.max(
            4,
            Math.round(maxSide * ratio.height / ratio.width)
        );

    } else {

        width = Math.max(
            4,
            Math.round(maxSide * ratio.width / ratio.height)
        );
    }

    const x = (24 - width) / 2;
    const y = (24 - height) / 2;

    return `
        <svg
            viewBox="0 0 24 24"
            width="${size}"
            height="${size}"
            aria-hidden="true"
        >
            <rect
                x="${x}"
                y="${y}"
                width="${width}"
                height="${height}"
                rx="2.5"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
            />
        </svg>`;
}


function applyResolutionToNode(node, state) {

    if (!node) {
        return;
    }

    const target = state
        ? normalizeResolutionState(state)
        : getNodeResolutionState(node);

    setWidgetValue(
        node,
        "resolution_ratio",
        target.ratio
    );

    setWidgetValue(
        node,
        "resolution_megapixels",
        target.megapixels
    );

    setWidgetValue(
        node,
        "resolution_multiple",
        target.multiple
    );

    setWidgetValue(
        node,
        "resolution_visible",
        target.visible
    );
}


/*
   只修改传入的这一个节点。
   其它节点、其它工作流完全不受影响。
*/

function updateResolution(node, patch) {

    if (!node) {
        return;
    }

    const state = normalizeResolutionState({
        ...getNodeResolutionState(node),
        ...patch
    });

    applyResolutionToNode(node, state);

    saveResolutionSeed(state);

    syncResolutionSettingsUI(node);

    ensureResolutionCapsule();

    if (activeResolutionCapsule?._apcNode === node) {
        updateResolutionPopover();
    }
}


function syncResolutionSettingsUI(node = null) {

    const nodes = node
        ? [node]
        : Array.from(composerNodes);

    for (const target of nodes) {

        const root = target._apcUI?.root;

        if (!root) {
            continue;
        }

        const state = getNodeResolutionState(target);

        root.querySelectorAll(
            "[data-resolution]"
        ).forEach(input => {

            input.value = input.dataset.resolution === "megapixels"
                ? state.megapixels
                : state.multiple;
        });

        const toggle = root.querySelector(
            ".apc-resolution-visible-switch"
        );

        if (toggle) {
            toggle.checked = state.visible;
        }
    }
}


function initializeResolutionSettings(node) {

    const root = node._apcUI?.root;

    if (!root) {
        return;
    }

    root.querySelectorAll(
        "[data-resolution]"
    ).forEach(input => {

        const key = input.dataset.resolution;

        input.addEventListener("change", () => {

            const value = Number(input.value);

            if (!Number.isFinite(value)) {

                syncResolutionSettingsUI(node);

                return;
            }

            if (key === "megapixels") {

                updateResolution(node, {
                    megapixels: clampFloat(value, 0.1, 16)
                });

                return;
            }

            updateResolution(node, {
                multiple: clamp(
                    Math.round(value / 4) * 4,
                    8,
                    128
                )
            });
        });

        input.addEventListener("keydown", event => {

            if (event.key === "Enter") {

                event.preventDefault();

                input.blur();
            }
        });
    });

    const toggle = root.querySelector(
        ".apc-resolution-visible-switch"
    );

    if (toggle) {

        toggle.addEventListener("change", () => {

            updateResolution(node, {
                visible: toggle.checked
            });
        });
    }

    syncResolutionSettingsUI(node);
}


function createResolutionCapsule(node) {

    const capsule = document.createElement("button");

    capsule.type = "button";

    capsule.className = "apc-resolution-capsule";

    capsule.title = "选择输出分辨率比例";

    capsule.setAttribute("aria-haspopup", "menu");

    capsule.setAttribute("aria-expanded", "false");

    capsule._apcNode = node;

    capsule.addEventListener("pointerdown", event => {
        event.stopPropagation();

        activeResolutionCapsule = capsule;
    });

    capsule.addEventListener("click", event => {

        event.preventDefault();

        event.stopPropagation();

        activeResolutionCapsule = capsule;

        toggleResolutionPopover();
    });

    return capsule;
}


function updateResolutionCapsule(capsule = null) {

    const targets = capsule
        ? [capsule]
        : Array.from(resolutionCapsules.values());

    for (const target of targets) {

        if (!target) {
            continue;
        }

        const node = target._apcNode;

        if (!node) {
            continue;
        }

        const state = getNodeResolutionState(node);

        if (target.dataset.ratio === state.ratio) {
            continue;
        }

        target.dataset.ratio = state.ratio;

        target.innerHTML = `
            ${ratioIcon(state.ratio)}
            <span class="apc-resolution-capsule-label">${state.ratio}</span>
            <svg
                class="apc-resolution-capsule-chevron"
                viewBox="0 0 24 24"
                aria-hidden="true"
            >
                <path
                    d="m6 9 6 6 6-6"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                />
            </svg>`;
    }
}


function createResolutionPopover() {

    const panel = document.createElement("div");

    panel.className = "apc-resolution-popover";

    panel.hidden = true;

    panel.innerHTML = `
        <div class="apc-resolution-title">输出比例</div>
        <div class="apc-resolution-grid">
            ${RESOLUTION_RATIOS.map(item => `
                <button
                    type="button"
                    class="apc-resolution-option"
                    data-ratio="${item.id}"
                >
                    ${ratioIcon(item.id, 18)}
                    <span>${item.id}</span>
                </button>
            `).join("")}
        </div>
        <div class="apc-resolution-footer">
            <span class="apc-resolution-size"></span>
            <span class="apc-resolution-hint"></span>
        </div>`;

    panel.addEventListener("pointerdown", event => {
        event.stopPropagation();
    });

    panel.querySelectorAll("[data-ratio]").forEach(button => {

        button.addEventListener("click", () => {

            updateResolution(
                activeResolutionCapsule?._apcNode,
                {
                    ratio: button.dataset.ratio
                }
            );

            closeResolutionPopover();
        });
    });

    return panel;
}


function updateResolutionPopover() {

    if (!resolutionPopover) {
        return;
    }

    const node = activeResolutionCapsule?._apcNode;

    if (!node) {
        return;
    }

    const state = getNodeResolutionState(node);

    const size = calculateResolution(state);

    resolutionPopover.querySelectorAll(
        "[data-ratio]"
    ).forEach(button => {

        const active = button.dataset.ratio === state.ratio;

        button.classList.toggle("apc-active", active);

        button.setAttribute(
            "aria-pressed",
            String(active)
        );
    });

    const sizeLabel = resolutionPopover.querySelector(
        ".apc-resolution-size"
    );

    if (sizeLabel) {
        sizeLabel.textContent = `${size.width} × ${size.height}`;
    }

    const hint = resolutionPopover.querySelector(
        ".apc-resolution-hint"
    );

    if (hint) {
        hint.textContent =
            `${state.megapixels} MP · ${state.multiple} 对齐`;
    }
}


function positionResolutionPopover() {

    if (!activeResolutionCapsule || !resolutionPopover) {
        return;
    }

    const rect = activeResolutionCapsule.getBoundingClientRect();

    resolutionPopover.style.visibility = "hidden";

    resolutionPopover.hidden = false;

    const menuRect = resolutionPopover.getBoundingClientRect();

    let left = rect.left + rect.width / 2 - menuRect.width / 2;

    left = clamp(
        left,
        8,
        Math.max(8, window.innerWidth - menuRect.width - 8)
    );

    let top = rect.top - menuRect.height - 8;

    if (top < 8) {
        top = rect.bottom + 8;
    }

    resolutionPopover.style.left = `${left}px`;

    resolutionPopover.style.top = `${top}px`;

    resolutionPopover.style.visibility = "";
}


function openResolutionPopover() {

    if (!resolutionPopover) {

        resolutionPopover = createResolutionPopover();

        document.body.appendChild(resolutionPopover);
    }

    updateResolutionPopover();

    positionResolutionPopover();

    activeResolutionCapsule?.classList.add("apc-active");

    activeResolutionCapsule?.setAttribute("aria-expanded", "true");

    if (!resolutionOutsideHandler) {

        resolutionOutsideHandler = event => {

            const target = event.target;

            if (activeResolutionCapsule?.contains(target)) {
                return;
            }

            if (resolutionPopover?.contains(target)) {
                return;
            }

            closeResolutionPopover();
        };
    }

    document.addEventListener(
        "pointerdown",
        resolutionOutsideHandler,
        true
    );

    if (!resolutionKeyHandler) {

        resolutionKeyHandler = event => {

            if (event.key === "Escape") {
                closeResolutionPopover();
            }
        };
    }

    document.addEventListener(
        "keydown",
        resolutionKeyHandler,
        true
    );

    if (!resolutionPositionHandler) {

        resolutionPositionHandler = () => {

            if (
                resolutionPopover &&
                !resolutionPopover.hidden
            ) {
                positionResolutionPopover();
            }
        };
    }

    window.addEventListener(
        "resize",
        resolutionPositionHandler
    );

    window.addEventListener(
        "scroll",
        resolutionPositionHandler,
        true
    );
}


function closeResolutionPopover() {

    if (resolutionPopover) {
        resolutionPopover.hidden = true;
    }

    activeResolutionCapsule?.classList.remove("apc-active");

    activeResolutionCapsule?.setAttribute("aria-expanded", "false");

    activeResolutionCapsule = null;

    if (resolutionOutsideHandler) {

        document.removeEventListener(
            "pointerdown",
            resolutionOutsideHandler,
            true
        );

        resolutionOutsideHandler = null;
    }

    if (resolutionKeyHandler) {

        document.removeEventListener(
            "keydown",
            resolutionKeyHandler,
            true
        );

        resolutionKeyHandler = null;
    }

    if (resolutionPositionHandler) {

        window.removeEventListener(
            "resize",
            resolutionPositionHandler
        );

        window.removeEventListener(
            "scroll",
            resolutionPositionHandler,
            true
        );

        resolutionPositionHandler = null;
    }
}


function toggleResolutionPopover() {

    if (!resolutionPopover || resolutionPopover.hidden) {
        openResolutionPopover();
    } else {
        closeResolutionPopover();
    }
}


function removeResolutionCapsule(node = null) {

    const targets = node
        ? [node]
        : Array.from(resolutionCapsules.keys());

    for (const target of targets) {

        const capsule = resolutionCapsules.get(target);

        if (!capsule) {
            continue;
        }

        if (activeResolutionCapsule === capsule) {
            closeResolutionPopover();
        }

        capsule.remove();

        resolutionCapsules.delete(target);
    }
}


function ensureResolutionCapsule() {

    for (const node of composerNodes) {

        /*
           是否显示胶囊是每个节点自己的设置。
        */

        if (!getNodeResolutionState(node).visible) {

            removeResolutionCapsule(node);

            continue;
        }

        const ui = node._apcUI;

        if (!ui?.root) {
            continue;
        }

        const toolbar = ui.root.querySelector(
            ".apc-toolbar"
        );

        const runButton = ui.run || ui.root.querySelector(
            ".apc-run"
        );

        if (!toolbar || !runButton) {
            continue;
        }

        let capsule = resolutionCapsules.get(node);

        if (!capsule) {

            capsule = createResolutionCapsule(node);

            resolutionCapsules.set(node, capsule);
        }

        if (
            capsule.parentElement !== toolbar ||
            capsule.nextElementSibling !== runButton
        ) {
            toolbar.insertBefore(capsule, runButton);
        }

        updateResolutionCapsule(capsule);
    }

    for (const [node, capsule] of Array.from(
        resolutionCapsules.entries()
    )) {

        if (!composerNodes.has(node)) {

            if (activeResolutionCapsule === capsule) {
                closeResolutionPopover();
            }

            capsule.remove();

            resolutionCapsules.delete(node);
        }
    }
}


function installResolutionCapsule() {

    try {

        injectCSS();
    } catch (error) {

        console.error(
            "[Comfyui-Binfen-Input] 分辨率选择器样式初始化失败",
            error
        );
    }

    ensureResolutionCapsule();
}


function initializeSwitch(node, name, checkbox) {

    checkbox.checked = Boolean(
        getWidgetValue(node, name, false)
    );

    checkbox.addEventListener("change", () => {

        setWidgetValue(
            node,
            name,
            checkbox.checked
        );
    });
}


/* =========================================================
   PROMPT
========================================================= */

function insertTextAtCursor(textarea, text) {

    const start =
        textarea.selectionStart ?? textarea.value.length;

    const end =
        textarea.selectionEnd ?? start;

    textarea.setRangeText(
        text,
        start,
        end,
        "end"
    );

    textarea.dispatchEvent(
        new Event("input", {
            bubbles: true
        })
    );
}


/*
   清空提示词时保存清空前的快照。

   浏览器原生 Ctrl + Z 在 ComfyUI 里会被画布快捷键拦截，
   所以这里改用自定义的 Ctrl + Z 处理，恢复清空前的提示词。
*/

function clearPromptUndoable(node) {

    const textarea = node._apcUI?.textarea;

    if (!textarea || !textarea.value) {
        return;
    }

    node._apcPromptUndo = {
        value: textarea.value,
        start: textarea.selectionStart,
        end: textarea.selectionEnd
    };

    textarea.value = "";

    textarea.focus();

    textarea.setSelectionRange(0, 0);

    textarea.dispatchEvent(
        new Event("input", {
            bubbles: true
        })
    );
}


function installPromptUndo(node) {

    const textarea = node._apcUI?.textarea;

    if (!textarea) {
        return;
    }

    const handler = event => {

        if (!(event.ctrlKey || event.metaKey)) {
            return;
        }

        if (event.shiftKey || event.altKey) {
            return;
        }

        if (event.key.toLowerCase() !== "z") {
            return;
        }

        const snapshot = node._apcPromptUndo;

        if (!snapshot) {
            return;
        }

        if (document.activeElement !== textarea) {
            return;
        }

        if (textarea.value !== "") {
            return;
        }

        event.preventDefault();

        event.stopPropagation();

        event.stopImmediatePropagation?.();

        textarea.value = snapshot.value;

        node._apcPromptUndo = null;

        const length = textarea.value.length;

        const start = Math.min(
            snapshot.start ?? length,
            length
        );

        const end = Math.min(
            snapshot.end ?? length,
            length
        );

        textarea.setSelectionRange(start, end);

        textarea.dispatchEvent(
            new Event("input", {
                bubbles: true
            })
        );
    };

    node._apcPromptUndoHandler = handler;

    textarea.addEventListener(
        "keydown",
        handler,
        true
    );

    document.addEventListener(
        "keydown",
        handler,
        true
    );

    window.addEventListener(
        "keydown",
        handler,
        true
    );
}


/* =========================================================
   CLEANUP NODE
========================================================= */

function cleanupNode(node) {

    closeSettings(node);

    cleanupDomWidgetResizePassthrough(node);

    restoreDOMHostPointerPassthrough(node);

    if (node._apcPromptUndoHandler) {

        document.removeEventListener(
            "keydown",
            node._apcPromptUndoHandler,
            true
        );

        window.removeEventListener(
            "keydown",
            node._apcPromptUndoHandler,
            true
        );

        node._apcPromptUndoHandler = null;
    }

    removeResolutionCapsule(node);

    composerNodes.delete(node);
}


/* =========================================================
   CREATE UI
========================================================= */

function createUI(node) {

    if (node._apcRoot) {
        return;
    }

    injectCSS();

    hideInternalWidgets(node);

    /*
       明确允许节点缩放。
       如果节点被 Pin，则保留 Pin 的限制。
    */

    if (!node.flags?.pinned) {
        node.resizable = true;
    }

    const root = document.createElement("div");

    root.className = "apc-root";

    root.innerHTML = `

        <div class="apc-composer">

            <div class="apc-assets" hidden></div>

            <div class="apc-input-shell">

                <button
                    type="button"
                    class="apc-clear"
                    title="清空所有素材和提示词"
                >
                    ${icon("clear")}
                </button>

                <textarea
                    class="apc-textarea"
                    placeholder="输入提示词，或 Ctrl + V 粘贴文字、图片、视频和音频..."
                    spellcheck="false"
                ></textarea>

                <div class="apc-toolbar">

                    <button
                        type="button"
                        class="apc-upload"
                        title="上传素材"
                    >
                        ${icon("upload")}
                    </button>

                    <button
                        type="button"
                        class="apc-run"
                        title="运行工作流"
                    >
                        ${icon("play")}
                    </button>

                </div>

            </div>

        </div>

        <div class="apc-meta">

            <button
                type="button"
                class="apc-settings-button"
                title="输出端口设置"
            >
                ${icon("settings")}
            </button>

            <label class="apc-switch">

                <input
                    type="checkbox"
                    class="apc-clear-assets-switch"
                />

                <span class="apc-switch-track"></span>

                <span>运行后清空上传素材</span>

            </label>

            <label class="apc-switch">

                <input
                    type="checkbox"
                    class="apc-clear-prompt-switch"
                />

                <span class="apc-switch-track"></span>

                <span>运行后清空提示词</span>

            </label>

            <div class="apc-settings" hidden>

                <div class="apc-settings-title">
                    输出端口设置
                </div>

                <div class="apc-setting-row">

                    <label>图片输出数量</label>

                    <input
                        type="number"
                        min="0"
                        max="${MAX_IMAGES}"
                        step="1"
                        data-count="image"
                    />

                </div>

                <div class="apc-setting-row">

                    <label>视频输出数量</label>

                    <input
                        type="number"
                        min="0"
                        max="${MAX_VIDEOS}"
                        step="1"
                        data-count="video"
                    />

                </div>

                <div class="apc-setting-row">

                    <label>音频输出数量</label>

                    <input
                        type="number"
                        min="0"
                        max="${MAX_AUDIOS}"
                        step="1"
                        data-count="audio"
                    />

                </div>

                <div class="apc-setting-row">

                    <label>视频输出类型</label>

                    <button
                        type="button"
                        class="apc-select-trigger"
                        data-output-type-trigger="video"
                        aria-haspopup="menu"
                        aria-expanded="false"
                    >
                        <span class="apc-select-value"></span>
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path
                                d="m6 9 6 6 6-6"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="1.8"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            />
                        </svg>
                    </button>

                </div>

                <div class="apc-settings-section">
                    分辨率选择器
                </div>

                <div class="apc-setting-row">

                    <label>显示比例选择器</label>

                    <label class="apc-switch">

                        <input
                            type="checkbox"
                            class="apc-resolution-visible-switch"
                        />

                        <span class="apc-switch-track"></span>

                    </label>

                </div>

                <div class="apc-setting-row">

                    <label>百万像素</label>

                    <input
                        type="number"
                        min="0.1"
                        max="16"
                        step="0.1"
                        data-resolution="megapixels"
                    />

                </div>

                <div class="apc-setting-row">

                    <label>缩放倍数</label>

                    <input
                        type="number"
                        min="8"
                        max="128"
                        step="4"
                        data-resolution="multiple"
                    />

                </div>

                <div class="apc-settings-note">
                    比例选择器位于画布右下角运行按钮左侧。
                    宽高按官方公式计算，并输出到 WIDTH / HEIGHT 端口。
                    数量代表对应类型的最大上传数量，
                    不要求上传素材填满所有端口。
                    未上传的端口在本次运行中按未连接处理。
                </div>

            </div>

        </div>

        <div class="apc-status"></div>

        <input
            class="apc-file-input"
            type="file"
            multiple
            accept="image/*,video/*,audio/*"
            style="display:none"
        />

    `;

    node._apcRoot = root;

    node._apcState = {

        assets: parseAssets(node),

        counts: readCounts(node),

        videoOutputType: readVideoOutputType(node)

    };

    const ui = {

        root,

        composer: root.querySelector(".apc-composer"),

        assets: root.querySelector(".apc-assets"),

        inputShell: root.querySelector(".apc-input-shell"),

        textarea: root.querySelector(".apc-textarea"),

        upload: root.querySelector(".apc-upload"),

        run: root.querySelector(".apc-run"),

        clear: root.querySelector(".apc-clear"),

        fileInput: root.querySelector(".apc-file-input"),

        settingsButton: root.querySelector(
            ".apc-settings-button"
        ),

        settings: root.querySelector(".apc-settings"),

        clearAssetsSwitch: root.querySelector(
            ".apc-clear-assets-switch"
        ),

        clearPromptSwitch: root.querySelector(
            ".apc-clear-prompt-switch"
        ),

        status: root.querySelector(".apc-status"),

        outsidePointerHandler: null,

        queueRequestPending: false

    };

    node._apcUI = ui;

    root.style.width = "100%";

    root.style.minWidth = "0";

    root.style.maxWidth = "100%";

    /*
       新建节点用上一次的设置作为初始值。
       工作流加载时这里拿到的还是默认值，
       随后 onConfigure 会用保存的 widget 值覆盖。
    */

    const resolutionSeed = readResolutionSeed();

    if (resolutionSeed) {

        applyResolutionToNode(node, resolutionSeed);
    }

    initializeResolutionSettings(node);

    installResolutionCapsule();

    if (!node.size) {
        node.size = [640, 400];
    }

    if (node.size[0] < 620) {
        node.size[0] = 620;
    }


    /* ---------------------------------------------
       DOM Widget
    --------------------------------------------- */

    if (typeof node.addDOMWidget === "function") {

        node._apcDOMWidget = node.addDOMWidget(
            "BinfenInputUI",
            "custom",
            root,
            {
                serialize: false,

                hideOnZoom: false,

                margin: 0,

                getValue: () => null,

                setValue: () => {},

                getMinHeight: () => {
                    return calculateWidgetMinHeight(node);
                },

                /*
                   不设置 getMaxHeight。
                   允许节点自由增高。
                */

                afterResize: () => {

                    refreshNodeLayout(node);

                    applyDOMHostPointerPassthrough(node);
                }
            }
        );

        /*
           安装真正的 LiteGraph 原生缩放命中修复。
           这不是仅靠 CSS 留白，而是修复 Widget 与 Resize 的命中顺序。
        */

        installDomWidgetResizePassthrough(node);

        applyDOMHostPointerPassthrough(node);

    } else {

        console.error(
            "[Comfyui-Binfen-Input] addDOMWidget 不可用"
        );
    }


    /*
       addDOMWidget 会在节点上注册自己的 onRemoved。
       这里链式包装，确保设置面板监听器和缩放状态被清理。
    */

    const previousOnRemoved = node.onRemoved;

    node.onRemoved = function() {

        cleanupNode(node);

        return previousOnRemoved?.apply(
            this,
            arguments
        );
    };


    /* ---------------------------------------------
       Restore prompt
    --------------------------------------------- */

    ui.textarea.value = String(
        getWidgetValue(node, "prompt", "")
    );


    /* ---------------------------------------------
       Settings inputs
    --------------------------------------------- */

    const settingInputs = root.querySelectorAll(
        "[data-count]"
    );

    settingInputs.forEach(input => {

        const type = input.dataset.count;

        input.value = {
            image: node._apcState.counts.images,
            video: node._apcState.counts.videos,
            audio: node._apcState.counts.audios
        }[type];

        input.addEventListener("change", () => {

            updateSetting(
                node,
                type,
                input
            );
        });

        input.addEventListener("keydown", event => {

            if (event.key === "Enter") {

                event.preventDefault();

                input.blur();
            }
        });
    });


    const videoOutputTypeTrigger = root.querySelector(
        "[data-output-type-trigger='video']"
    );

    if (videoOutputTypeTrigger) {

        syncVideoTypeTrigger(node);

        videoOutputTypeTrigger.addEventListener(
            "click",
            event => {

                event.preventDefault();

                event.stopPropagation();

                if (
                    videoTypePopover &&
                    !videoTypePopover.hidden &&
                    videoTypeAnchor === videoOutputTypeTrigger
                ) {

                    closeVideoTypePopover();

                    return;
                }

                openVideoTypePopover(
                    node,
                    videoOutputTypeTrigger
                );
            }
        );
    }


    /* ---------------------------------------------
       Switches
    --------------------------------------------- */

    initializeSwitch(
        node,
        "clear_assets_after_run",
        ui.clearAssetsSwitch
    );

    initializeSwitch(
        node,
        "clear_prompt_after_run",
        ui.clearPromptSwitch
    );


    /* ---------------------------------------------
       Prompt input
    --------------------------------------------- */

    ui.textarea.addEventListener("input", () => {

        if (ui.textarea.value !== "") {
            node._apcPromptUndo = null;
        }

        savePrompt(node);
    });

    installPromptUndo(node);


    /* ---------------------------------------------
       Clipboard paste
    --------------------------------------------- */

    ui.textarea.addEventListener("paste", event => {

        const clipboard = event.clipboardData;

        if (!clipboard) {
            return;
        }

        const files = [];

        for (const item of Array.from(
            clipboard.items || []
        )) {

            if (item.kind !== "file") {
                continue;
            }

            const file = item.getAsFile();

            if (file && classifyFile(file)) {
                files.push(file);
            }
        }

        if (!files.length) {
            return;
        }

        event.preventDefault();

        event.stopPropagation();

        const text = clipboard.getData("text/plain");

        if (text) {

            insertTextAtCursor(
                ui.textarea,
                text
            );
        }

        uploadFiles(
            node,
            files
        );
    });


    /* ---------------------------------------------
       Upload button
    --------------------------------------------- */

    ui.upload.addEventListener("click", event => {

        event.preventDefault();

        event.stopPropagation();

        ui.fileInput.click();
    });

    ui.fileInput.addEventListener("change", async () => {

        const files = Array.from(
            ui.fileInput.files || []
        );

        await uploadFiles(
            node,
            files
        );

        ui.fileInput.value = "";
    });


    /* ---------------------------------------------
       Drag and drop
    --------------------------------------------- */

    const dropZone = ui.inputShell;

    dropZone.addEventListener("dragenter", event => {

        if (!event.dataTransfer?.types?.includes("Files")) {
            return;
        }

        event.preventDefault();

        event.stopPropagation();

        ui.composer.classList.add("apc-drop");
    });

    dropZone.addEventListener("dragover", event => {

        if (!event.dataTransfer?.types?.includes("Files")) {
            return;
        }

        event.preventDefault();

        event.stopPropagation();

        event.dataTransfer.dropEffect = "copy";

        ui.composer.classList.add("apc-drop");
    });

    dropZone.addEventListener("dragleave", event => {

        event.stopPropagation();

        if (!dropZone.contains(event.relatedTarget)) {

            ui.composer.classList.remove("apc-drop");
        }
    });

    dropZone.addEventListener("drop", event => {

        event.preventDefault();

        event.stopPropagation();

        ui.composer.classList.remove("apc-drop");

        const files = Array.from(
            event.dataTransfer?.files || []
        );

        uploadFiles(
            node,
            files
        );
    });


    /* ---------------------------------------------
       Clear all
    --------------------------------------------- */

    ui.clear.addEventListener("click", event => {

        event.preventDefault();

        event.stopPropagation();

        clearAll(node);
    });


    /* ---------------------------------------------
       Settings
    --------------------------------------------- */

    ui.settingsButton.addEventListener("click", event => {

        event.preventDefault();

        event.stopPropagation();

        toggleSettings(node);
    });


    /* ---------------------------------------------
       Run
    --------------------------------------------- */

    ui.run.addEventListener("click", async event => {

        event.preventDefault();

        event.stopPropagation();

        await runWorkflow(node);
    });


    /* ---------------------------------------------
       Output sockets
    --------------------------------------------- */

    syncOutputSockets(
        node,
        node._apcState.counts
    );

    composerNodes.add(node);

    ensureResolutionCapsule();

    saveAssets(node);

    renderAssets(node);
}


/* =========================================================
   RESTORE WORKFLOW
========================================================= */

function restoreUI(node) {

    if (!node._apcUI || !node._apcState) {
        return;
    }

    const state = node._apcState;

    state.assets = parseAssets(node);

    state.counts = readCounts(node);

    state.videoOutputType = readVideoOutputType(node);

    syncResolutionSettingsUI(node);

    trimAssetsToLimits(node);

    if (!node.flags?.pinned) {
        node.resizable = true;
    }

    node._apcUI.textarea.value = String(
        getWidgetValue(node, "prompt", "")
    );

    const inputs = node._apcUI.settings.querySelectorAll(
        "[data-count]"
    );

    inputs.forEach(input => {

        input.value = {
            image: state.counts.images,
            video: state.counts.videos,
            audio: state.counts.audios
        }[input.dataset.count];
    });

    syncVideoTypeTrigger(node);

    applyOutputLayout(
        node,
        state.counts
    );

    saveAssets(node);

    renderAssets(node);

    applyDOMHostPointerPassthrough(node);

    installDomWidgetResizePassthrough(node);
}


/* =========================================================
   IMMEDIATE CLEAR AFTER QUEUE ACCEPTANCE

   重要：

   queuePrompt 成功返回 = 工作流已经被服务器接受入队。

   不等待：
   - execution_start
   - executed
   - execution_success
   - 下游节点执行
   - 整个工作流完成

   队列接受之后立即按开关清空输入内容。

   运行按钮只在提交请求期间短暂禁用。
   入队成功后立即恢复，可以马上提交下一条提示词。

   队列提交失败时保留素材和提示词。
========================================================= */

async function runWorkflow(node) {

    const ui = node._apcUI;

    const state = node._apcState;

    if (!ui || !state) {
        return;
    }

    /*
       只阻止同一个节点的重复提交请求。
       不等待正在队列中或执行中的工作流。
    */

    if (ui.queueRequestPending) {
        return;
    }

    ui.queueRequestPending = true;

    ui.run.disabled = true;

    /*
       在提交前快照本次任务的清理选项。
       即使后面用户修改开关，也不影响本次任务。
    */

    const clearAssets =
        ui.clearAssetsSwitch.checked;

    const clearPrompt =
        ui.clearPromptSwitch.checked;

    setStatus(
        node,
        "正在提交工作流到队列...",
        ""
    );

    try {

        /*
           queuePrompt 会把当前工作流提交给 ComfyUI。

           注意：此处不能提前清空。
           必须等当前任务成功被服务器接受后再清理，
           防止工作流提交失败导致输入内容丢失。
        */

        const queued = await app.queuePrompt(
            0,
            1
        );

        if (queued === false) {

            setStatus(
                node,
                "工作流提交失败，素材和提示词已保留",
                "error"
            );

            return;
        }

        /*
           到这里，当前任务已经成功提交到队列。

           立即清空素材。
           不需要等待工作流执行。
        */

        const clearedItems = [];

        if (clearAssets) {

            state.assets = [];

            saveAssets(node);

            renderAssets(node);

            clearedItems.push("上传素材");
        }

        /*
           立即清空提示词。
        */

        if (clearPrompt) {

            clearPromptUndoable(node);

            savePrompt(node);

            clearedItems.push("提示词");
        }

        /*
           明确反馈：任务已经进入队列，
           当前输入框可以准备下一条任务。
        */

        if (clearedItems.length > 0) {

            setStatus(
                node,
                `已成功加入队列，已清空${clearedItems.join("和")}，可以输入下一条任务`,
                "success"
            );

        } else {

            setStatus(
                node,
                "已成功加入队列，输入内容已保留",
                "success"
            );
        }

    } catch (error) {

        console.error(
            "[Comfyui-Binfen-Input] Queue failed",
            error
        );

        /*
           提交失败时绝对不能清空。
        */

        setStatus(
            node,
            "提交失败：" + (error?.message || String(error)),
            "error"
        );

    } finally {

        /*
           关键：

           不再等待整个工作流执行完成。
           只要队列提交请求结束，就恢复运行按钮。

           用户可以立即修改提示词并提交下一条任务。
        */

        ui.queueRequestPending = false;

        ui.run.disabled = false;
    }
}


/* =========================================================
   EXTENSION
========================================================= */

app.registerExtension({

    name: "Comfyui-Binfen-Input",

    setup() {

        installResolutionCapsule();

        /*
           安装队列提交时的空端口裁剪。

           作用：
           已连线但本次没有素材的输出端口，
           在提交队列时不会写进 API Prompt，
           下游节点会把它视为“未连接”。

           这修复了“连满 N 个端口但上传素材少于 N 个”
           时下游文本编码节点被整体跳过的问题。

           只影响提交队列，不影响画布连线和保存的工作流。
        */

        installQueuePruning();

        if (!queuePruningInstalled) {
            setTimeout(installQueuePruning, 1000);
        }
    },


    beforeRegisterNodeDef(nodeType, nodeData, appInstance) {

        if (nodeData.name !== NODE_NAME) {
            return;
        }


        /* ---------------------------------------------
           Node created
        --------------------------------------------- */

        const originalOnNodeCreated =
            nodeType.prototype.onNodeCreated;

        nodeType.prototype.onNodeCreated = function() {

            const result = originalOnNodeCreated?.apply(
                this,
                arguments
            );

            createUI(this);

            return result;
        };


        /* ---------------------------------------------
           Configure / restore
        --------------------------------------------- */

        const originalOnConfigure =
            nodeType.prototype.onConfigure;

        nodeType.prototype.onConfigure = function(info) {

            const result = originalOnConfigure?.apply(
                this,
                arguments
            );

            /*
               必须在 configure 阶段同步恢复端口布局。

               此时 widget 值已经还原，但浏览器还没开始绘制；
               如果等到下面的 setTimeout 再恢复，中间会短暂保持
               默认端口数量，已保存的连线会按错误的槽位被解读，
               随后再按名字重映射就会整体错位。

               这里只按索引恢复端口，不移动连线。
            */

            if (this._apcState && this._apcUI) {

                /*
                   旧工作流没有 video_output_type 这个 widget，
                   默认会变成 IMAGE。为了不破坏旧工作流已有的
                   VIDEO 连线，优先沿用序列化端口里的视频类型。
                */

                const serializedVideoType =
                    readSerializedVideoOutputType(info?.outputs);

                if (serializedVideoType) {

                    const videoTypeWidget = getWidget(
                        this,
                        "video_output_type"
                    );

                    if (videoTypeWidget) {
                        videoTypeWidget.value = serializedVideoType;
                    }
                }

                this._apcState.counts = readCounts(this);

                this._apcState.videoOutputType =
                    readVideoOutputType(this);

                this._apcState.assets = parseAssets(this);

                trimAssetsToLimits(this);

                applyOutputLayout(
                    this,
                    this._apcState.counts
                );

                /*
                   widget 值已由 configure 还原，
                   这里只刷新界面，不能反向覆盖保存的值。
                */

                syncResolutionSettingsUI(this);

                ensureResolutionCapsule();
            }

            setTimeout(() => {

                if (!this._apcState || !this._apcUI) {
                    return;
                }

                restoreUI(this);

            }, 100);

            return result;
        };


        /* ---------------------------------------------
           Node removed fallback
        --------------------------------------------- */

        const originalOnRemoved =
            nodeType.prototype.onRemoved;

        nodeType.prototype.onRemoved = function() {

            cleanupNode(this);

            return originalOnRemoved?.apply(
                this,
                arguments
            );
        };
    }

});


/*
   独立启动兜底：即使 ComfyUI 没有调用扩展的 setup()，
   也尝试挂载分辨率胶囊。
*/

function bootstrapResolutionCapsule() {

    try {

        installResolutionCapsule();
    } catch (error) {

        console.error(
            "[Comfyui-Binfen-Input] 分辨率选择器初始化失败",
            error
        );
    }
}


if (document.readyState === "loading") {

    document.addEventListener(
        "DOMContentLoaded",
        bootstrapResolutionCapsule,
        { once: true }
    );
} else {

    bootstrapResolutionCapsule();
}
