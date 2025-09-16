use image::{ColorType, GenericImageView};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct Image {
    pub(crate) horizontal_length: u32,
    pub(crate) vertical_length: u32,
    pub(crate) channels: u8,
    pub(crate) bits_per_sample: u16,
    pub(crate) color_type: String,
    pub(crate) pixels: Pixels, // internal only
}

/// Internal pixel storage (not exposed directly to JS)
pub enum Pixels {
    U8(Vec<u8>),
    U16(Vec<u16>),
}

#[wasm_bindgen]
impl Image {
    /// Width of the image
    #[wasm_bindgen(getter)]
    pub fn horizontal_length(&self) -> u32 {
        self.horizontal_length
    }

    /// Height of the image
    #[wasm_bindgen(getter)]
    pub fn vertical_length(&self) -> u32 {
        self.vertical_length
    }

    /// Number of channels (1 = grayscale, 3 = RGB, etc.)
    #[wasm_bindgen(getter)]
    pub fn channels(&self) -> u8 {
        self.channels
    }

    /// Bits per sample (8 or 16)
    #[wasm_bindgen(getter)]
    pub fn bits_per_sample(&self) -> u16 {
        self.bits_per_sample
    }

    /// Color type as string (e.g. "Rgb8", "Luma16")
    #[wasm_bindgen(getter)]
    pub fn color_type(&self) -> String {
        self.color_type.clone()
    }

    /// Get pixels as `Uint8Array` in JS (only valid if 8-bit image)
    pub fn pixels_u8(&self) -> Option<Box<[u8]>> {
        match &self.pixels {
            Pixels::U8(data) => Some(data.clone().into_boxed_slice()),
            _ => None,
        }
    }

    /// Get pixels as `Uint16Array` in JS (only valid if 16-bit image)
    pub fn pixels_u16(&self) -> Option<Box<[u16]>> {
        match &self.pixels {
            Pixels::U16(data) => Some(data.clone().into_boxed_slice()),
            _ => None,
        }
    }
}

impl Image {
    pub(crate) fn new_u8(
        horizontal_length: u32,
        vertical_length: u32,
        channels: u8,
        bits_per_sample: u16,
        color_type: String,
        pixels: Vec<u8>,
    ) -> Image {
        Image {
            horizontal_length,
            vertical_length,
            channels,
            bits_per_sample,
            color_type,
            pixels: Pixels::U8(pixels),
        }
    }

    pub(crate) fn new_u16(
        horizontal_length: u32,
        vertical_length: u32,
        channels: u8,
        bits_per_sample: u16,
        color_type: String,
        pixels: Vec<u16>,
    ) -> Image {
        Image {
            horizontal_length,
            vertical_length,
            channels,
            bits_per_sample,
            color_type,
            pixels: Pixels::U16(pixels),
        }
    }
}

#[wasm_bindgen]
pub fn load_image(bytes: &[u8]) -> Result<Image, JsValue> {
    let img = image::load_from_memory(bytes)
        .map_err(|e| JsValue::from_str(&format!("Failed to load image: {}", e)))?;

    let (horizontal_length, vertical_length) = img.dimensions();
    let color = img.color();

    match color {
        ColorType::Rgb8 => {
            let rgb = img.to_rgb8();
            Ok(Image::new_u8(
                horizontal_length,
                vertical_length,
                3,
                8,
                "Rgb8".to_string(),
                rgb.into_raw(),
            ))
        }
        ColorType::L8 => {
            let gray = img.to_luma8();
            Ok(Image::new_u8(
                horizontal_length,
                vertical_length,
                1,
                8,
                "Luma8".to_string(),
                gray.into_raw(),
            ))
        }
        ColorType::L16 => {
            let gray16 = img.to_luma16();
            Ok(Image::new_u16(
                horizontal_length,
                vertical_length,
                1,
                16,
                "Luma16".to_string(),
                gray16.into_raw(),
            ))
        }
        other => Err(JsValue::from_str(&format!(
            "Unsupported color type: {:?}",
            other
        ))),
    }
}
