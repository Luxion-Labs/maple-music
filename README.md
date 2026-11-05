# Maple

> Lightweight, high-performance terminal and native audio player written in Rust.

```bash
git clone https://github.com/Luxion-Labs/maple-music.git && cd maple-music && cargo build --release
```

![Maple Banner](assets/images/banner.svg)

[![Live Demo](https://img.shields.io/badge/Demo-Live_Preview-00F2FE?style=flat-square)](https://maple.luxionlabs.com) [![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE) [![SLA](https://img.shields.io/badge/Response_SLA-24_Hours-4FACFE?style=flat-square)](CONTRIBUTING.md)

## Overview
Lightweight, high-performance terminal and native audio player written in Rust. Built by Luxion Labs as part of our high-velocity open-source engineering ecosystem.

## Features
- Zero-latency local audio playback with low memory footprint (<25 MB RSS).
- Modern terminal user interface with interactive playlist navigation.
- Multi-format audio decoding (MP3, FLAC, WAV, OGG, AAC).
- Customizable keybindings and responsive layout engine.

## Architecture and Stack
Rust, Rodio audio playback, Ratatui terminal UI, and Symphonia media decoders.

## Quickstart
```bash
git clone https://github.com/Luxion-Labs/maple-music.git && cd maple-music && cargo build --release
```

## Maintainer Response SLA
Luxion Labs enforces a strict 24-hour response SLA on all community issues, feature proposals, and pull requests. See [CONTRIBUTING.md](CONTRIBUTING.md) for full development guidelines.

## License
Distributed under the MIT License. See [LICENSE](LICENSE) for more details.
