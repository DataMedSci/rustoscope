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

## Authors

Contributors:

1. [Jakub Stępień](https://github.com/jkbstepien)
2. [Kacper Cienkosz](https://github.com/kacienk)
3. [Adam Mytnik](https://github.com/AdamMytnik)

This project was created as a part of Large Scale Computing course at AGH University of Science and Technology in Kraków, Poland under the supervision of [PhD. Leszek Grzanka](https://github.com/grzanka).
