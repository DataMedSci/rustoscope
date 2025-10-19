<div align="center">
  <img src="./logo.png" width="200" alt="Project Logo">
</div>

# Rustoscope

WebAssembly image analysis, using Rust.

## 🌐 Live Demo

You can view the latest deployed version here:  
🔗 [https://datamedsci.github.io/rustoscope/](https://datamedsci.github.io/rustoscope/)

## 📦 Getting Started

### ✅ Prerequisites

Make sure the following tools are installed:

- [`pnpm`](https://pnpm.io/)
- [`wasm-pack`](https://rustwasm.github.io/wasm-pack/)

> 💡 Additionally, ensure Rust and `cargo` are installed. If not, install them with:  
> `curl https://sh.rustup.rs -sSf | sh`
>
> **Note:** We recommend instatllation via [rustup](https://rustup.rs/) instead of using your system package manager, as we encountered issues with the `wasm-pack` package in some distributions.
> We tested the project using `1.86.0` version of Rust, thus we recommend using this version or later.

## 📖 Project Structure

The project is structured as follows:

```
rustoscope/
├── api/                # Rust backend for WebAssembly
├── client/             # Frontend application
├── .github/            # GitHub Actions workflows
├── .gitignore          # Git ignore file
└── README.md           # This file
```

### 🛠️ Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/your-username/rustoscope.git
   ```

2. Install frontend dependencies (inside the `client/` directory):

   ```bash
    pnpm install
   ```

### 🚀 Running the Project

1. Build WebAssembly from Rust source code (inside the `api/` directory):

```bash
  wasm-pack build --target web --out-dir ../client/src/wasm
```

2. Start the development server (inside the `client/` directory):

```bash
  pnpm run dev
```

### 🚢 Deployment (GitHub Pages)

To deploy the application (inside the `client/` directory):

```bash
pnpm run deploy
```

## ✨ Current functionalities

- Image upload via drag-and-drop or file picker (PNG, JPG/JPEG, TIFF)
- Side-by-side Original and Converted previews with a stable aspect ratio
- Interactive preview rendered with JSROOT (color map, grid, auto z-range)
- Axes shown in px or mm with a configurable mm/px scale
- Selectable, chainable processing algorithms executed in WebAssembly (Rust):
  - Hot pixel removal (percentile clipping)
  - Median blur (configurable kernel radius)
  - Gaussian blur (sigma)
  - Linear transform (a·x + b)

## 🧑‍💻 Contributions by [Marek Swakoń](https://github.com/Marek55S)

This fork diverges from the original repository (https://github.com/jkbstepien/rustoscope) by focusing on raw pixel processing and scientific visualization. My main additions and changes:

- Drag-and-drop image upload (in addition to the file picker)
- JSROOT-based image preview rendering from raw pixels (not just PNG blobs)
  - Stable aspect ratio container for previews
  - Axes in px or mm and configurable mm/px scale
- Direct handling of 8-bit and 16-bit grayscale data via the Rust WASM API (load and render intensity maps; no PNG conversion required)
- Added/extended algorithms and parameters exposed in the UI:
  - Hot pixel removal (percentile clipping)
  - Linear transform (a·x + b)
  - Median and Gaussian blur bindings operating on the in-memory image
- Error and status messaging tailored to the new processing flow

Note: The upstream repository already included a side-by-side preview layout and a progress indicator for algorithm execution; those were retained and adapted to the new pixel-processing pipeline here.

## Authors

Contributors:

1. [Jakub Stępień](https://github.com/jkbstepien)
2. [Kacper Cienkosz](https://github.com/kacienk)
3. [Adam Mytnik](https://github.com/AdamMytnik)
4. [Marek Swakoń](https://github.com/Marek55S)

This project was created as a part of Large Scale Computing course at AGH University of Science and Technology in Kraków, Poland and continued during internship at Institute of Nuclear Physics, Polish Academy of Sciences (IFJ PAN), under the supervision of [PhD. Leszek Grzanka](https://github.com/grzanka).
